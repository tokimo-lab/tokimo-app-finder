use bytes::Bytes;
use std::path::PathBuf;

pub struct UploadOptions {
    pub content_type: Option<String>,
}

#[allow(dead_code)]
pub struct StorageObject {
    pub key: String,
    pub size: u64,
}

/// 可插拔的对象存储抽象。
#[async_trait::async_trait]
pub trait StorageProvider: Send + Sync {
    async fn upload(
        &self,
        key: &str,
        body: Bytes,
        options: Option<UploadOptions>,
    ) -> Result<String, String>;

    async fn download(&self, key: &str) -> Result<Bytes, String>;

    async fn delete(&self, key: &str) -> Result<(), String>;

    async fn exists(&self, key: &str) -> Result<bool, String>;

    async fn head(&self, key: &str) -> Result<Option<StorageObject>, String>;

    async fn list(&self, prefix: Option<&str>) -> Result<Vec<StorageObject>, String>;

    fn local_absolute_path(&self, _key: &str) -> Option<PathBuf> {
        None
    }
}
