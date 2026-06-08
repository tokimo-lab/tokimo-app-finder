mod bus_provider;
mod types;
pub use types::{StorageProvider, UploadOptions};

use std::sync::{Arc, OnceLock};
use tokimo_bus_client::BusClient;

use bus_provider::BusStorageProvider;

/// 创建基于 bus RPC 的 `StorageProvider`。
pub fn create_storage_from_bus(
    client: Arc<OnceLock<Arc<BusClient>>>,
    app_id: &str,
) -> Arc<dyn StorageProvider> {
    Arc::new(BusStorageProvider::new(client, app_id.to_string()))
}
