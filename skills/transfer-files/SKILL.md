---
name: transfer-files
description: "Move a single file between a storage bucket and the local filesystem with the finder CLI: download a remote file to disk, or upload a local file to a bucket."
when-to-use: "When the user wants to download a file out of a storage bucket to local disk, or upload/save a local file into one of their storage buckets."
argument-hint: "<bucket name> <path>"
version: "0.1.0"
context: inline
---

# Download / Upload a File

Move one file at a time between a Tokimo **storage bucket** and the local
filesystem. (To mirror an entire directory tree, use the `sync-directories`
skill instead.)

## Choosing the bucket (read first)

The first argument is the `<bucket>` — pass the **bucket name** (preferred). If
two buckets share a name the command fails and prints their ids; re-run with the
**id**. List buckets with `tokimo-app-finder buckets`.

## Quick Reference

| Task | Command |
|------|---------|
| List buckets | `tokimo-app-finder buckets` |
| Download a remote file → local | `tokimo-app-finder download <bucket> <remote-path> [local-dest]` |
| Upload a local file → bucket | `tokimo-app-finder upload <bucket> <local-src> <remote-path>` |
| Find the remote path | `tokimo-app-finder ls <bucket> <dir>` |

## Workflow

### Download (bucket → local)

```bash
tokimo-app-finder download media /movie/clip.mp4 ./clip.mp4
```

- `<remote-path>` — absolute path inside the bucket (use `ls` to find it).
- `[local-dest]` — optional. Defaults to the file's basename in the current
  directory. May be a file path or omitted.
- The file is **streamed to disk**, so large files don't load into memory.

### Upload (local → bucket)

```bash
tokimo-app-finder upload media ./clip.mp4 /movie/clip.mp4
```

- `<local-src>` — path to the local file to send.
- `<remote-path>` — the full destination path **including the target file
  name**. The parent directory should already exist (create it first with
  `tokimo-app-finder mkdir <bucket> <dir>` if needed).

## Worked Example

Pull a log file down, edit nothing, push a config up:

```bash
# 1. Identify the bucket
tokimo-app-finder buckets                 # -> name "backup" (s3)

# 2. Find the file
tokimo-app-finder ls backup /logs         # -> app.log

# 3. Download it
tokimo-app-finder download backup /logs/app.log ./app.log

# 4. Upload a local config (ensure the folder exists first)
tokimo-app-finder mkdir backup /configs
tokimo-app-finder upload backup ./app.toml /configs/app.toml
```

## Notes

- `download` streams to disk; `upload` currently reads the whole local file into
  memory before sending, so prefer it for reasonably sized files.
- To create the destination directory for an upload, use `mkdir` (see the
  `manage-files` skill).
- For recursive, whole-folder transfers in either direction, use the
  `sync-directories` skill.
