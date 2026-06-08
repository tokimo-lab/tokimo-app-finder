//! Library facade — exposes modules for ts-rs type generation and testing.

pub(crate) const MANIFEST: &str = include_str!("../tokimo-app.toml");

pub mod ctx;
pub mod db;
pub mod error;
pub mod handlers;
