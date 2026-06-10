/**
 * useFileManagerViewPrefs — manages file-manager view settings with two-way
 * sync to user_preferences (scope: "component", scopeId: "file-manager").
 *
 * Responsibilities:
 * - Maintain local state (viewMode / sortBy / sortDir / showHidden) for
 *   immediate UI response (no waiting for the async preference save).
 * - Sync FROM preferences reactively: handles both the initial async load
 *   (React Query hasn't fetched yet on first mount) and live updates from
 *   the global settings panel while the finder is open.
 * - Expose setters that BOTH update local state AND persist to preferences
 *   in one call — callers no longer need to invoke fm.setX + saveViewPrefs
 *   separately.
 *
 * Usage:
 *   const viewPrefs = useFileManagerViewPrefs();
 *   const fm = useFileManager({ ..., ...viewPrefs });
 */

import type { SortBy, SortDir, ViewMode } from "@tokimo/ui";
import { useCallback, useEffect, useState } from "react";
import { useComponentPreference } from "@tokimo/sdk";

export interface FileManagerViewPrefs {
  viewMode: ViewMode;
  sortBy: SortBy;
  sortDir: SortDir;
  showHidden: boolean;
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (by: SortBy) => void;
  setSortDir: (dir: SortDir) => void;
  setShowHidden: (show: boolean) => void;
}

function parseViewMode(v: unknown): ViewMode | undefined {
  return v === "grid" || v === "list" || v === "column" ? v : undefined;
}
function parseSortBy(v: unknown): SortBy | undefined {
  return v === "name" || v === "size" || v === "modifiedAt" ? v : undefined;
}
function parseSortDir(v: unknown): SortDir | undefined {
  return v === "asc" || v === "desc" ? v : undefined;
}

/**
 * Manages file-manager view preferences with two-way sync between local
 * React state and the persisted user_preferences entry.
 *
 * @param overrides - Optional per-session overrides (e.g. from .DS_Store).
 *                    Takes priority over saved preferences.
 */
export function useFileManagerViewPrefs(overrides?: {
  viewMode?: ViewMode;
  sortBy?: SortBy;
  sortDir?: SortDir;
}): FileManagerViewPrefs {
  const pref = useComponentPreference("file-manager");
  const { patch: patchPref } = pref;
  const savedView = (pref.data.view as Record<string, unknown>) ?? {};

  // Initialize from: explicit override > saved pref > hard default.
  // useState is initialized only once per mount; the effects below handle
  // subsequent pref changes (async load + settings panel updates).
  const [viewMode, setViewModeLocal] = useState<ViewMode>(
    overrides?.viewMode ?? parseViewMode(savedView.viewMode) ?? "list",
  );
  const [sortBy, setSortByLocal] = useState<SortBy>(
    overrides?.sortBy ?? parseSortBy(savedView.sortBy) ?? "name",
  );
  const [sortDir, setSortDirLocal] = useState<SortDir>(
    overrides?.sortDir ?? parseSortDir(savedView.sortDir) ?? "asc",
  );
  const [showHidden, setShowHiddenLocal] = useState<boolean>(
    typeof savedView.showHidden === "boolean" ? savedView.showHidden : false,
  );

  // ── Sync FROM prefs → local state ─────────────────────────────────────────
  // These effects fire whenever the preference value changes — including the
  // initial async fetch (pref value arrives after first render) and any
  // external change from the global settings panel.
  useEffect(() => {
    const v = parseViewMode(savedView.viewMode);
    if (v) setViewModeLocal(v);
  }, [savedView.viewMode]);

  useEffect(() => {
    const by = parseSortBy(savedView.sortBy);
    if (by) setSortByLocal(by);
  }, [savedView.sortBy]);

  useEffect(() => {
    const dir = parseSortDir(savedView.sortDir);
    if (dir) setSortDirLocal(dir);
  }, [savedView.sortDir]);

  useEffect(() => {
    if (typeof savedView.showHidden === "boolean")
      setShowHiddenLocal(savedView.showHidden);
  }, [savedView.showHidden]);

  // ── Setters: local state + persist to preferences ─────────────────────────
  // Each setter updates local state immediately (for snappy UI) and fires a
  // deep-merge PATCH to the backend (server merges, preserves other view fields).
  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeLocal(mode);
      patchPref({ view: { viewMode: mode } });
    },
    [patchPref],
  );

  const setSortBy = useCallback(
    (by: SortBy) => {
      setSortByLocal(by);
      patchPref({ view: { sortBy: by } });
    },
    [patchPref],
  );

  const setSortDir = useCallback(
    (dir: SortDir) => {
      setSortDirLocal(dir);
      patchPref({ view: { sortDir: dir } });
    },
    [patchPref],
  );

  const setShowHidden = useCallback(
    (show: boolean) => {
      setShowHiddenLocal(show);
      patchPref({ view: { showHidden: show } });
    },
    [patchPref],
  );

  return {
    viewMode,
    sortBy,
    sortDir,
    showHidden,
    setViewMode,
    setSortBy,
    setSortDir,
    setShowHidden,
  };
}
