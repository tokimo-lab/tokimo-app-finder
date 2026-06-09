//! Linux-style, AI-facing file-management commands backed by the host
//! `/api/vfs/*` HTTP API. All operations act on VFS storage buckets and reuse
//! the server's drivers and streaming pipeline.

use std::path::{Path, PathBuf};

use anyhow::{Context, bail};
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::json;
use tokio::io::AsyncWriteExt;

use tokimo_bus_cli::TokimoAuthArgs;

use super::http::{
    BrowseResponse, StatEntry, VFS_API, api_client, expect_ok, init, list_buckets, read_data,
    resolve_bucket,
};

/// Build `(base_url, client)` from auth args.
fn setup(auth: &TokimoAuthArgs) -> anyhow::Result<(String, Client)> {
    let (base_url, token) = init(auth)?;
    let client = api_client(&token)?;
    Ok((base_url, client))
}

// ── Path utilities ───────────────────────────────────────────────────────────

/// Percent-encode a path for use in a query string value.
fn enc(value: &str) -> String {
    urlencoding::encode(value).into_owned()
}

/// Normalize a remote path to a leading-slash, no-trailing-slash form.
fn norm_remote(path: &str) -> String {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return "/".to_string();
    }
    let with_lead = if trimmed.starts_with('/') {
        trimmed.to_string()
    } else {
        format!("/{trimmed}")
    };
    let stripped = with_lead.trim_end_matches('/');
    if stripped.is_empty() {
        "/".to_string()
    } else {
        stripped.to_string()
    }
}

/// Split a remote path into `(parent_dir, file_name)`.
fn split_remote(path: &str) -> (String, String) {
    let normalized = norm_remote(path);
    match normalized.rfind('/') {
        Some(0) => ("/".to_string(), normalized[1..].to_string()),
        Some(idx) => (
            normalized[..idx].to_string(),
            normalized[idx + 1..].to_string(),
        ),
        None => ("/".to_string(), normalized),
    }
}

/// Join a remote directory and a child name into a single normalized path.
fn join_remote(dir: &str, child: &str) -> String {
    let base = norm_remote(dir);
    if base == "/" {
        format!("/{child}")
    } else {
        format!("{base}/{child}")
    }
}

/// Last path segment of a remote path (used as a default local file name).
fn basename(path: &str) -> String {
    split_remote(path).1
}

// ── Low-level VFS operations ─────────────────────────────────────────────────

async fn browse(
    client: &Client,
    base_url: &str,
    bucket_id: &str,
    path: &str,
) -> anyhow::Result<BrowseResponse> {
    let url = format!("{base_url}{VFS_API}/{bucket_id}/browse?path={}", enc(path));
    let resp = client.get(url).send().await.context("request browse")?;
    read_data(resp)
        .await
        .with_context(|| format!("browse {path}"))
}

async fn stat(
    client: &Client,
    base_url: &str,
    bucket_id: &str,
    path: &str,
) -> anyhow::Result<Vec<StatEntry>> {
    let url = format!("{base_url}{VFS_API}/{bucket_id}/stat");
    let resp = client
        .post(url)
        .json(&json!({ "paths": [path] }))
        .send()
        .await
        .context("request stat")?;
    read_data(resp)
        .await
        .with_context(|| format!("stat {path}"))
}

async fn post_path(
    client: &Client,
    base_url: &str,
    bucket_id: &str,
    endpoint: &str,
    body: serde_json::Value,
) -> anyhow::Result<()> {
    let url = format!("{base_url}{VFS_API}/{bucket_id}/{endpoint}");
    let resp = client
        .post(url)
        .json(&body)
        .send()
        .await
        .with_context(|| format!("request {endpoint}"))?;
    expect_ok(resp)
        .await
        .with_context(|| format!("{endpoint} failed"))
}

/// Create a directory (best-effort; drivers generally treat existing dirs as ok).
async fn mkdir(client: &Client, base_url: &str, bucket_id: &str, path: &str) -> anyhow::Result<()> {
    post_path(
        client,
        base_url,
        bucket_id,
        "mkdir",
        json!({ "path": path }),
    )
    .await
}

