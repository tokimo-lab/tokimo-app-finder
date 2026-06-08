//! CLI entrypoints for finder.

use anyhow::Context;
use tokimo_bus_auth::db::verify_token;
use tokimo_bus_cli::{Credentials, TokimoAuthArgs};
use uuid::Uuid;

use crate::{
    FavoritesCmd,
    db::{init_pool, repos::file_favorite_repo::FileFavoriteRepo},
};

pub async fn run_favorites(auth: TokimoAuthArgs, cmd: FavoritesCmd) -> anyhow::Result<()> {
    let (db, user_id) = init(auth).await?;

    match cmd {
        FavoritesCmd::List => {
            let items = FileFavoriteRepo::list(&db, user_id)
                .await
                .context("list favorites failed")?;
            if items.is_empty() {
                println!("No favorites.");
                return Ok(());
            }

            println!("{:<36}  {:<36}  {:<8}  Name", "VFS ID", "Path", "Dir?");
            for item in items {
                println!(
                    "{:<36}  {:<36}  {:<8}  {}",
                    item.vfs_id, item.path, item.is_directory, item.name
                );
            }
        }
        FavoritesCmd::Add {
            vfs_id,
            path,
            name,
            is_directory,
        } => {
            let added = FileFavoriteRepo::toggle(&db, user_id, vfs_id, path, name, is_directory)
                .await
                .context("add favorite failed")?;
            if added {
                println!("Added to favorites.");
            } else {
                println!("Already favorited (removed).");
            }
        }
        FavoritesCmd::Remove { vfs_id, path } => {
            // toggle will remove if exists
            let removed = FileFavoriteRepo::toggle(&db, user_id, vfs_id, path, String::new(), false)
                .await
                .context("remove favorite failed")?;
            if !removed {
                println!("Removed from favorites.");
            } else {
                println!("Was not favorited (now added).");
            }
        }
    }

    Ok(())
}

async fn init(auth: TokimoAuthArgs) -> anyhow::Result<(sea_orm::DatabaseConnection, Uuid)> {
    let credentials = Credentials::resolve(&auth).context("resolve Tokimo credentials failed")?;
    let db = init_pool().await.context("connect database failed")?;
    let verified = verify_token(&db, &credentials.token)
        .await
        .context("verify Tokimo token failed")?;
    Ok((db, verified.user_id))
}
