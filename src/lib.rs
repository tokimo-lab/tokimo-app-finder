//! Library facade — exposes modules for ts-rs type generation and testing.

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};

pub(crate) const MANIFEST: &str = include_str!("../tokimo-app.toml");

pub mod db;
pub mod handlers;

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
    fn into_response(self) -> Response {
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