/// Read a whole file into memory via `read-file` (raw bytes).
async fn read_file_bytes(
    client: &Client,
    base_url: &str,
    bucket_id: &str,
    path: &str,
) -> anyhow::Result<Vec<u8>> {
    let url = format!(
        "{base_url}{VFS_API}/{bucket_id}/read-file?path={}",
        enc(path)
    );
    let resp = client.get(url).send().await.context("request read-file")?;
    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        bail!("read-file {path} failed (HTTP {status}): {text}");
    }
    let bytes = resp.bytes().await.context("read file body")?;
    Ok(bytes.to_vec())
}

/// Stream a file to a local destination without buffering it whole in memory.
async fn stream_to_file(
    client: &Client,
    base_url: &str,
    bucket_id: &str,
    remote_path: &str,
    dest: &Path,
) -> anyhow::Result<u64> {
    let url = format!(
        "{base_url}{VFS_API}/{bucket_id}/stream?path={}",
        enc(remote_path)
    );
    let resp = client.get(url).send().await.context("request stream")?;
    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        bail!("stream {remote_path} failed (HTTP {status}): {text}");
    }
    if let Some(parent) = dest.parent()
        && !parent.as_os_str().is_empty()
    {
        tokio::fs::create_dir_all(parent)
            .await
            .with_context(|| format!("create local dir {}", parent.display()))?;
    }
    let mut file = tokio::fs::File::create(dest)
        .await
        .with_context(|| format!("create local file {}", dest.display()))?;
    let mut total: u64 = 0;
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("read stream chunk")?;
        total += chunk.len() as u64;
        file.write_all(&chunk).await.context("write local file")?;
    }
    file.flush().await.context("flush local file")?;
    Ok(total)
}

/// Multipart-upload in-memory bytes as a single file named `filename` into `dir`.
async fn upload_bytes(
    client: &Client,
    base_url: &str,
    bucket_id: &str,
    dir: &str,
    filename: &str,
    bytes: Vec<u8>,
) -> anyhow::Result<()> {
    let url = format!(
        "{base_url}{VFS_API}/{bucket_id}/upload?path={}&filename={}",
        enc(dir),
        enc(filename)
    );
    let part = reqwest::multipart::Part::bytes(bytes).file_name(filename.to_string());
    let form = reqwest::multipart::Form::new().part("file", part);
    let resp = client
        .post(url)
        .multipart(form)
        .send()
        .await
        .context("request upload")?;
    expect_ok(resp)
        .await
        .with_context(|| format!("upload {filename}"))
}

// ── Formatting ───────────────────────────────────────────────────────────────

fn fmt_size(size: Option<u64>, is_dir: bool) -> String {
    if is_dir {
        "-".to_string()
    } else {
        size.map_or_else(|| "?".to_string(), |s| s.to_string())
    }
}

fn fmt_modified(modified: Option<&str>) -> String {
    modified.unwrap_or("-").to_string()
}

// ── Commands ─────────────────────────────────────────────────────────────────

/// List all storage buckets (id, name, type).
pub async fn run_buckets(auth: TokimoAuthArgs) -> anyhow::Result<()> {
    let (base_url, client) = setup(&auth)?;
    let buckets = list_buckets(&client, &base_url).await?;
    if buckets.is_empty() {
        println!("No storage buckets configured.");
        return Ok(());
    }
    println!("{:<38}  {:<24}  TYPE", "ID", "NAME");
    for bucket in &buckets {
        println!("{:<38}  {:<24}  {}", bucket.id, bucket.name, bucket.kind);
    }
    Ok(())
}

