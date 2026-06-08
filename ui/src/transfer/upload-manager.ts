/**
 * Global browser upload manager — tracks XHR upload progress for files
 * dropped from the OS into the file manager.
 */

import { useSyncExternalStore } from "react";
import type { TransferProgress } from "./types";

// ─── Module-level singleton state ───

const uploads = new Map<string, TransferProgress>();
const xhrs = new Map<string, XMLHttpRequest>();
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

let snapshotRef = new Map<string, TransferProgress>();

function publishSnapshot() {
  snapshotRef = new Map(uploads);
  emit();
}

function getSnapshot() {
  return snapshotRef;
}

// ─── Internal helpers ───

async function readEntryRecursive(
  entry: FileSystemEntry,
  basePath: string,
): Promise<Array<{ file: File; relativePath: string }>> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve, reject) =>
      fileEntry.file(resolve, reject),
    );
    return [{ file, relativePath: `${basePath}${entry.name}` }];
  }
  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const results: Array<{ file: File; relativePath: string }> = [];
    let batch: FileSystemEntry[] = [];
    do {
      batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      for (const child of batch) {
        const childResults = await readEntryRecursive(
          child,
          `${basePath}${entry.name}/`,
        );
        results.push(...childResults);
      }
    } while (batch.length > 0);
    return results;
  }
  return [];
}

export async function collectDropFiles(
  e: React.DragEvent,
): Promise<Array<{ file: File; relativePath: string }>> {
  const items = e.dataTransfer.items;
  const results: Array<{ file: File; relativePath: string }> = [];

  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }

  if (entries.length > 0) {
    for (const entry of entries) {
      const files = await readEntryRecursive(entry, "");
      results.push(...files);
    }
    return results;
  }

  const fileList = e.dataTransfer.files;
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    results.push({ file: f, relativePath: f.name });
  }
  return results;
}

// ─── Public API ───

function randomUUID(): string {
  return (
    crypto.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export interface StartUploadOpts {
  fileSystemId: string;
  targetDir: string;
  dstLabel: string;
  files: Array<{ file: File; relativePath: string }>;
}

export function startUpload(opts: StartUploadOpts): string {
  const uploadId = `upload-${randomUUID()}`;
  const { fileSystemId, targetDir, dstLabel, files } = opts;
  const totalBytes = files.reduce((s, f) => s + f.file.size, 0);

  const progress: TransferProgress = {
    transferId: uploadId,
    status: "running",
    totalBytes,
    transferredBytes: 0,
    speedBps: 0,
    currentFile: files[0]?.relativePath ?? "",
    currentFileIndex: 0,
    totalFiles: files.length,
    elapsedSecs: 0,
    etaSecs: 0,
    error: null,
    srcLabel: "Local",
    dstLabel,
    isDirect: false,
    uploading: true,
  };
  uploads.set(uploadId, progress);
  publishSnapshot();

  const startTime = Date.now();
  let prevBytes = 0;
  let prevTime = startTime;
  const completedBytes: number[] = new Array(files.length).fill(0);

  const updateProgress = (
    fileIdx: number,
    loaded: number,
    extra?: Partial<TransferProgress>,
  ) => {
    completedBytes[fileIdx] = loaded;
    const transferred = completedBytes.reduce((a, b) => a + b, 0);
    const now = Date.now();
    const elapsedSecs = (now - startTime) / 1000;
    const dtMs = now - prevTime;
    let speed = 0;
    if (dtMs > 200) {
      speed = ((transferred - prevBytes) / dtMs) * 1000;
      prevBytes = transferred;
      prevTime = now;
    } else {
      speed = uploads.get(uploadId)?.speedBps ?? 0;
    }
    const remaining = totalBytes - transferred;
    const eta = speed > 0 ? remaining / speed : 0;

    const snap: TransferProgress = {
      ...progress,
      transferredBytes: transferred,
      speedBps: speed,
      currentFile: files[fileIdx]?.relativePath ?? "",
      currentFileIndex: fileIdx,
      elapsedSecs,
      etaSecs: eta,
      ...extra,
    };
    uploads.set(uploadId, snap);
    publishSnapshot();
  };

  const uploadSequential = async () => {
    for (let i = 0; i < files.length; i++) {
      const { file, relativePath } = files[i];
      const parts = relativePath.split("/");

      if (parts.length > 1) {
        const parentRelative = parts.slice(0, -1).join("/");
        const parentPath =
          targetDir === "/"
            ? `/${parentRelative}`
            : `${targetDir}/${parentRelative}`;
        try {
          await fetch(`/api/vfs/${encodeURIComponent(fileSystemId)}/mkdir`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ path: parentPath }),
          });
        } catch {
          /* directory may already exist */
        }
      }

      const filename = parts[parts.length - 1];
      const dirPath =
        parts.length > 1
          ? targetDir === "/"
            ? `/${parts.slice(0, -1).join("/")}`
            : `${targetDir}/${parts.slice(0, -1).join("/")}`
          : targetDir;

      updateProgress(i, completedBytes[i], { currentFile: relativePath });

      try {
        await new Promise<void>((resolve, reject) => {
          const url = `/api/vfs/${encodeURIComponent(fileSystemId)}/upload?path=${encodeURIComponent(dirPath)}&filename=${encodeURIComponent(filename)}`;
          const xhr = new XMLHttpRequest();
          xhrs.set(`${uploadId}:${i}`, xhr);
          xhr.open("POST", url);
          xhr.withCredentials = true;

          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) updateProgress(i, ev.loaded);
          };

          xhr.onload = () => {
            xhrs.delete(`${uploadId}:${i}`);
            if (xhr.status >= 200 && xhr.status < 300) {
              completedBytes[i] = file.size;
              resolve();
            } else {
              reject(new Error(`HTTP ${xhr.status}`));
            }
          };

          xhr.onerror = () => {
            xhrs.delete(`${uploadId}:${i}`);
            reject(new Error("Network error"));
          };

          const form = new FormData();
          form.append("file", file);
          xhr.send(form);
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        updateProgress(i, completedBytes[i], { status: "failed", error: msg });
        return;
      }
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const transferred = completedBytes.reduce((a, b) => a + b, 0);
    const snap: TransferProgress = {
      ...uploads.get(uploadId)!,
      status: "completed",
      transferredBytes: transferred,
      currentFileIndex: files.length - 1,
      elapsedSecs: elapsed,
      etaSecs: 0,
    };
    uploads.set(uploadId, snap);
    publishSnapshot();
  };

  uploadSequential();
  return uploadId;
}

export function cancelUpload(uploadId: string) {
  for (const [key, xhr] of xhrs) {
    if (key.startsWith(`${uploadId}:`)) {
      xhr.abort();
      xhrs.delete(key);
    }
  }
  const snap = uploads.get(uploadId);
  if (snap && snap.status === "running") {
    uploads.set(uploadId, { ...snap, status: "cancelled" });
    publishSnapshot();
  }
}

export function useUploadProgress(): Map<string, TransferProgress> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function isLocalUpload(transferId: string): boolean {
  return transferId.startsWith("upload-");
}
