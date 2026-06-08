/**
 * Cross-storage drag-drop helpers.
 */

import type { FileNode } from "@tokimo/ui";
import type {
  CreateTransferRequest,
  DragFileEntry,
  DragTransferPayload,
  TransferEndpoint,
} from "./types";
import { TRANSFER_MIME } from "./types";

export function writeDragPayload(
  e: React.DragEvent,
  payload: DragTransferPayload,
) {
  e.dataTransfer.setData(TRANSFER_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "copyMove";
}

export function buildDragPayload(
  sourceKind: DragTransferPayload["sourceKind"],
  sourceId: string,
  sourceLabel: string,
  nodes: FileNode[],
): DragTransferPayload {
  const files: DragFileEntry[] = nodes.map((n) => ({
    path: n.path,
    name: n.name,
    size: n.stat?.size ?? n.size ?? 0,
    isDirectory: !!n.isDirectory,
  }));
  return {
    sourceKind,
    ...(sourceKind === "file-system"
      ? { fileSystemId: sourceId }
      : { sshTerminalId: sourceId }),
    sourceLabel,
    files,
  };
}

export function readDragPayload(
  e: React.DragEvent,
): DragTransferPayload | null {
  const raw = e.dataTransfer.getData(TRANSFER_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragTransferPayload;
  } catch {
    return null;
  }
}

export function hasDragPayload(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(TRANSFER_MIME);
}

function toEndpoint(payload: DragTransferPayload): TransferEndpoint {
  if (payload.sourceKind === "file-system") {
    return { kind: "fileSystem", id: payload.fileSystemId! };
  }
  return { kind: "sshTerminal", id: payload.sshTerminalId! };
}

export function buildTransferRequest(
  payload: DragTransferPayload,
  dstKind: DragTransferPayload["sourceKind"],
  dstId: string,
  dstLabel: string,
  dstPath: string,
): CreateTransferRequest {
  const src = toEndpoint(payload);
  const dst: TransferEndpoint =
    dstKind === "file-system"
      ? { kind: "fileSystem", id: dstId }
      : { kind: "sshTerminal", id: dstId };

  const files = payload.files.map((f) => {
    const dstFilePath = dstPath === "/" ? `/${f.name}` : `${dstPath}/${f.name}`;
    return {
      srcPath: f.path,
      dstPath: dstFilePath,
      size: f.size,
      isDirectory: f.isDirectory,
    };
  });

  return { src, dst, srcLabel: payload.sourceLabel, dstLabel, files };
}

export function isCrossStorageDrop(
  payload: DragTransferPayload,
  currentKind: DragTransferPayload["sourceKind"],
  currentId: string,
): boolean {
  if (payload.sourceKind !== currentKind) return true;
  if (payload.sourceKind === "file-system") {
    return payload.fileSystemId !== currentId;
  }
  return payload.sshTerminalId !== currentId;
}