/// List a directory inside a bucket.
pub async fn run_ls(auth: TokimoAuthArgs, bucket: String, path: String) -> anyhow::Result<()> {
    let (base_url, client) = setup(&auth)?;
    let (id, name) = resolve_bucket(&client, &base_url, &bucket).await?;
    let dir = norm_remote(&path);
    let listing = browse(&client, &base_url, &id, &dir).await?;
    if listing.entries.is_empty() {
        println!("{name}:{dir} is empty.");
        return Ok(());
    }
    println!("{:<1}  {:>14}  {:<24}  NAME", "T", "SIZE", "MODIFIED");
    for entry in &listing.entries {
        println!(
            "{:<1}  {:>14}  {:<24}  {}",
            if entry.is_directory { 'd' } else { '-' },
            fmt_size(entry.size, entry.is_directory),
            fmt_modified(entry.modified_at.as_deref()),
            entry.name
        );
    }
    Ok(())
}

/// Show metadata for a single file or directory.
pub async fn run_stat(auth: TokimoAuthArgs, bucket: String, path: String) -> anyhow::Result<()> {
    let (base_url, client) = setup(&auth)?;
    let (id, _name) = resolve_bucket(&client, &base_url, &bucket).await?;
    let target = norm_remote(&path);
    let entries = stat(&client, &base_url, &id, &target).await?;
    let Some(entry) = entries.into_iter().next() else {
        bail!("No metadata returned for {target}");
    };
    println!("path:     {}", entry.path);
    println!(
        "size:     {}",
        entry
            .size
            .map_or_else(|| "-".to_string(), |s| s.to_string())
    );
    println!("modified: {}", entry.modified_at.as_deref().unwrap_or("-"));
    println!("mode:     {}", entry.mode.as_deref().unwrap_or("-"));
    Ok(())
}

/// Print a text file's contents to stdout.
pub async fn run_cat(auth: TokimoAuthArgs, bucket: String, path: String) -> anyhow::Result<()> {
    let (base_url, client) = setup(&auth)?;
    let (id, _name) = resolve_bucket(&client, &base_url, &bucket).await?;
    let target = norm_remote(&path);
    let bytes = read_file_bytes(&client, &base_url, &id, &target).await?;
    print!("{}", String::from_utf8_lossy(&bytes));
    Ok(())
}

/// Create a directory.
pub async fn run_mkdir(auth: TokimoAuthArgs, bucket: String, path: String) -> anyhow::Result<()> {
    let (base_url, client) = setup(&auth)?;
    let (id, name) = resolve_bucket(&client, &base_url, &bucket).await?;
    let target = norm_remote(&path);
    mkdir(&client, &base_url, &id, &target).await?;
    println!("Created {name}:{target}");
    Ok(())
}

/// Delete a file, or a directory (recursively) with `-r`.
pub async fn run_rm(
    auth: TokimoAuthArgs,
    bucket: String,
    path: String,
    recursive: bool,
) -> anyhow::Result<()> {
    let (base_url, client) = setup(&auth)?;
    let (id, name) = resolve_bucket(&client, &base_url, &bucket).await?;
    let target = norm_remote(&path);
    let endpoint = if recursive {
        "delete-dir"
    } else {
        "delete-file"
    };
    post_path(&client, &base_url, &id, endpoint, json!({ "path": target })).await?;
    println!("Deleted {name}:{target}");
    Ok(())
}

/// Move/rename a path within a bucket.
pub async fn run_mv(
    auth: TokimoAuthArgs,
    bucket: String,
    src: String,
    dst: String,
) -> anyhow::Result<()> {
    let (base_url, client) = setup(&auth)?;
    let (id, name) = resolve_bucket(&client, &base_url, &bucket).await?;
    let from = norm_remote(&src);
    let to = norm_remote(&dst);
    post_path(
        &client,
        &base_url,
        &id,
        "rename",
        json!({ "from": from, "to": to }),
    )
    .await?;
    println!("Moved {name}:{from} -> {name}:{to}");
    Ok(())
}

/// Copy a path within a bucket.
pub async fn run_cp(
    auth: TokimoAuthArgs,
    bucket: String,
    src: String,
    dst: String,
) -> anyhow::Result<()> {
    let (base_url, client) = setup(&auth)?;
    let (id, name) = resolve_bucket(&client, &base_url, &bucket).await?;
    let from = norm_remote(&src);
    let to = norm_remote(&dst);
    post_path(
        &client,
        &base_url,
        &id,
        "copy",
        json!({ "from": from, "to": to }),
    )
    .await?;
    println!("Copied {name}:{from} -> {name}:{to}");
    Ok(())
}

