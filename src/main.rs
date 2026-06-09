//! Finder app — file manager with favorites.
//!
//! CLI / Server 双模二进制。

// This binary is a CLI whose primary output channel is stdout/stderr, so the
// `print_*` restriction lints (warn at workspace level) do not apply here.
#![allow(clippy::print_stdout, clippy::print_stderr)]

const MANIFEST: &str = include_str!("../tokimo-app.toml");

mod app_server;
mod assets;
mod bus_clients;
mod cli;
mod db;
mod error;
mod handlers;
mod router;
mod services;
mod state;

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

    /// List all storage buckets (id, name, type) available to the user.
    ///
    /// Use a bucket's name or id with the other commands as <bucket>.
    Buckets,

    /// List a directory inside a storage bucket.
    ///
    /// Columns: T (d=dir, -=file), SIZE (bytes), MODIFIED, NAME.
    Ls {
        /// Storage bucket name or id (run `buckets` to list).
        bucket: String,
        /// Directory path inside the bucket (default: `/`).
        #[arg(default_value = "/")]
        path: String,
    },

    /// Show metadata (size, modified time, mode) for one file or directory.
    Stat {
        /// Storage bucket name or id.
        bucket: String,
        /// Path inside the bucket.
        path: String,
    },

    /// Print a text file's contents to stdout (decoded as UTF-8, lossy).
    Cat {
        /// Storage bucket name or id.
        bucket: String,
        /// File path inside the bucket.
        path: String,
    },

    /// Create a directory inside a storage bucket.
    Mkdir {
        /// Storage bucket name or id.
        bucket: String,
        /// Directory path to create.
        path: String,
    },

    /// Delete a file; pass -r to delete a directory recursively.
    Rm {
        /// Storage bucket name or id.
        bucket: String,
        /// Path to delete.
        path: String,
        /// Delete a directory and its contents recursively.
        #[arg(short, long)]
        recursive: bool,
    },

    /// Move or rename a path within a storage bucket.
    Mv {
        /// Storage bucket name or id.
        bucket: String,
        /// Source path inside the bucket.
        src: String,
        /// Destination path inside the bucket.
        dst: String,
    },

    /// Copy a path within a storage bucket.
    Cp {
        /// Storage bucket name or id.
        bucket: String,
        /// Source path inside the bucket.
        src: String,
        /// Destination path inside the bucket.
        dst: String,
    },

    /// Download a remote file to the local filesystem (streamed to disk).
    Download {
        /// Storage bucket name or id.
        bucket: String,
        /// Remote file path inside the bucket.
        remote_path: String,
        /// Local destination path (default: basename of remote in CWD).
        local_dest: Option<String>,
    },

    /// Upload a local file to a remote path (multipart upload).
    Upload {
        /// Storage bucket name or id.
        bucket: String,
        /// Local source file path.
        local_src: String,
        /// Remote destination path (including the target file name).
        remote_path: String,
    },

    /// One-way recursive mirror between a bucket and/or the local filesystem.
    ///
    /// Address each side as `bucketName:/path` for a storage bucket, or a plain
    /// local path otherwise. Supports local→remote, remote→local and
    /// remote→remote. One-way only: files at the destination that are missing
    /// at the source are NOT deleted.
    Sync {
        /// Source: `bucketName:/path` or a local path.
        src: String,
        /// Destination: `bucketName:/path` or a local path.
        dst: String,
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
                Command::Buckets => cli::files::run_buckets(auth).await,
                Command::Ls { bucket, path } => cli::files::run_ls(auth, bucket, path).await,
                Command::Stat { bucket, path } => cli::files::run_stat(auth, bucket, path).await,
                Command::Cat { bucket, path } => cli::files::run_cat(auth, bucket, path).await,
                Command::Mkdir { bucket, path } => cli::files::run_mkdir(auth, bucket, path).await,
                Command::Rm {
                    bucket,
                    path,
                    recursive,
                } => cli::files::run_rm(auth, bucket, path, recursive).await,
                Command::Mv { bucket, src, dst } => {
                    cli::files::run_mv(auth, bucket, src, dst).await
                }
                Command::Cp { bucket, src, dst } => {
                    cli::files::run_cp(auth, bucket, src, dst).await
                }
                Command::Download {
                    bucket,
                    remote_path,
                    local_dest,
                } => cli::files::run_download(auth, bucket, remote_path, local_dest).await,
                Command::Upload {
                    bucket,
                    local_src,
                    remote_path,
                } => cli::files::run_upload(auth, bucket, local_src, remote_path).await,
                Command::Sync { src, dst } => cli::files::run_sync(auth, src, dst).await,
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
    let context = Arc::new(state::AppState {
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
