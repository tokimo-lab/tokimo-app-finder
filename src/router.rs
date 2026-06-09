use axum::{Router, routing::get, routing::post};
use std::sync::Arc;

use crate::handlers;
use crate::state::AppState;

pub fn build_finder_app_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/favorites", get(handlers::list_favorites))
        .route("/favorites/toggle", post(handlers::toggle_favorite))
}
