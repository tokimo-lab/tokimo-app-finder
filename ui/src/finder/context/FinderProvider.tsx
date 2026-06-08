import type { FileNode, ViewMode } from "@tokimo/ui";
import { useCallback, useRef, useState } from "react";
import { api } from "../../generated/rust-api";
import { useFileContextMenu } from "../components/FileContextMenu";
import { TransferToSubmenu } from "../components/TransferToSubmenu";
import { useFinderColumn } from "../hooks/use-finder-column";
import { useFinderData } from "../hooks/use-finder-data";
import { useFinderDragDrop } from "../hooks/use-finder-drag-drop";
import { useFinderInteractions } from "../hooks/use-finder-interactions";
import { useFinderModals } from "../hooks/use-finder-modals";
import { useFinderMutations } from "../hooks/use-finder-mutations";
import { useFinderRename } from "../hooks/use-finder-rename";
import { useFinderTransfer } from "../hooks/use-finder-transfer";
import { useFinderView } from "../hooks/use-finder-view";
import type { FinderApi } from "./context";
import { FinderContext } from "./context";

interface FinderProviderProps {
  fileSystemId?: string;
  initialPath: string;
  readOnly: boolean;
  sourceType?: string;
  sourceLabel?: string;
  onClose?: () => void;
  onViewModeChange?: (mode: ViewMode) => void;
  onSortChange?: (
    sortBy: "name" | "size" | "modifiedAt",
    sortDir: "asc" | "desc",
  ) => void;
  onNavigate?: (path: string) => void;
  children: React.ReactNode;
}

