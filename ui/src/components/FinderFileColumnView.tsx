import { FileColumnView, type FileNode } from "@tokimo/ui";
import { useCallback } from "react";
import { api } from "../api/client";
import { useFinder } from "../context";
import { hasDragPayload } from "../transfer/drag-drop";

/** Context-aware wrapper around FileColumnView for use inside FinderProvider. */
export function FinderFileColumnView() {
  const {
    fm,
    fileSystemId,
    highlightedPaths,
    view,
    drag,
    interaction,
    column,
  } = useFinder();

  const fetchDirectory = useCallback(
    async (dirPath: string): Promise<FileNode[]> => {
      if (!fileSystemId) return [];
      const res = await api.vfs.browse.fetch({ fileSystemId, path: dirPath });
      return (res.entries ?? []) as FileNode[];
    },
    [fileSystemId],
  );

  const acceptsExternalDrop = useCallback(
    (e: React.DragEvent) => hasDragPayload(e),
    [],
  );

  const onExternalDropToDir = useCallback(
    (dstDirPath: string, e: React.DragEvent) => {
      drag.handleDropToPath(dstDirPath, e);
    },
    [drag],
  );

  return (
    <FileColumnView
      fetchDirectory={fetchDirectory}
      currentPath={fm.currentPath}
      nodes={fm.nodes}
      selectedPaths={fm.selectedPaths}
      renaming={fm.renaming}
      sortBy={fm.sortBy}
      sortDir={fm.sortDir}
      showHidden={fm.showHidden}
      folderLabels={fm.folderLabels}
      highlightedPaths={highlightedPaths}
      onNavigate={view.navigateToWithCallback}
      onSyncRoute={view.syncRouteOnly}
      onLeafPathChange={column.setColumnLeafPath}
      onItemClick={interaction.handleItemClick}
      onItemDoubleClick={interaction.handleItemDoubleClick}
      onItemContextMenu={interaction.handleItemContextMenu}
      onEmptyContextMenu={interaction.handleEmptyContextMenu}
      onRenameSubmit={interaction.handleInlineRename}
      onRenameCancel={() => fm.setRenaming(null)}
      onClearSelection={() => {
        interaction.cancelRenameTimer();
        fm.clearSelection();
      }}
      onDragStart={drag.handleDragStart}
      onDragEnd={drag.handleDragEnd}
      onDropToFolder={drag.handleDropToFolder}
      onDropToDir={drag.handleDropToPath}
      acceptsExternalDrop={acceptsExternalDrop}
      onExternalDropToDir={onExternalDropToDir}
      draggingPaths={drag.draggingPaths}
      refreshKey={drag.subColumnRefreshKey}
      onVisibleEntriesChange={fm.loadStats}
    />
  );
}
