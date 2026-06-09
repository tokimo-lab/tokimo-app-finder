//! Shared HTTP plumbing for the file-management CLI.
//!
//! The file commands talk to the HOST Tokimo server's `/api/vfs/*` HTTP API so
//! they reuse every VFS driver (Local / SFTP / SMB / FTP / S3) and the server's
//! streaming pipeline. This mirrors the home-assistant app's direct-HTTP CLI.

use anyhow::{Context, bail};
use reqwest::Client;
use serde::Deserialize;
use serde::de::DeserializeOwned;
use tokimo_bus_cli::{Credentials, TokimoAuthArgs};
use uuid::Uuid;

/// Base path for every VFS endpoint on the host server.
pub const VFS_API: &str = "/api/vfs";

/// Resolve credentials and the host base URL for HTTP access.
///
/// Returns `(base_url, token)`. The base URL defaults to the local dev server
/// and can be overridden with the `TOKIMO_SERVER_URL` environment variable.
pub fn init(auth: &TokimoAuthArgs) -> anyhow::Result<(String, String)> {
    let credentials = Credentials::resolve(auth).context("resolve Tokimo credentials failed")?;
    let base_url =
        std::env::var("TOKIMO_SERVER_URL").unwrap_or_else(|_| "http://localhost:5678".to_string());
    Ok((base_url, credentials.token))
}

/// Build an HTTP client that sends `Authorization: Bearer <token>` on every
/// request. The `/api/vfs` routes do not currently enforce auth, but the header
/// is sent anyway to stay future-proof.
pub fn api_client(token: &str) -> anyhow::Result<Client> {
    let mut headers = reqwest::header::HeaderMap::new();
    let value = format!("Bearer {token}")
        .parse()
        .context("build Authorization header")?;
    headers.insert(reqwest::header::AUTHORIZATION, value);
    Client::builder()
        .default_headers(headers)
        .build()
        .context("build HTTP client")
}

/// Standard `{ success, data, error }` envelope used by every JSON VFS endpoint.
#[derive(Deserialize)]
#[serde(bound(deserialize = "T: serde::Deserialize<'de>"))]
struct Envelope<T> {
    success: bool,
    #[serde(default)]
    data: Option<T>,
    #[serde(default)]
    error: Option<String>,
}

/// Unwrap an envelope response into its `data`, or bail with the server `error`.
pub async fn read_data<T: DeserializeOwned>(resp: reqwest::Response) -> anyhow::Result<T> {
    let status = resp.status();
    let text = resp.text().await.context("read response body")?;
    let env: Envelope<T> = serde_json::from_str(&text)
        .with_context(|| format!("parse response (HTTP {status}): {text}"))?;
    if !env.success {
        bail!(
            "{}",
            env.error
                .unwrap_or_else(|| format!("request failed (HTTP {status})"))
        );
    }
    env.data
        .context("server returned success but no data field")
}

/// Assert a (possibly empty) success envelope, bailing with the server `error`.
pub async fn expect_ok(resp: reqwest::Response) -> anyhow::Result<()> {
    let status = resp.status();
    let text = resp.text().await.context("read response body")?;
    if text.trim().is_empty() {
        if status.is_success() {
            return Ok(());
        }
        bail!("request failed (HTTP {status})");
    }
    let env: Envelope<serde_json::Value> = serde_json::from_str(&text)
        .with_context(|| format!("parse response (HTTP {status}): {text}"))?;
    if !env.success {
        bail!(
            "{}",
            env.error
                .unwrap_or_else(|| format!("request failed (HTTP {status})"))
        );
    }
    Ok(())
}

/// Minimal storage-bucket DTO (the server serializes more fields; we ignore them).
#[derive(Deserialize)]
pub struct Bucket {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub kind: String,
}

/// A single directory entry returned by `/browse`.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowseEntry {
    pub name: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub modified_at: Option<String>,
}

/// Response body of `/browse`.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowseResponse {
    pub entries: Vec<BrowseEntry>,
}

/// A single entry returned by `/stat`.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatEntry {
    pub path: String,
    pub size: Option<u64>,
    pub modified_at: Option<String>,
    pub mode: Option<String>,
}

/// Fetch every storage bucket from the host server.
pub async fn list_buckets(client: &Client, base_url: &str) -> anyhow::Result<Vec<Bucket>> {
    let resp = client
        .get(format!("{base_url}{VFS_API}"))
        .send()
        .await
        .context("request bucket list")?;
    read_data(resp).await.context("parse bucket list")
}

/// Resolve a `name-or-id` argument to a concrete `(id, name)` bucket.
///
/// Name is preferred; an id is the disambiguation escape hatch:
/// 1. If `arg` is a UUID equal to some bucket id → use it.
/// 2. Else match buckets by exact `name`: exactly one → use it; more than one →
///    bail listing each candidate's id + type; zero → bail with guidance.
pub async fn resolve_bucket(
    client: &Client,
    base_url: &str,
    arg: &str,
) -> anyhow::Result<(String, String)> {
    let buckets = list_buckets(client, base_url).await?;

    if Uuid::parse_str(arg).is_ok()
        && let Some(bucket) = buckets.iter().find(|b| b.id == arg)
    {
        return Ok((bucket.id.clone(), bucket.name.clone()));
    }

    let matches: Vec<&Bucket> = buckets.iter().filter(|b| b.name == arg).collect();
    match matches.as_slice() {
        [bucket] => Ok((bucket.id.clone(), bucket.name.clone())),
        [] => bail!(
            "No storage bucket named or matching id '{arg}'. \
Run 'finder buckets' to list available buckets."
        ),
        many => {
            use std::fmt::Write as _;
            let mut msg = format!(
                "Found {} storage buckets named '{arg}'. Please specify by id instead:",
                many.len()
            );
            for bucket in many {
                let _ = write!(msg, "\n  {}  ({})", bucket.id, bucket.kind);
            }
            bail!("{msg}")
        }
    }
}