export function FinderProvider({
  fileSystemId,
  initialPath,
  readOnly,
  sourceType,
  sourceLabel,
  onClose,
  onViewModeChange,
  onSortChange,
  onNavigate,
  children,
}: FinderProviderProps) {
  // 1. Column leaf path
  const { columnLeafPath, setColumnLeafPath } = useFinderColumn();

  // 2. Core data: fm + favorites
  const { fm, viewPrefs, favSet, highlightedPaths, refetchFavs } =
    useFinderData({ fileSystemId, initialPath, sourceLabel, sourceType });

  // 3. View helpers (layout / nav callbacks, responsive size)
  const {
    isListNarrow,
    listAreaRef,
    navigateToWithCallback,
    syncRouteOnly,
    effectivePath,
    totalSize,
    selectedSize,
    handleSetViewMode,
    handleSetSortBy,
    handleSetSortDir,
    handleSetShowHidden,
  } = useFinderView({
    fm,
    viewPrefs,
    columnLeafPath,
    onNavigate,
    onViewModeChange,
    onSortChange,
  });

  // 4. Modal flags
  const modalsState = useFinderModals();

  // 5. Sub-column refresh — created here so both transfer & drag-drop can share it
  const [subColumnRefreshKey, setSubColumnRefreshKey] = useState(0);
  const bumpSubColumnRefresh = useCallback(
    () => setSubColumnRefreshKey((k) => k + 1),
    [],
  );

  // 6. Transfer — needs bumpSubColumnRefresh
  const { createTransfer, markPendingAndCheck } = useFinderTransfer({
    fm,
    bumpSubColumnRefresh,
  });

  // 7. Move mutation — created once here so both drag-drop and paste share it
  const moveMut = api.vfs.move.useMutation({ onSuccess: fm.refresh });

  // 8. Context menu target ref — shared between interactions (sets) and mutations (reads)
  const contextMenuTarget = useRef<FileNode | null>(null);

  // 9. Mutations
  const mutations = useFinderMutations({
    fm,
    fileSystemId,
    sourceType,
    sourceLabel,
    readOnly,
    createTransfer,
    markPendingAndCheck,
    setShowNewTextFile: modalsState.setShowNewTextFile,
    setArchivePreview: modalsState.setArchivePreview,
    setShowCompress: modalsState.setShowCompress,
    favSet,
    refetchFavs,
    contextMenuTarget,
  });

  // 10. Drag & Drop — receives moveMut from above
  const dragDrop = useFinderDragDrop({
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
  });

  // 11. Rename
  const renameHook = useFinderRename({ fm, fileSystemId, readOnly });

  // 12. Context menu (needs JSX for TransferToSubmenu — must be in .tsx file)
  const ctxMenu = useFileContextMenu(
    {
      ...mutations.getContextMenuNodeActions(),
      getTransferToContent: (node: FileNode, _selectedCount: number) => {
        if (!fileSystemId) return null;
        const selectedPaths =
          fm.selectedPaths.size > 0 && fm.selectedPaths.has(node.path)
            ? fm.selectedPaths
            : new Set([node.path]);
        const transferNodes = fm.nodes.filter((n) => selectedPaths.has(n.path));
        return (
          <TransferToSubmenu
            nodes={transferNodes}
            sourceFileSystemId={fileSystemId}
            onTransfer={(dstFsId, dstFsLabel, dstPath) =>
              mutations.handleTransferTo(
                dstFsId,
                dstFsLabel,
                dstPath,
                transferNodes,
              )
            }
          />
        );
      },
    },
    fm.clipboard,
  );

  // 13. Interactions (clicks, keyboard, browser paste)
  const interactions = useFinderInteractions({
    fm,
    fileSystemId,
    readOnly,
    handleOpen: mutations.handleOpen,
    handlePaste: mutations.handlePaste,
    handleRequestDelete: mutations.handleRequestDelete,
    cancelRenameTimer: renameHook.cancelRenameTimer,
    scheduleRename: renameHook.scheduleRename,
    contextMenuTarget,
    ctxMenu,
  });

  const finderApi: FinderApi = {
    fm,
    fileSystemId,
    sourceType,
    sourceLabel,
    readOnly,
    highlightedPaths,
    onClose,
    onViewModeChange,
    onSortChange,

    view: {
      viewPrefs: {
        ...viewPrefs,
        setViewMode: handleSetViewMode,
        setSortBy: handleSetSortBy,
        setSortDir: handleSetSortDir,
        setShowHidden: handleSetShowHidden,
      },
      isListNarrow,
      listAreaRef,
      navigateToWithCallback,
      syncRouteOnly,
      effectivePath,
      totalSize,
      selectedSize,
    },

    drag: {
      draggingPaths: dragDrop.draggingPaths,
      isDragOver: dragDrop.isDragOver,
      isInternalDragRef: dragDrop.isInternalDragRef,
      subColumnRefreshKey,
      handleDragStart: dragDrop.handleDragStart,
      handleDragEnd: dragDrop.handleDragEnd,
      handleDropToPath: dragDrop.handleDropToPath,
      handleDropToFolder: dragDrop.handleDropToFolder,
      handleContainerDragOver: dragDrop.handleContainerDragOver,
      handleContainerDragEnter: dragDrop.handleContainerDragEnter,
      handleContainerDragLeave: dragDrop.handleContainerDragLeave,
      handleContainerDrop: dragDrop.handleContainerDrop,
    },

    modals: {
      showNewFolder: fm.showNewFolder,
      showNewTextFile: modalsState.showNewTextFile,
      setShowNewTextFile: modalsState.setShowNewTextFile,
      archivePreview: modalsState.archivePreview,
      setArchivePreview: modalsState.setArchivePreview,
      showCompress: modalsState.showCompress,
      setShowCompress: modalsState.setShowCompress,
    },

    interaction: {
      handleItemClick: interactions.handleItemClick,
      handleItemDoubleClick: interactions.handleItemDoubleClick,
      handleItemContextMenu: interactions.handleItemContextMenu,
      handleEmptyContextMenu: interactions.handleEmptyContextMenu,
      handleInlineRename: renameHook.handleInlineRename,
      cancelRenameTimer: renameHook.cancelRenameTimer,
      handleKeyDown: interactions.handleKeyDown,
      handleBrowserPaste: interactions.handleBrowserPaste,
      handlePaste: mutations.handlePaste,
      handleRequestDelete: mutations.handleRequestDelete,
      handleCreateFolder: mutations.handleCreateFolder,
      handleCreateTextFile: mutations.handleCreateTextFile,
      contextMenuPortal: ctxMenu.contextMenu,
    },

    column: {
      columnLeafPath,
      setColumnLeafPath,
    },

    mutations: {
      mkdirIsPending: mutations.mkdirMut.isPending,
      writeFileIsPending: mutations.writeFileMut.isPending,
    },
  };

  return (
    <FinderContext.Provider value={finderApi}>
      {children}
    </FinderContext.Provider>
  );
}