/// Download a remote file to the local filesystem (streamed to disk).
pub async fn run_download(
    auth: TokimoAuthArgs,
    bucket: String,
    remote_path: String,
    local_dest: Option<String>,
) -> anyhow::Result<()> {
    let (base_url, client) = setup(&auth)?;
    let (id, _name) = resolve_bucket(&client, &base_url, &bucket).await?;
    let remote = norm_remote(&remote_path);
    let dest = PathBuf::from(local_dest.unwrap_or_else(|| basename(&remote)));
    let written = stream_to_file(&client, &base_url, &id, &remote, &dest).await?;
    println!("Downloaded {} bytes -> {}", written, dest.display());
    Ok(())
}

/// Upload a local file to a remote path (multipart).
pub async fn run_upload(
    auth: TokimoAuthArgs,
    bucket: String,
    local_src: String,
    remote_path: String,
) -> anyhow::Result<()> {
    let (base_url, client) = setup(&auth)?;
    let (id, name) = resolve_bucket(&client, &base_url, &bucket).await?;
    let bytes = tokio::fs::read(&local_src)
        .await
        .with_context(|| format!("read local file {local_src}"))?;
    let (dir, filename) = split_remote(&remote_path);
    if filename.is_empty() {
        bail!("remote-path must include a file name, got '{remote_path}'");
    }
    let len = bytes.len();
    upload_bytes(&client, &base_url, &id, &dir, &filename, bytes).await?;
    println!(
        "Uploaded {len} bytes -> {name}:{}",
        join_remote(&dir, &filename)
    );
    Ok(())
}

// ── sync ─────────────────────────────────────────────────────────────────────

/// A sync source/destination: either a local filesystem path or a VFS location.
enum Endpoint {
    Local(PathBuf),
    Remote { id: String, root: String },
}

/// Parse a sync endpoint argument.
///
/// `bucketName:/path` (or `bucketId:/path`) is a VFS location when the prefix
/// resolves to a known bucket; anything else is treated as a local path.
async fn parse_endpoint(client: &Client, base_url: &str, arg: &str) -> anyhow::Result<Endpoint> {
    if let Some((prefix, rest)) = arg.split_once(':')
        && let Ok((id, _name)) = resolve_bucket(client, base_url, prefix).await
    {
        return Ok(Endpoint::Remote {
            id,
            root: norm_remote(rest),
        });
    }
    Ok(Endpoint::Local(PathBuf::from(arg)))
}

/// Recursively collect file paths (relative to `root`) under a remote directory.
async fn collect_remote(
    client: &Client,
    base_url: &str,
    bucket_id: &str,
    root: &str,
) -> anyhow::Result<Vec<String>> {
    let mut files = Vec::new();
    let mut pending = vec![String::new()];
    while let Some(rel_dir) = pending.pop() {
        let abs_dir = if rel_dir.is_empty() {
            root.to_string()
        } else {
            join_remote(root, &rel_dir)
        };
        let listing = browse(client, base_url, bucket_id, &abs_dir).await?;
        for entry in listing.entries {
            let rel = if rel_dir.is_empty() {
                entry.name.clone()
            } else {
                format!("{rel_dir}/{}", entry.name)
            };
            if entry.is_directory {
                pending.push(rel);
            } else {
                files.push(rel);
            }
        }
    }
    Ok(files)
}

/// Recursively collect file paths (relative to `root`) under a local directory.
async fn collect_local(root: &Path) -> anyhow::Result<Vec<String>> {
    let mut files = Vec::new();
    let mut pending = vec![PathBuf::new()];
    while let Some(rel_dir) = pending.pop() {
        let abs_dir = root.join(&rel_dir);
        let mut read_dir = tokio::fs::read_dir(&abs_dir)
            .await
            .with_context(|| format!("read local dir {}", abs_dir.display()))?;
        while let Some(entry) = read_dir
            .next_entry()
            .await
            .context("read local dir entry")?
        {
            let name = entry.file_name();
            let rel = rel_dir.join(&name);
            let meta = entry.metadata().await.context("stat local entry")?;
            if meta.is_dir() {
                pending.push(rel);
            } else {
                files.push(rel.to_string_lossy().replace('\\', "/"));
            }
        }
    }
    Ok(files)
}

