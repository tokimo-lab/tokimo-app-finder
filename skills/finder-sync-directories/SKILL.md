---
name: finder-sync-directories
description: "Recursively mirror a whole directory tree one-way between a remote storage bucket (SMB / NFS / FTP / SFTP / S3 / 网盘 cloud drive) and the local filesystem, or between two buckets — for folder backups and bulk transfers."
when-to-use: "When the user wants to copy/back up/mirror an entire folder (recursively) into or out of a remote storage bucket, or between two buckets — not just a single file."
argument-hint: "<src> <dst>"
version: "0.1.0"
context: inline
---

# Sync (Mirror) a Directory Tree

`sync` recursively copies every file under a source directory to a destination,
creating sub-directories as needed. Use it for whole-folder backups/mirrors. For
a single file, use the `finder-transfer-files` skill.

## Addressing: location syntax (read first)

Both `<src>` and `<dst>` are **locations**, each written one of two ways:

| Location | Syntax | Example |
|----------|--------|---------|
| A storage bucket path | `bucketName:/path` | `media:/movie` |
| A local filesystem path | a plain path | `./backup` or `/home/me/movie` |

The part before `:` is resolved as a **bucket name** (preferred; use the bucket
**id** if the name is ambiguous — run `tokimo-app-finder buckets` to list). A
plain path with no resolvable `bucketName:` prefix is treated as local.

## Direction & semantics

- **One-way mirror**: files under `<src>` are copied into `<dst>`. Supported
  directions: local→bucket, bucket→local, and bucket→bucket.
- It does **not** delete files at `<dst>` that are missing from `<src>` (v1 is
  additive, not a destructive mirror).
- Same-bucket copies use the server-side copy path; cross-bucket and
  bucket↔local transfers stream each file through the CLI.

## Quick Reference

| Task | Command |
|------|---------|
| List buckets | `tokimo-app-finder buckets` |
| Local → bucket | `tokimo-app-finder sync ./localdir media:/remote/dir` |
| Bucket → local | `tokimo-app-finder sync media:/remote/dir ./localdir` |
| Bucket → bucket | `tokimo-app-finder sync media:/movie backup:/movie` |

## Worked Example

Back up a local project folder into a bucket, then mirror one bucket to another:

```bash
# 1. Identify buckets
tokimo-app-finder buckets                 # -> "media" (smb), "backup" (s3)

# 2. Upload an entire local folder (recursively)
tokimo-app-finder sync ./photos media:/photos

# 3. Mirror a bucket folder to local
tokimo-app-finder sync media:/movie ./movie-backup

# 4. Copy a folder from one bucket to another
tokimo-app-finder sync media:/movie backup:/movie
```

A short progress line is printed per file, ending with `Synced N files`.

## Notes

- One-way only: extra files already present at the destination are left in place.
- For a single file (not a whole tree), use the `finder-transfer-files` skill.
- Driver limits apply (e.g. a read-only bucket can be a sync **source** but not a
  **destination**); the CLI surfaces the underlying driver error.
