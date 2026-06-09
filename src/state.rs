use std::sync::{Arc, OnceLock};

use sea_orm::DatabaseConnection;
use tokimo_bus_client::BusClient;

use crate::services::storage::StorageProvider;

pub struct AppState {
    pub db: DatabaseConnection,
    pub client: Arc<OnceLock<Arc<BusClient>>>,
    pub storage: Arc<dyn StorageProvider>,
}
