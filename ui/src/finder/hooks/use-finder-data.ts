import { useMemo } from "react";
import { api } from "../../generated/rust-api";
import { useFileManager } from "../components/useFileManager";
import { useFileManagerViewPrefs } from "../components/useFileManagerViewPrefs";

interface UseFinderDataOptions {
  fileSystemId?: string;
  initialPath: string;
  sourceLabel?: string;
  sourceType?: string;
}

export function useFinderData({
  fileSystemId,
  initialPath,
  sourceLabel,
  sourceType,
}: UseFinderDataOptions) {
  const viewPrefs = useFileManagerViewPrefs();

  const fm = useFileManager({
    fileSystemId,
    initialPath,
    sourceLabel: sourceLabel ?? sourceType ?? "",
    viewMode: viewPrefs.viewMode,
    sortBy: viewPrefs.sortBy,
    sortDir: viewPrefs.sortDir,
    showHidden: viewPrefs.showHidden,
  });

  // ── Favorites ──
  const { data: favorites, refetch: refetchFavs } =
    api.fileFavorites.list.useQuery();

  const favSet = useMemo(() => {
    const set = new Set<string>();
    for (const f of favorites ?? []) {
      set.add(`${f.vfsId}:${f.path}`);
    }
    return set;
  }, [favorites]);

  const highlightedPaths = useMemo(() => {
    const set = new Set<string>();
    for (const f of favorites ?? []) {
      if (f.vfsId === fileSystemId) set.add(f.path);
    }
    return set.size > 0 ? set : undefined;
  }, [favorites, fileSystemId]);

  return {
    fm,
    viewPrefs,
    favSet,
    highlightedPaths,
    refetchFavs,
  };
}

export type UseFinderDataReturn = ReturnType<typeof useFinderData>;
