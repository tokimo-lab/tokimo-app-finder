---
name: manage-files
description: "Browse and organize files in one of the user's storage buckets (cloud/network drives) via the finder CLI: list directories, read text files, and create/delete/rename/move/copy files and folders."
when-to-use: "When the user wants to look at, inspect, organize, rename, move, copy, or delete files/folders that live in one of their storage buckets (SMB/SFTP/S3/网盘 etc.)."
argument-hint: "<bucket name> [path]"
version: "0.1.0"
context: inline
---

# Manage Files in a Storage Bucket

Browse and reorganize files that live in a Tokimo **storage bucket** (a
configured remote/network/cloud source). All commands act on one bucket at a
time.

## Choosing the bucket (read first)

Every command takes a `<bucket>` as its first argument. Pass the **bucket name**
(preferred). If two buckets share the same name, the command fails and lists
their ids — re-run with the **id** instead. List buckets any time:

```bash
tokimo-app-finder buckets
#   ID                                      NAME      TYPE
#   359afd9d-...-052e879ae483               media     smb
#   e57cbad3-...-0afbb6e0596b               backup    s3
```

So `<bucket>` is either a name (`media`) or, to disambiguate, an id
(`359afd9d-...`).

## Quick Reference

| Task | Command |
|------|---------|
| List buckets | `tokimo-app-finder buckets` |
| List a directory | `tokimo-app-finder ls <bucket> [path]` |
| File/dir metadata | `tokimo-app-finder stat <bucket> <path>` |
| Print a text file | `tokimo-app-finder cat <bucket> <path>` |
| Create a directory | `tokimo-app-finder mkdir <bucket> <path>` |
| Delete a file | `tokimo-app-finder rm <bucket> <path>` |
| Delete a directory | `tokimo-app-finder rm -r <bucket> <path>` |
| Rename / move | `tokimo-app-finder mv <bucket> <src> <dst>` |
| Copy | `tokimo-app-finder cp <bucket> <src> <dst>` |

## Workflow

1. **Pick the bucket.** If you don't know its name, run `buckets`.

2. **Navigate with `ls`.** Paths are absolute inside the bucket, starting at `/`
   (the default).

   ```bash
   tokimo-app-finder ls media /
   tokimo-app-finder ls media /movie
   ```

   Columns: `T` (`d` = directory, `-` = file), `SIZE`, `MODIFIED`, `NAME`.

3. **Inspect or read.**

   ```bash
   tokimo-app-finder stat media /movie/notes.txt
   tokimo-app-finder cat  media /movie/notes.txt
   ```

   `cat` decodes the file as UTF-8 text — use it for text files, not binaries
   (use the `transfer-files` skill to download binaries).

4. **Organize.** Create, delete, rename/move, copy:

   ```bash
   tokimo-app-finder mkdir media /movie/2024
   tokimo-app-finder mv    media /movie/a.mkv /movie/2024/a.mkv   # rename or move
   tokimo-app-finder cp    media /movie/a.mkv /movie/a.copy.mkv
   tokimo-app-finder rm    media /movie/a.copy.mkv               # a file
   tokimo-app-finder rm -r media /movie/2024                     # a directory
   ```

## Worked Example

Organize a download folder:

```bash
# 1. Find the bucket
tokimo-app-finder buckets            # -> name "media" (smb)

# 2. See what's in /downloads
tokimo-app-finder ls media /downloads

# 3. Make a folder and move a file into it
tokimo-app-finder mkdir media /downloads/keep
tokimo-app-finder mv media /downloads/report.pdf /downloads/keep/report.pdf

# 4. Delete an unwanted folder
tokimo-app-finder rm -r media /downloads/tmp
```

## Notes

- `rm` deletes a **file**; add `-r` (`--recursive`) to delete a **directory**.
- `mv` both renames and moves — give the full destination path.
- Some bucket types have driver limits: e.g. a read-only SMB share may reject
  `cp` / `mv` / `rm -r`. The CLI surfaces the driver's error verbatim; that means
  the operation isn't supported by that storage backend, not a CLI bug.
- To move data **between a bucket and your local machine**, use the
  `transfer-files` skill. To mirror whole directory trees, use `sync-directories`.