/// One-way recursive mirror from `src` to `dst`.
///
/// Addressing: `bucketName:/path` for a storage bucket, or a local path
/// otherwise. Supports local→remote, remote→local and remote→remote. One-way
/// only: files present at the destination but missing at the source are NOT
/// deleted (v1 limitation).
pub async fn run_sync(auth: TokimoAuthArgs, src: String, dst: String) -> anyhow::Result<()> {
    let (base_url, client) = setup(&auth)?;
    let source = parse_endpoint(&client, &base_url, &src).await?;
    let target = parse_endpoint(&client, &base_url, &dst).await?;

    let relatives = match &source {
        Endpoint::Local(root) => collect_local(root).await?,
        Endpoint::Remote { id, root, .. } => collect_remote(&client, &base_url, id, root).await?,
    };

    let mut synced = 0_usize;
    for rel in &relatives {
        sync_one(&client, &base_url, &source, &target, rel).await?;
        println!("  {rel}");
        synced += 1;
    }
    println!("Synced {synced} files");
    Ok(())
}

/// Sync a single relative file from `source` to `target`.
async fn sync_one(
    client: &Client,
    base_url: &str,
    source: &Endpoint,
    target: &Endpoint,
    rel: &str,
) -> anyhow::Result<()> {
    match (source, target) {
        (Endpoint::Local(src_root), Endpoint::Local(dst_root)) => {
            let dst = dst_root.join(rel);
            if let Some(parent) = dst.parent() {
                tokio::fs::create_dir_all(parent)
                    .await
                    .with_context(|| format!("create local dir {}", parent.display()))?;
            }
            tokio::fs::copy(src_root.join(rel), &dst)
                .await
                .with_context(|| format!("copy local file {rel}"))?;
        }
        (Endpoint::Local(src_root), Endpoint::Remote { id, root, .. }) => {
            let bytes = tokio::fs::read(src_root.join(rel))
                .await
                .with_context(|| format!("read local file {rel}"))?;
            let dst = join_remote(root, rel);
            let (dir, filename) = split_remote(&dst);
            ensure_remote_dir(client, base_url, id, &dir).await;
            upload_bytes(client, base_url, id, &dir, &filename, bytes).await?;
        }
        (Endpoint::Remote { id, root, .. }, Endpoint::Local(dst_root)) => {
            let remote = join_remote(root, rel);
            let dst = dst_root.join(rel);
            stream_to_file(client, base_url, id, &remote, &dst).await?;
        }
        (
            Endpoint::Remote {
                id: src_id,
                root: src_root,
                ..
            },
            Endpoint::Remote {
                id: dst_id,
                root: dst_root,
                ..
            },
        ) => {
            let from = join_remote(src_root, rel);
            let to = join_remote(dst_root, rel);
            let (dir, _filename) = split_remote(&to);
            ensure_remote_dir(client, base_url, dst_id, &dir).await;
            if src_id == dst_id {
                post_path(
                    client,
                    base_url,
                    src_id,
                    "copy",
                    json!({ "from": from, "to": to }),
                )
                .await?;
            } else {
                let bytes = read_file_bytes(client, base_url, src_id, &from).await?;
                let (dir, filename) = split_remote(&to);
                upload_bytes(client, base_url, dst_id, &dir, &filename, bytes).await?;
            }
        }
    }
    Ok(())
}

/// Best-effort recursive `mkdir -p` for a remote directory.
async fn ensure_remote_dir(client: &Client, base_url: &str, bucket_id: &str, dir: &str) {
    let normalized = norm_remote(dir);
    if normalized == "/" {
        return;
    }
    let mut current = String::new();
    for segment in normalized.trim_start_matches('/').split('/') {
        current.push('/');
        current.push_str(segment);
        let _ = mkdir(client, base_url, bucket_id, &current).await;
    }
}
