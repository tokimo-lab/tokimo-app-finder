import type { FileNode } from "@tokimo/ui";
import { useCallback, useRef } from "react";
import { api } from "../../generated/rust-api";
import { useMessage } from "../../system/notifications/useMessage";
import type { UseFileManagerReturn } from "../components/useFileManager";

interface UseFinderInteractionsOptions {
  fm: UseFileManagerReturn;
  fileSystemId?: string;
  readOnly: boolean;
  handleOpen: (node: FileNode) => void;
  handlePaste: () => void;
  handleRequestDelete: () => void;
  cancelRenameTimer: () => void;
  scheduleRename: (node: FileNode) => void;
  contextMenuTarget: React.MutableRefObject<FileNode | null>;
  ctxMenu: {
    openNodeMenu: (
      e: React.MouseEvent,
      node: FileNode,
      selectedCount: number,
    ) => void;
    openEmptyMenu: (e: React.MouseEvent) => void;
    contextMenu: React.ReactNode;
  };
}

export function useFinderInteractions({
  fm,
  fileSystemId,
  readOnly,
  handleOpen,
  handlePaste,
  handleRequestDelete,
  cancelRenameTimer,
  scheduleRename,
  contextMenuTarget,
  ctxMenu,
}: UseFinderInteractionsOptions) {
  const message = useMessage();
  const lastItemClickRef = useRef<{ path: string; time: number } | null>(null);
  const lastOpenTimeRef = useRef(0);

  const handleItemClick = useCallback(
    (node: FileNode, e: React.MouseEvent) => {
      cancelRenameTimer();

      if (e.ctrlKey || e.metaKey) {
        fm.toggleSelect(node.path);
        lastItemClickRef.current = null;
        return;
      }
      if (e.shiftKey) {
        fm.selectRange(node.path);
        lastItemClickRef.current = null;
        return;
      }

      const now = Date.now();
      const last = lastItemClickRef.current;

      // Double-tap detection: same item clicked within 500ms → open
      if (last && last.path === node.path && now - last.time < 500) {
        lastItemClickRef.current = null;
        lastOpenTimeRef.current = now;
        handleOpen(node);
        return;
      }

      lastItemClickRef.current = { path: node.path, time: now };

      if (
        !readOnly &&
        fm.selectedPaths.size === 1 &&
        fm.selectedPaths.has(node.path)
      ) {
        // Already selected single item → slow second click → delayed rename
        scheduleRename(node);
      } else {
        fm.selectOne(node.path);
      }
    },
    [fm, readOnly, cancelRenameTimer, handleOpen, scheduleRename],
  );

  const handleItemDoubleClick = useCallback(
    (node: FileNode) => {
      cancelRenameTimer();
      // Skip if already opened by click-based double-tap detection
      if (Date.now() - lastOpenTimeRef.current < 500) return;
      handleOpen(node);
    },
    [handleOpen, cancelRenameTimer],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: contextMenuTarget is a stable ref
  const handleItemContextMenu = useCallback(
    (node: FileNode, e: React.MouseEvent) => {
      e.preventDefault();
      cancelRenameTimer();
      contextMenuTarget.current = node;
      if (!fm.selectedPaths.has(node.path)) {
        fm.selectOne(node.path);
      }
      ctxMenu.openNodeMenu(e, node, fm.selectedPaths.size || 1);
    },
    [fm, ctxMenu, cancelRenameTimer],
  );

  const handleEmptyContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      cancelRenameTimer();
      fm.clearSelection();
      ctxMenu.openEmptyMenu(e);
    },
    [fm, ctxMenu, cancelRenameTimer],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (isTyping) return;

      if (e.key === "F2" && fm.selectedPaths.size === 1 && !readOnly) {
        e.preventDefault();
        const path = Array.from(fm.selectedPaths)[0];
        fm.setRenaming(path);
      }
      if (e.key === "Delete" && fm.selectedPaths.size > 0 && !readOnly) {
        e.preventDefault();
        handleRequestDelete();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        fm.selectAll();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "c" &&
        fm.selectedPaths.size > 0
      ) {
        e.preventDefault();
        fm.setClipboard("copy");
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "x" &&
        !readOnly &&
        fm.selectedPaths.size > 0
      ) {
        e.preventDefault();
        fm.setClipboard("cut");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && !readOnly) {
        if (fm.clipboard) {
          e.preventDefault();
          handlePaste();
        }
      }
    },
    [fm, readOnly, handleRequestDelete, handlePaste],
  );

  const handleBrowserPaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (readOnly || !fileSystemId) return;
      const items = e.clipboardData?.files;
      if (!items || items.length === 0) return;

      e.preventDefault();
      for (const file of Array.from(items)) {
        api.vfs.uploadFile
          .mutate({
            fileSystemId,
            path: fm.currentPath,
            filename: file.name,
            file,
          })
          .then(() => fm.refresh())
          .catch((err: Error) => message.error(err.message));
      }
    },
    [readOnly, fileSystemId, fm, message],
  );

  return {
    handleItemClick,
    handleItemDoubleClick,
    handleItemContextMenu,
    handleEmptyContextMenu,
    handleKeyDown,
    handleBrowserPaste,
    contextMenuPortal: ctxMenu.contextMenu,
  };
}
