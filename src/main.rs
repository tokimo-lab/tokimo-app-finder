//! Finder app — file manager with favorites.
//!
//! CLI / Server 双模二进制。

const MANIFEST: &str = include_str!("../tokimo-app.toml");

mod app_server;
mod assets;
mod bus_clients;
mod cli;
mod ctx;
mod db;
mod error;
mod handlers;
mod services;

use std::sync::{Arc, OnceLock};

use clap::{Parser, Subcommand};
use tokimo_bus_cli::TokimoAuthArgs;
use tokimo_bus_client::{BusClient, ClientConfig};
use tracing::{error, info};

#[derive(Parser, Debug)]
#[command(
    name = "tokimo-app-finder",
    about = "Finder — Tokimo 文件管理器 CLI",
    long_about = "Finder CLI — 管理文件收藏夹。\n\n直接连接数据库（通过 DATABASE_URL），不需要主 server 运行。",
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
    /// 取消收藏
    Remove {
        #[arg(long)]
        vfs_id: uuid::Uuid,
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
                    tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                        "info,tokimo_bus_client=info,tokimo_app_finder=debug".into()
                    }),
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
    info!("finder: db connected");

    let client_slot: Arc<OnceLock<Arc<BusClient>>> = Arc::new(OnceLock::new());
    let storage = services::storage::create_storage_from_bus(Arc::clone(&client_slot), "finder");
    let context = Arc::new(ctx::AppCtx {
        db,
        client: Arc::clone(&client_slot),
        storage,
    });

    let app_socket = app_server::spawn("finder", Arc::clone(&context))
        .await
        .map_err(|e| anyhow::anyhow!("app_server spawn: {e}"))?;

    let client = BusClient::builder(cfg)
        .service("finder", env!("CARGO_PKG_VERSION"))
        .data_plane(app_socket)
        .build()
        .await
        .map_err(|e| anyhow::anyhow!("bus build: {e}"))?;
    client_slot
        .set(Arc::clone(&client))
        .map_err(|_| anyhow::anyhow!("client_slot already set"))?;

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
