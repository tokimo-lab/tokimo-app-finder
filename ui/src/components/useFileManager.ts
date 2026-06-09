/** 通用文件管理器状态管理 hook — 基于路径的文件系统导航 */

import {
  type Clipboard,
  type FileNode,
  type SortBy,
  type SortDir,
  sortNodes,
  type ViewMode,
} from "@tokimo/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SourceStatEntry } from "../api/client";
import { api } from "../api/client";
import {
  clearFileClipboard,
  setFileClipboard,
  useFileClipboard,
} from "./file-clipboard";

export interface UseFileManagerOptions {
  /** 文件系统 ID */
  fileSystemId?: string;
  /** 初始路径 */
  initialPath?: string;
  /** Human-readable label for the source (e.g. "smb://10.0.0.1/media") */
  sourceLabel?: string;
  /** 视图模式（由 useFileManagerViewPrefs 管理） */
  viewMode: ViewMode;
  /** 排序字段（由 useFileManagerViewPrefs 管理） */
  sortBy: SortBy;
  /** 排序方向（由 useFileManagerViewPrefs 管理） */
  sortDir: SortDir;
  /** 是否显示隐藏文件（由 useFileManagerViewPrefs 管理） */
  showHidden: boolean;
}

export interface UseFileManagerReturn {
  // Navigation
  currentPath: string;
  parentPath: string | null;
  navigateTo: (path: string) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;

  // Data
  nodes: FileNode[];
  isLoading: boolean;
  isFetching: boolean;
  statCache: Map<string, SourceStatEntry>;

  // Selection
  selectedPaths: Set<string>;
  setSelectedPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectOne: (path: string) => void;
  toggleSelect: (path: string) => void;
  selectRange: (path: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  lastSelectedPath: React.MutableRefObject<string | null>;

  // View (read-only — managed by useFileManagerViewPrefs, passed in as props)
  viewMode: ViewMode;
  sortBy: SortBy;
  sortDir: SortDir;
  showHidden: boolean;

  // Clipboard
  clipboard: Clipboard | null;
  setClipboard: (mode: "copy" | "cut") => void;
  clearClipboard: () => void;

  // UI state
  renaming: string | null;
  setRenaming: (path: string | null) => void;
  showNewFolder: boolean;
  setShowNewFolder: (open: boolean) => void;

  // Actions
  refresh: () => void;
  loadStats: (paths: string[]) => void;
  fileSystemId?: string;

  // Folder labels from dir-meta (Apple Double / .DS_Store)
  folderLabels: Record<string, number>;
}

export function useFileManager({
  fileSystemId,
  initialPath = "/",
  sourceLabel: sourceLabelOpt,
  viewMode,
  sortBy,
  sortDir,
  showHidden,
}: UseFileManagerOptions): UseFileManagerReturn {
  // ─── Navigation history ───
  const [navHistory, setNavHistory] = useState<string[]>([initialPath]);
  const [navIdx, setNavIdx] = useState(0);
  const navIdxRef = useRef(0);
  const navHistoryRef = useRef<string[]>([initialPath]);
  navIdxRef.current = navIdx;
  navHistoryRef.current = navHistory;

  const currentPath = navHistory[navIdx] ?? "/";

  // ─── Selection ───
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const lastSelectedPath = useRef<string | null>(null);

  // ─── Clipboard (global — shared across all FileManager instances) ───
  const clipboard = useFileClipboard();

  // ─── UI state ───
  const [renaming, setRenaming] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);

  // ─── Stat cache ───
  const [statCache, setStatCache] = useState<Map<string, SourceStatEntry>>(
    () => new Map(),
  );
  const statRequestedRef = useRef(new Set<string>());

  // ─── Data fetching ───
  const browseQuery = api.vfs.browse.useQuery(
    { fileSystemId: fileSystemId ?? "", path: currentPath },
    { retry: false, staleTime: 0, gcTime: 0, enabled: !!fileSystemId },
  );

  // Fetch dir-meta (labels, view defaults) per directory
  const dirMetaQuery = api.vfs.dirMeta.useQuery(
    { fileSystemId: fileSystemId ?? "", path: currentPath },
    { enabled: !!fileSystemId, staleTime: 60_000 },
  );
  const folderLabels: Record<string, number> = dirMetaQuery.data?.labels ?? {};

  const parentPath = browseQuery.data?.parent ?? null;
  const rawEntries = browseQuery.data?.entries ?? [];

  // Merge stat cache into entries, filter hidden files, and sort
  // NOTE: Convert FsStat.mode (string) to FileNode.stat.mode (number)
  const nodes: FileNode[] = sortNodes(
    rawEntries
      .filter((e) => showHidden || !e.name.startsWith("."))
      .map((e) => {
        const stat = statCache.get(e.path);
        const convertedStat = stat
          ? {
              size: stat.size,
              modifiedAt: stat.modifiedAt,
              mode: stat.mode ? Number.parseInt(stat.mode, 8) : null,
            }
          : undefined;
        return { ...e, stat: convertedStat };
      }),
    sortBy,
    sortDir,
  );

