import type { FileNode, ViewMode } from "@tokimo/ui";
import type { MutableRefObject } from "react";
import { createContext, useContext } from "react";
import type { UseFileManagerReturn } from "../components/useFileManager";
import type { FileManagerViewPrefs } from "../components/useFileManagerViewPrefs";

export interface FinderModalsState {
  showNewFolder: boolean;
  showNewTextFile: boolean;
  setShowNewTextFile: (open: boolean) => void;
  archivePreview: { path: string; name: string } | null;
  setArchivePreview: (v: { path: string; name: string } | null) => void;
  showCompress: boolean;
  setShowCompress: (open: boolean) => void;
}

export interface FinderDragState {
  draggingPaths: Set<string>;
  isDragOver: boolean;
  isInternalDragRef: MutableRefObject<boolean>;
  subColumnRefreshKey: number;
  handleDragStart: (
    node: FileNode,
    contextNodes: FileNode[],
    e: React.DragEvent,
  ) => void;
  handleDragEnd: () => void;
  handleDropToPath: (targetDir: string, e: React.DragEvent) => void;
  handleDropToFolder: (targetNode: FileNode, e: React.DragEvent) => void;
  handleContainerDragOver: (e: React.DragEvent) => void;
  handleContainerDragEnter: (e: React.DragEvent) => void;
  handleContainerDragLeave: () => void;
  handleContainerDrop: (e: React.DragEvent) => void;
}

export interface FinderInteractionState {
  handleItemClick: (node: FileNode, e: React.MouseEvent) => void;
  handleItemDoubleClick: (node: FileNode) => void;
  handleItemContextMenu: (node: FileNode, e: React.MouseEvent) => void;
  handleEmptyContextMenu: (e: React.MouseEvent) => void;
  handleInlineRename: (oldPath: string, newName: string) => void;
  cancelRenameTimer: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleBrowserPaste: (e: React.ClipboardEvent) => void;
  handlePaste: () => void;
  handleRequestDelete: () => void;
  handleCreateFolder: (name: string) => void;
  handleCreateTextFile: (name: string) => void;
  /** Context menu portal element */
  contextMenuPortal: React.ReactNode;
}

export interface FinderColumnState {
  columnLeafPath: string | null;
  setColumnLeafPath: (path: string | null) => void;
}

export interface FinderViewState {
  viewPrefs: FileManagerViewPrefs;
  isListNarrow: boolean;
  listAreaRef: (el: HTMLDivElement | null) => void;
  navigateToWithCallback: (path: string) => void;
  syncRouteOnly: (path: string) => void;
  effectivePath: string;
  totalSize: number;
  selectedSize: number;
}

export interface FinderMutationState {
  mkdirIsPending: boolean;
  writeFileIsPending: boolean;
}

export interface FinderApi {
  fm: UseFileManagerReturn;
  fileSystemId?: string;
  sourceType?: string;
  sourceLabel?: string;
  readOnly: boolean;
  highlightedPaths?: Set<string>;
  onClose?: () => void;
  onViewModeChange?: (mode: ViewMode) => void;
  onSortChange?: (
    sortBy: "name" | "size" | "modifiedAt",
    sortDir: "asc" | "desc",
  ) => void;

  view: FinderViewState;
  drag: FinderDragState;
  modals: FinderModalsState;
  interaction: FinderInteractionState;
  column: FinderColumnState;
  mutations: FinderMutationState;
}

export const FinderContext = createContext<FinderApi | null>(null);

export function useFinder(): FinderApi {
  const ctx = useContext(FinderContext);
  if (!ctx) throw new Error("useFinder must be used within FinderProvider");
  return ctx;
}
