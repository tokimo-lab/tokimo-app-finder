//! 内嵌 axum HTTP server，监听本地 socket。
//!
//! 路由布局（server 端 `/api/apps/finder/<rest>` 反代到本 sock 的 `/<rest>`）：
//! - `GET  /favorites`           → 列出收藏
//! - `POST /favorites/toggle`    → 切换收藏状态
//! - `GET  /assets/{*path}`      → 静态资源

use std::sync::Arc;

use axum::{Router, routing::get, routing::post};
use tokimo_bus_protocol::{BusListener, DataPlaneSocket};
use tracing::{error, info};

use crate::{assets, handlers, handlers::AppCtx};

pub async fn spawn(service: &str, ctx: Arc<AppCtx>) -> anyhow::Result<DataPlaneSocket> {
    let (listener, socket) = BusListener::bind_for_app(service)?;
    info!(?socket, "finder: app server listening");

    let router = build_router(ctx);

    tokio::spawn(async move {
        if let Err(e) = axum::serve(listener, router).await {
            error!(error = %e, "finder: app server stopped");
        }
    });

    Ok(socket)
}

fn build_router(ctx: Arc<AppCtx>) -> Router {
    Router::new()
        .route("/favorites", get(handlers::list_favorites))
        .route("/favorites/toggle", post(handlers::toggle_favorite))
        .route("/assets/{*path}", get(assets::serve))
        .with_state(ctx)
}
