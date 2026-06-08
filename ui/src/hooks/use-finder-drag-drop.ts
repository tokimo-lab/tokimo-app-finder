import { useWindowActions } from "@tokimo/sdk";
import type { FileNode } from "@tokimo/ui";
import { getParentPath } from "@tokimo/ui";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { UseFileManagerReturn } from "../components/useFileManager";
import {
  buildDragPayload,
  buildTransferRequest,
  collectDropFiles,
  hasDragPayload,
  isCrossStorageDrop,
  readDragPayload,
  startUpload,
  writeDragPayload,
} from "../hooks/stub";
import { useMessage } from "../hooks/use-message";
import type { CreateTransferRequest } from "../types/transfer";

export interface MoveMutLike {
  mutate: (
    args: { from: string; toDir: string; fileSystemId: string },
    opts: { onSuccess: () => void },
  ) => void;
}

interface UseFinderDragDropOptions {
  fm: UseFileManagerReturn;
  fileSystemId?: string;
  sourceType?: string;
  sourceLabel?: string;
  readOnly: boolean;
  columnLeafPath: string | null;
  bumpSubColumnRefresh: () => void;
  createTransfer: (req: CreateTransferRequest) => Promise<string>;
  markPendingAndCheck: (tid: string) => void;
  moveMut: MoveMutLike;
}

export function useFinderDragDrop({
  fm,
  fileSystemId,
  sourceType,
  sourceLabel,
  readOnly,
  columnLeafPath,
  bumpSubColumnRefresh,
  createTransfer,
  markPendingAndCheck,
  moveMut,
}: UseFinderDragDropOptions) {
  const { t } = useTranslation();
  const windowManager = useWindowActions();
  const message = useMessage();

  const [draggingPaths, setDraggingPaths] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const dragEnterCount = useRef(0);
  const isInternalDragRef = useRef(false);

  const handleDragStart = useCallback(
    (node: FileNode, contextNodes: FileNode[], e: React.DragEvent) => {
      if (readOnly) return;

      let dragNodes: FileNode[];
      if (fm.selectedPaths.has(node.path)) {
        dragNodes = contextNodes.filter((n) => fm.selectedPaths.has(n.path));
        if (dragNodes.length === 0) dragNodes = [node];
      } else {
        if (fm.nodes.some((n) => n.path === node.path)) {
          fm.selectOne(node.path);
        }
        dragNodes = [node];
      }

      setDraggingPaths(new Set(dragNodes.map((n) => n.path)));
      isInternalDragRef.current = true;

      if (fileSystemId) {
        const payload = buildDragPayload(
          "file-system",
          fileSystemId,
          sourceLabel ?? sourceType ?? fileSystemId,
          dragNodes,
        );
        writeDragPayload(e, payload);
      }
    },
    [fm, readOnly, fileSystemId, sourceLabel, sourceType],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingPaths(new Set());
    isInternalDragRef.current = false;
  }, []);

  const hasNativeFiles = useCallback((e: React.DragEvent) => {
    if (hasDragPayload(e)) return false;
    return e.dataTransfer.types.includes("Files");
  }, []);

  const handleDropToPath = useCallback(
    (targetDir: string, e: React.DragEvent) => {
      setIsDragOver(false);
      dragEnterCount.current = 0;
      isInternalDragRef.current = false;
      if (readOnly || !fileSystemId) return;

      const payload = readDragPayload(e);

      // ── Cross-storage Tokimo transfer ──
      if (payload && isCrossStorageDrop(payload, "file-system", fileSystemId)) {
        const req = buildTransferRequest(
          payload,
          "file-system",
          fileSystemId,
          sourceLabel ?? sourceType ?? fileSystemId,
          targetDir,
        );
        createTransfer(req)
          .then((transferId) => {
            markPendingAndCheck(transferId);
            windowManager.openWindow({
              type: "transfer",
              title: t("transfer.title"),
              route: `/transfers/${transferId}`,
              metadata: { transferId },
            });
          })
          .catch((err: Error) => message.error(err.message));
        setDraggingPaths(new Set());
        return;
      }

      // ── Same-storage move ──
      if (payload) {
        let moved = 0;
        for (const f of payload.files) {
          const parent = getParentPath(f.path);
          if (parent === targetDir) continue;
          if (
            f.isDirectory &&
            (f.path === targetDir || targetDir.startsWith(`${f.path}/`))
          ) {
            continue;
          }
          moveMut.mutate(
            { from: f.path, toDir: targetDir, fileSystemId },
            {
              onSuccess: () => {
                fm.refresh();
                bumpSubColumnRefresh();
              },
            },
          );
          moved++;
        }
        setDraggingPaths(new Set());
        void moved;
        return;
      }

      // ── Native OS file / folder upload ──
      if (e.dataTransfer.types.includes("Files")) {
        const dstLabel = sourceLabel ?? sourceType ?? fileSystemId;
        collectDropFiles(e).then((files) => {
          if (files.length === 0) return;
          const uploadId = startUpload({
            fileSystemId,
            targetDir,
            dstLabel,
            files,
          });
          markPendingAndCheck(uploadId);
          windowManager.openWindow({
            type: "transfer",
            title: t("transfer.title"),
            route: `/transfers/${uploadId}`,
            metadata: { transferId: uploadId },
          });
        });
        setDraggingPaths(new Set());
      }
    },
    [
      readOnly,
      fileSystemId,
      moveMut,
      fm,
      sourceLabel,
      sourceType,
      createTransfer,
      windowManager,
      t,
      message,
      markPendingAndCheck,
      bumpSubColumnRefresh,
    ],
  );

  const handleDropToFolder = useCallback(
    (targetNode: FileNode, e: React.DragEvent) => {
      if (!targetNode.isDirectory) return;
      handleDropToPath(targetNode.path, e);
    },
    [handleDropToPath],
  );

  const handleContainerDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!fileSystemId || readOnly) return;
      if (isInternalDragRef.current) return;
      if (hasDragPayload(e) || hasNativeFiles(e)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }
    },
    [fileSystemId, readOnly, hasNativeFiles],
  );

  const handleContainerDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (!fileSystemId || readOnly) return;
      if (isInternalDragRef.current) return;
      dragEnterCount.current++;
      if (hasDragPayload(e) || hasNativeFiles(e)) {
        e.preventDefault();
        setIsDragOver(true);
      }
    },
    [fileSystemId, readOnly, hasNativeFiles],
  );

  const handleContainerDragLeave = useCallback(() => {
    dragEnterCount.current--;
    if (dragEnterCount.current <= 0) {
      dragEnterCount.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleContainerDrop = useCallback(
    (e: React.DragEvent) => {
      if (!fileSystemId || readOnly) return;
      const targetDir =
        fm.viewMode === "column" && columnLeafPath
          ? columnLeafPath
          : fm.currentPath;
      e.preventDefault();
      handleDropToPath(targetDir, e);
    },
    [
      fileSystemId,
      readOnly,
      fm.viewMode,
      fm.currentPath,
      columnLeafPath,
      handleDropToPath,
    ],
  );

  return {
    draggingPaths,
    isDragOver,
    isInternalDragRef,
    handleDragStart,
    handleDragEnd,
    handleDropToPath,
    handleDropToFolder,
    handleContainerDragOver,
    handleContainerDragEnter,
    handleContainerDragLeave,
    handleContainerDrop,
  };
}
