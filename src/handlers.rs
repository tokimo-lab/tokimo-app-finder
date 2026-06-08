//! Axum handlers for finder favorites.

use std::sync::Arc;

use axum::{Json, extract::State};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use tokimo_bus_auth::TokimoUser;
use ts_rs::TS;
use uuid::Uuid;

use crate::AppError;
use crate::db::repos::file_favorite_repo::FileFavoriteRepo;

pub struct AppCtx {
    pub db: DatabaseConnection,
}

// ─── Favorites ─────────────────────────────────────────────────────────

#[derive(Serialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct FileFavoriteDto {
    #[ts(type = "string")]
    pub id: Uuid,
    #[ts(type = "string")]
    pub user_id: Uuid,
    #[ts(type = "string")]
    pub vfs_id: Uuid,
    pub path: String,
    pub name: String,
    pub is_directory: bool,
    #[ts(type = "string")]
    pub created_at: chrono::DateTime<chrono::FixedOffset>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListFavoritesResp {
    items: Vec<FileFavoriteDto>,
}

pub async fn list_favorites(
    State(ctx): State<Arc<AppCtx>>,
    TokimoUser { user_id }: TokimoUser,
) -> Result<Json<ListFavoritesResp>, AppError> {
    let user_id = parse_uuid(&user_id)?;
    let items = FileFavoriteRepo::list(&ctx.db, user_id)
        .await?
        .into_iter()
        .map(|m| FileFavoriteDto {
            id: m.id,
            user_id: m.user_id,
            vfs_id: m.vfs_id,
            path: m.path,
            name: m.name,
            is_directory: m.is_directory,
            created_at: m.created_at,
        })
        .collect();
    Ok(Json(ListFavoritesResp { items }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleFavoriteBody {
    pub vfs_id: String,
    pub path: String,
    pub name: String,
    pub is_directory: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleFavoriteResp {
    is_favorited: bool,
}

pub async fn toggle_favorite(
    State(ctx): State<Arc<AppCtx>>,
    TokimoUser { user_id }: TokimoUser,
    Json(body): Json<ToggleFavoriteBody>,
) -> Result<Json<ToggleFavoriteResp>, AppError> {
    let user_id = parse_uuid(&user_id)?;
    let vfs_id = parse_uuid(&body.vfs_id)?;
    let is_favorited = FileFavoriteRepo::toggle(
        &ctx.db,
        user_id,
        vfs_id,
        body.path,
        body.name,
        body.is_directory,
    )
    .await?;
    Ok(Json(ToggleFavoriteResp { is_favorited }))
}

fn parse_uuid(s: &str) -> Result<Uuid, AppError> {
    s.parse::<Uuid>()
        .map_err(|_| AppError::bad_request(format!("invalid uuid: {s}")))
}
