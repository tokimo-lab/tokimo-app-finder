import type { ViewMode } from "@tokimo/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UseFileManagerReturn } from "../components/useFileManager";
import type { FileManagerViewPrefs } from "../components/useFileManagerViewPrefs";

interface UseFinderViewOptions {
  fm: UseFileManagerReturn;
  viewPrefs: FileManagerViewPrefs;
  columnLeafPath: string | null;
  onNavigate?: (path: string) => void;
  onViewModeChange?: (mode: ViewMode) => void;
  onSortChange?: (
    sortBy: "name" | "size" | "modifiedAt",
    sortDir: "asc" | "desc",
  ) => void;
}

export function useFinderView({
  fm,
  viewPrefs,
  columnLeafPath,
  onNavigate,
  onViewModeChange,
  onSortChange,
}: UseFinderViewOptions) {
  const [isListNarrow, setIsListNarrow] = useState(false);
  const listAreaRoRef = useRef<ResizeObserver | null>(null);

  const listAreaRef = useCallback((el: HTMLDivElement | null) => {
    listAreaRoRef.current?.disconnect();
    listAreaRoRef.current = null;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setIsListNarrow(w > 0 && w < 600);
    });
    ro.observe(el);
    listAreaRoRef.current = ro;
  }, []);

  useEffect(() => () => listAreaRoRef.current?.disconnect(), []);

  const navigateToWithCallback = useCallback(
    (path: string) => {
      fm.navigateTo(path);
      onNavigate?.(path);
    },
    [fm, onNavigate],
  );

  const syncRouteOnly = useCallback(
    (path: string) => {
      onNavigate?.(path);
    },
    [onNavigate],
  );

  const effectivePath =
    fm.viewMode === "column" && columnLeafPath
      ? columnLeafPath
      : fm.currentPath;

  const totalSize = fm.nodes.reduce(
    (sum, n) => sum + (n.size && n.size > 0 ? n.size : 0),
    0,
  );

  const selectedSize = fm.nodes
    .filter((n) => fm.selectedPaths.has(n.path))
    .reduce((sum, n) => sum + (n.size && n.size > 0 ? n.size : 0), 0);

  const handleSetViewMode = useCallback(
    (mode: ViewMode) => {
      if (fm.viewMode === "column" && mode !== "column") {
        const target = columnLeafPath ?? fm.currentPath;
        if (target !== fm.currentPath) {
          navigateToWithCallback(target);
        }
      }
      viewPrefs.setViewMode(mode);
      onViewModeChange?.(mode);
    },
    [
      fm.viewMode,
      fm.currentPath,
      columnLeafPath,
      navigateToWithCallback,
      viewPrefs,
      onViewModeChange,
    ],
  );

  const handleSetSortBy = useCallback(
    (by: "name" | "size" | "modifiedAt") => {
      viewPrefs.setSortBy(by);
      onSortChange?.(by, fm.sortDir);
    },
    [viewPrefs, fm.sortDir, onSortChange],
  );

  const handleSetSortDir = useCallback(
    (dir: "asc" | "desc") => {
      viewPrefs.setSortDir(dir);
      onSortChange?.(fm.sortBy, dir);
    },
    [viewPrefs, fm.sortBy, onSortChange],
  );

  const handleSetShowHidden = useCallback(
    (show: boolean) => {
      viewPrefs.setShowHidden(show);
    },
    [viewPrefs],
  );

  return {
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
  };
}
