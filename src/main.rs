//! Finder app — file manager with favorites.
//!
//! 启动流程：
//! 1. 连接 broker（supervisor 健康检查）
//! 2. 起 axum router 监听 UDS
//! 3. 把 sock 报给 broker（data_plane_socket）
//! 4. server 端 `/api/apps/finder/<rest>` 反代到本 sock 的 `/<rest>`

const MANIFEST: &str = include_str!("../tokimo-app.toml");

mod app_server;
mod assets;
mod cli;
mod db;
pub mod handlers;

use std::sync::Arc;

use axum::{Json, http::StatusCode, response::IntoResponse};
use clap::{Parser, Subcommand};
use tokimo_bus_cli::TokimoAuthArgs;
use tokimo_bus_client::{BusClient, ClientConfig};
use tracing::{error, info};

#[derive(Debug)]
pub enum AppError {
    Database(sea_orm::DbErr),
    BadRequest(String),
    Internal(String),
}

impl AppError {
    pub fn bad_request(msg: impl Into<String>) -> Self {
        Self::BadRequest(msg.into())
    }
    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match &self {
            AppError::Database(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("db: {e}")),
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, m.clone()),
            AppError::Internal(m) => (StatusCode::INTERNAL_SERVER_ERROR, m.clone()),
        };
        let body = serde_json::json!({ "error": message });
        (status, Json(body)).into_response()
    }
}

impl From<sea_orm::DbErr> for AppError {
    fn from(e: sea_orm::DbErr) -> Self {
        Self::Database(e)
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::Database(e) => write!(f, "db: {e}"),
            AppError::BadRequest(m) | AppError::Internal(m) => write!(f, "{m}"),
        }
    }
}

impl std::error::Error for AppError {}

#[derive(Parser, Debug)]
#[command(
    name = "tokimo-app-finder",
    about = "Finder — Tokimo 文件管理器 CLI",
    long_about = "Finder CLI — 管理文件收藏夹。\n\nCLI 直接读写数据库，不依赖主 server 进程运行。",
    term_width = 100
)]
struct Cli {
    #[command(flatten)]
    auth: TokimoAuthArgs,
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Subcommand, Debug)]
enum Command {
    /// 管理文件收藏夹
    #[command(
        subcommand_required = false,
        arg_required_else_help = false,
        long_about = "管理文件收藏夹",
        term_width = 100
    )]
    Favorites {
        #[command(subcommand)]
        cmd: Option<FavoritesCmd>,
    },
}

#[derive(Subcommand, Debug)]
pub(crate) enum FavoritesCmd {
    /// 列出收藏
    List,
    /// 添加收藏
    Add {
        /// VFS ID (UUID)
        #[arg(long)]
        vfs_id: uuid::Uuid,
        /// 文件路径
        #[arg(long)]
        path: String,
        /// 文件名
        #[arg(long)]
        name: String,
        /// 是否目录
        #[arg(long, default_value = "false")]
        is_directory: bool,
    },
    /// 取消收藏
    Remove {
        /// VFS ID (UUID)
        #[arg(long)]
        vfs_id: uuid::Uuid,
        /// 文件路径
        #[arg(long)]
        path: String,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let Cli { auth, command } = Cli::parse();

    match command {
        None if std::env::var_os("TOKIMO_BUS_SOCKET").is_some() => {
            tracing_subscriber::fmt()
                .with_env_filter(
                    tracing_subscriber::EnvFilter::try_from_default_env()
                        .unwrap_or_else(|_| "info,tokimo_bus_client=info,tokimo_app_finder=debug".into()),
                )
                .init();
            if let Err(error) = run_server().await {
                error!(%error, "finder: fatal");
                std::process::exit(1);
            }
        }
        None => {
            use clap::CommandFactory;
            let mut cmd = Cli::command();
            tokimo_bus_cli::print_help_unified(&mut cmd);
            std::process::exit(0);
        }
        Some(cmd) => {
            let result = match cmd {
                Command::Favorites { cmd: None } => {
                    use clap::CommandFactory;
                    let mut root = Cli::command();
                    root.build();
                    if let Some(fav_cmd) = root.find_subcommand_mut("favorites") {
                        tokimo_bus_cli::print_help_unified(fav_cmd);
                    }
                    std::process::exit(0);
                }
                Command::Favorites { cmd: Some(c) } => cli::run_favorites(auth, c).await,
            };
            if let Err(error) = result {
                eprintln!("Error: {error:#}");
                std::process::exit(1);
            }
        }
    }

    Ok(())
}

async fn run_server() -> anyhow::Result<()> {
    let cfg = ClientConfig::from_env().map_err(|e| anyhow::anyhow!("ClientConfig: {e}"))?;
    info!(endpoint = ?cfg.endpoint, "finder: connecting to broker");

    let db = db::init_pool().await?;
    info!("finder: db connected (schema managed by host)");

    let ctx = Arc::new(handlers::AppCtx { db });

    let app_socket = app_server::spawn("finder", Arc::clone(&ctx))
        .await
        .map_err(|e| anyhow::anyhow!("app_server spawn: {e}"))?;

    let client = BusClient::builder(cfg)
        .service("finder", env!("CARGO_PKG_VERSION"))
        .data_plane(app_socket)
        .build()
        .await
        .map_err(|e| anyhow::anyhow!("bus build: {e}"))?;

    info!("finder: registered with broker");

    let shutdown = {
        let client = Arc::clone(&client);
        tokio::spawn(async move { client.run_until_shutdown().await })
    };

    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            info!("finder: SIGINT received");
            client.shutdown();
        }
        _ = shutdown => info!("finder: broker sent Shutdown"),
    }

    Ok(())
}