  // Reset stat cache when path changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentPath drives reset
  useEffect(() => {
    setStatCache(new Map());
    statRequestedRef.current = new Set();
  }, [currentPath]);

  // Clear selection on path change
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentPath drives clear
  useEffect(() => {
    setSelectedPaths(new Set());
    lastSelectedPath.current = null;
  }, [currentPath]);

  // ─── Stat lazy-loading ───

  const loadStats = useCallback(
    (paths: string[]) => {
      if (!fileSystemId) return;
      const pending = paths.filter((p) => !statRequestedRef.current.has(p));
      if (pending.length === 0) return;
      for (const p of pending) statRequestedRef.current.add(p);

      api.vfs
        .stat({ fileSystemId, paths: pending })
        .then((stats) => {
          setStatCache((prev) => {
            const next = new Map(prev);
            for (const s of stats) next.set(s.path, s);
            return next;
          });
        })
        .catch(() => {
          for (const p of pending) statRequestedRef.current.delete(p);
        });
    },
    [fileSystemId],
  );

  // ─── Navigation ───
  const navigateTo = useCallback((path: string) => {
    const idx = navIdxRef.current;
    setNavHistory((prev) => [...prev.slice(0, idx + 1), path]);
    setNavIdx(idx + 1);
  }, []);

  const goBack = useCallback(() => {
    if (navIdxRef.current > 0) {
      setNavIdx((prev) => prev - 1);
    }
  }, []);

  const goForward = useCallback(() => {
    if (navIdxRef.current < navHistoryRef.current.length - 1) {
      setNavIdx((prev) => prev + 1);
    }
  }, []);

  // Mouse side buttons
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 3) {
        e.preventDefault();
        goBack();
      } else if (e.button === 4) {
        e.preventDefault();
        goForward();
      }
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [goBack, goForward]);

  // ─── Selection actions ───
  const selectOne = useCallback((path: string) => {
    setSelectedPaths(new Set([path]));
    lastSelectedPath.current = path;
  }, []);

  const toggleSelect = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      lastSelectedPath.current = path;
      return next;
    });
  }, []);

  const selectRange = useCallback(
    (path: string) => {
      const lastPath = lastSelectedPath.current;
      const allPaths = nodes.map((n) => n.path);
      if (!lastPath) {
        setSelectedPaths(new Set([path]));
        lastSelectedPath.current = path;
        return;
      }
      const startIdx = allPaths.indexOf(lastPath);
      const endIdx = allPaths.indexOf(path);
      if (startIdx === -1 || endIdx === -1) {
        setSelectedPaths(new Set([path]));
        lastSelectedPath.current = path;
        return;
      }
      const lo = Math.min(startIdx, endIdx);
      const hi = Math.max(startIdx, endIdx);
      setSelectedPaths(new Set(allPaths.slice(lo, hi + 1)));
      lastSelectedPath.current = path;
    },
    [nodes],
  );

  const selectAll = useCallback(() => {
    setSelectedPaths(new Set(nodes.map((n) => n.path)));
  }, [nodes]);

  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set());
    lastSelectedPath.current = null;
  }, []);

  // ─── Clipboard (uses global store — visible across all windows) ───
  const selectedPathsRef = useRef(selectedPaths);
  selectedPathsRef.current = selectedPaths;

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const setClipboard = useCallback(
    (mode: "copy" | "cut") => {
      // Read from ref to avoid stale closure when selectOne + openMenu
      // are called in the same event handler.
      const paths = selectedPathsRef.current;
      if (paths.size === 0) return;
      const pathArr = Array.from(paths);
      const entries = pathArr.map((p) => {
        const n = nodesRef.current.find((nd) => nd.path === p);
        return {
          path: p,
          name: n?.name ?? p.split("/").filter(Boolean).pop() ?? "",
          size: n?.stat?.size ?? n?.size ?? 0,
          isDirectory: n?.isDirectory ?? false,
        };
      });
      setFileClipboard({
        paths: pathArr,
        entries,
        mode,
        fileSystemId: fileSystemId ?? "",
        sourceLabel: sourceLabelOpt ?? "",
      });
    },
    [fileSystemId, sourceLabelOpt],
  );

  const clearClipboard = useCallback(() => {
    clearFileClipboard();
  }, []);

  // ─── Refresh ───
  const refresh = useCallback(() => {
    void browseQuery.refetch();
    setStatCache(new Map());
    statRequestedRef.current = new Set();
  }, [browseQuery]);

  return {
    currentPath,
    parentPath,
    navigateTo,
    goBack,
    goForward,
    canGoBack: navIdx > 0,
    canGoForward: navIdx < navHistory.length - 1,
    nodes,
    isLoading: browseQuery.isPending,
    isFetching: browseQuery.isFetching,
    statCache,
    selectedPaths,
    setSelectedPaths,
    selectOne,
    toggleSelect,
    selectRange,
    selectAll,
    clearSelection,
    lastSelectedPath,
    viewMode,
    sortBy,
    sortDir,
    showHidden,
    clipboard,
    setClipboard,
    clearClipboard,
    renaming,
    setRenaming,
    showNewFolder,
    setShowNewFolder,
    refresh,
    loadStats,
    fileSystemId,
    folderLabels,
  };
}
