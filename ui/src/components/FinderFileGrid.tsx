import { FileGrid } from "@tokimo/ui";
import type { ComponentProps } from "react";
import { useFinder } from "../context";

type FinderFileGridViewProps = ComponentProps<typeof FileGrid>;

export function FinderFileGridView(props: FinderFileGridViewProps) {
  return <FileGrid {...props} />;
}

/** Context-aware wrapper around FileGrid for use inside FinderProvider. */
export function FinderFileGrid() {
  const { fm, highlightedPaths, view, drag, interaction } = useFinder();

  return (
    <FinderFileGridView
      nodes={fm.nodes}
      selectedPaths={fm.selectedPaths}
      viewMode={fm.viewMode as "grid" | "list"}
      renaming={fm.renaming}
      currentPath={fm.currentPath}
      folderLabels={fm.folderLabels}
      highlightedPaths={highlightedPaths}
      isNarrow={view.isListNarrow}
      onNavigateUp={
        fm.currentPath !== "/"
          ? () => view.navigateToWithCallback(fm.parentPath ?? "/")
          : undefined
      }
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
      onSelectPaths={fm.setSelectedPaths}
      onDragStart={drag.handleDragStart}
      onDragEnd={drag.handleDragEnd}
      onDropToFolder={drag.handleDropToFolder}
      draggingPaths={drag.draggingPaths}
      onVisibleEntriesChange={fm.loadStats}
    />
  );
}
