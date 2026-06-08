/**
 * Drag-drop helpers stub — transfer system not available in standalone app.
 */
import type { FileNode } from "@tokimo/ui";
import type { CreateTransferRequest } from "./types";

export interface DragPayload {
  kind: string;
  sourceId: string;
  sourceLabel: string;
  files: FileNode[];
}

export function buildDragPayload(
  _kind: string,
  _sourceId: string,
  _sourceLabel: string,
  _files: FileNode[],
): DragPayload {
  return { kind: "file-system", sourceId: "", sourceLabel: "", files: [] };
}

export function writeDragPayload(
  _e: React.DragEvent,
  _payload: DragPayload,
): void {
  /* no-op */
}

export function readDragPayload(_e: React.DragEvent): DragPayload | null {
  return null;
}

export function hasDragPayload(_e: React.DragEvent): boolean {
  return false;
}

export function isCrossStorageDrop(
  _payload: DragPayload,
  _kind: string,
  _targetId: string,
): boolean {
  return false;
}

export function buildTransferRequest(
  _payload: DragPayload,
  _kind: string,
  _targetId: string,
  _targetLabel: string,
  _targetDir: string,
): CreateTransferRequest {
  return {
    src: { kind: "fileSystem", id: "" },
    dst: { kind: "fileSystem", id: "" },
    srcLabel: "",
    dstLabel: "",
    files: [],
  };
}
