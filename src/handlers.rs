//! Handlers — favorites CRUD + response helpers.

use std::sync::Arc;

use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use tokimo_bus_auth::TokimoUser;
use uuid::Uuid;

use crate::state::AppState;
use crate::db::repos::file_favorite_repo::FileFavoriteRepo;
use crate::error::AppError;

// ─── Response helpers (matching music app pattern) ─────────────────────

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

pub fn ok<T: Serialize>(data: T) -> Json<ApiResponse<T>> {
    Json(ApiResponse {
        success: true,
        data: Some(data),
        error: None,
    })
}

// ─── Output DTO ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileFavoriteDto {
    pub id: String,
    pub user_id: String,
    pub vfs_id: String,
    pub path: String,
    pub name: String,
    pub is_directory: bool,
    pub created_at: String,
}

fn to_favorite_dto(m: crate::db::entities::file_favorites::Model) -> FileFavoriteDto {
    FileFavoriteDto {
        id: m.id.to_string(),
        user_id: m.user_id.to_string(),
        vfs_id: m.vfs_id.to_string(),
        path: m.path,
        name: m.name,
        is_directory: m.is_directory,
        created_at: m.created_at.to_rfc3339(),
    }
}

// ─── Handlers ─────────────────────────────────────────────────────────

pub async fn list_favorites(
    State(ctx): State<Arc<AppState>>,
    TokimoUser { user_id }: TokimoUser,
) -> Result<Json<ApiResponse<Vec<FileFavoriteDto>>>, AppError> {
    let user_id = parse_uuid(&user_id)?;
    let items = FileFavoriteRepo::list(&ctx.db, user_id)
        .await?
        .into_iter()
        .map(to_favorite_dto)
        .collect();
    Ok(ok(items))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleFavoriteBody {
    pub vfs_id: String,
    pub path: String,
    pub name: String,
    pub is_directory: bool,
}

pub async fn toggle_favorite(
    State(ctx): State<Arc<AppState>>,
    TokimoUser { user_id }: TokimoUser,
    Json(body): Json<ToggleFavoriteBody>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
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
    Ok(ok(serde_json::json!({ "isFavorited": is_favorited })))
}

fn parse_uuid(s: &str) -> Result<Uuid, AppError> {
    s.parse::<Uuid>()
        .map_err(|_| AppError::bad_request(format!("invalid uuid: {s}")))
}
