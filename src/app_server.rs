//! 内嵌 axum HTTP server，监听本地 UDS socket。
//!
//! 路由布局（server 端 `/api/apps/finder/<rest>` 反代到本 sock 的 `/<rest>`）。

use std::sync::Arc;

use axum::Router;
use tokimo_bus_protocol::{BusListener, DataPlaneSocket};
use tracing::{error, info};

use crate::{assets, router, state::AppState};

pub async fn spawn(service: &str, ctx: Arc<AppState>) -> anyhow::Result<DataPlaneSocket> {
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

fn build_router(ctx: Arc<AppState>) -> Router {
    Router::new()
        .merge(router::build_finder_app_routes())
        .route("/assets/{*path}", axum::routing::get(assets::serve))
        .with_state(ctx)
}
