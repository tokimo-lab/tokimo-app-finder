import { useWindowActions, type WindowType } from "@tokimo/sdk";
import type { FileNode } from "@tokimo/ui";
import {
  FileGrid,
  getParentPath,
  getPreviewKind,
  useContextMenu,
} from "@tokimo/ui";
import { Star, StarOff } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FileFavoriteDto } from "../api/client";
import { api } from "../api/client";
import type { FsStat } from "../types";

interface FinderFavoritesContentProps {
  /** Called when user double-clicks a directory — navigates to that VFS at that path */
  onSwitchToVfs: (vfsId: string, path: string) => void;
}

export function FinderFavoritesContent({
  onSwitchToVfs,
}: FinderFavoritesContentProps) {
  const { t } = useTranslation();
  const windowManager = useWindowActions();
  const { data: favorites, refetch } = api.fileFavorites.list.useQuery();
  const { data: vfsList } = api.vfs.list.useQuery();
  const toggleMut = api.fileFavorites.toggle.useMutation();
  const { open, contextMenu } = useContextMenu();

  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  // vfsId → display name map
  const vfsNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const vfs of vfsList ?? []) {
      map.set(vfs.id, vfs.name);
    }
    return map;
  }, [vfsList]);

  // Per-vfs stat cache: { [vfsId]: Map<path, FsStat> }
  const [statCaches, setStatCaches] = useState<
    Record<string, Map<string, FsStat>>
  >({});
  const statRequestedRef = useRef<Record<string, Set<string>>>({});

  const loadStats = useCallback(
    (paths: string[]) => {
      if (!favorites) return;
      // Group paths by vfsId
      const byVfs = new Map<string, string[]>();
      for (const path of paths) {
        const fav = favorites.find((f: FileFavoriteDto) => f.path === path);
        if (!fav) continue;
        const list = byVfs.get(fav.vfsId) ?? [];
        list.push(path);
        byVfs.set(fav.vfsId, list);
      }
      for (const [vfsId, vfsPaths] of byVfs) {
        if (!statRequestedRef.current[vfsId]) {
          statRequestedRef.current[vfsId] = new Set();
        }
        const requested = statRequestedRef.current[vfsId];
        const pending = vfsPaths.filter((p) => !requested.has(p));
        if (pending.length === 0) continue;
        for (const p of pending) requested.add(p);

        api.vfs.stat
          .mutate({ fileSystemId: vfsId, paths: pending })
          .then((stats) => {
            setStatCaches((prev) => {
              const next = { ...prev };
              const m = new Map(prev[vfsId] ?? []);
              for (const s of stats) m.set(s.path, s);
              next[vfsId] = m;
              return next;
            });
          })
          .catch(() => {
            const requested2 = statRequestedRef.current[vfsId];
            if (requested2) {
              for (const p of pending) requested2.delete(p);
            }
          });
      }
    },
    [favorites],
  );

  const nodes: FileNode[] = useMemo(
    () =>
      (favorites ?? []).map((f: FileFavoriteDto) => {
        const statMap = statCaches[f.vfsId];
        const stat = statMap?.get(f.path);
        // NOTE: FsStat.mode is string, FileNode.stat.mode is number. Convert or omit.
        const convertedStat = stat
          ? {
              size: stat.size,
              modifiedAt: stat.modifiedAt,
              mode: stat.mode ? Number.parseInt(stat.mode, 8) : null,
            }
          : undefined;
        return {
          name: f.name,
          path: f.path,
          isDirectory: f.isDirectory,
          size: stat?.size ?? null,
          modifiedAt: stat?.modifiedAt ?? null,
          stat: convertedStat,
          sourceName: vfsNameMap.get(f.vfsId) ?? f.vfsId,
        };
      }),
    [favorites, statCaches, vfsNameMap],
  );

  const allPaths = useMemo(() => new Set(nodes.map((n) => n.path)), [nodes]);

  const handleDoubleClick = useCallback(
    (node: FileNode) => {
      const fav = (favorites ?? []).find(
        (f: FileFavoriteDto) => f.path === node.path,
      );
      if (!fav) return;

      if (node.isDirectory) {
        onSwitchToVfs(fav.vfsId, fav.path);
      } else {
        const kind = getPreviewKind(node.name);
        const winType: WindowType = kind === "none" ? "hex" : kind;
        windowManager.openWindow({
          type: winType,
          title: node.name,
          route: node.path,
          filePath: node.path,
          fileName: node.name,
          fileSystemId: fav.vfsId,
        });
      }
    },
    [favorites, onSwitchToVfs, windowManager],
  );

  const handleUnfavorite = useCallback(
    (node: FileNode) => {
      const fav = (favorites ?? []).find(
        (f: FileFavoriteDto) => f.path === node.path,
      );
      if (!fav) return;
      toggleMut.mutate(
        {
          vfsId: fav.vfsId,
          path: fav.path,
          name: fav.name,
          isDirectory: fav.isDirectory,
        },
        { onSuccess: () => refetch() },
      );
    },
    [favorites, toggleMut, refetch],
  );

  const handleContextMenu = useCallback(
    (node: FileNode, e: React.MouseEvent) => {
      e.preventDefault();
      if (!selectedPaths.has(node.path)) {
        setSelectedPaths(new Set([node.path]));
      }
      open(e, [
        {
          key: "unfavorite",
          label: t("fileManager.ctx.removeFromFavorites"),
          icon: <StarOff size={13} className="text-yellow-500" />,
          onClick: () => handleUnfavorite(node),
        },
      ]);
    },
    [open, handleUnfavorite, selectedPaths, t],
  );

  const handleSourceClick = useCallback(
    (node: FileNode) => {
      const fav = (favorites ?? []).find(
        (f: FileFavoriteDto) => f.path === node.path,
      );
      if (!fav) return;
      const targetPath = node.isDirectory ? fav.path : getParentPath(fav.path);
      onSwitchToVfs(fav.vfsId, targetPath);
    },
    [favorites, onSwitchToVfs],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-xs font-medium border-b border-black/[0.06] dark:border-white/[0.06] shrink-0 select-none flex items-center gap-1.5 text-[var(--color-fg-secondary)]">
        <Star size={12} className="text-yellow-500 shrink-0" />
        {t("fileManager.favorites.title")}
      </div>
      <div className="flex-1 min-h-0">
        {nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-fg-disabled)]">
            {t("fileManager.favorites.empty")}
          </div>
        ) : (
          <FileGrid
            nodes={nodes}
            selectedPaths={selectedPaths}
            viewMode="list"
            renaming={null}
            currentPath="/"
            highlightedPaths={allPaths}
            showSource
            onSourceClick={handleSourceClick}
            onVisibleEntriesChange={loadStats}
            onItemClick={(node, e) => {
              if (e.metaKey || e.ctrlKey) {
                const next = new Set(selectedPaths);
                if (next.has(node.path)) next.delete(node.path);
                else next.add(node.path);
                setSelectedPaths(next);
              } else {
                setSelectedPaths(new Set([node.path]));
              }
            }}
            onItemDoubleClick={handleDoubleClick}
            onItemContextMenu={handleContextMenu}
            onEmptyContextMenu={() => {}}
            onRenameSubmit={() => {}}
            onRenameCancel={() => {}}
            onClearSelection={() => setSelectedPaths(new Set())}
            onSelectPaths={setSelectedPaths}
            onDragStart={() => {}}
            onDragEnd={() => {}}
            onDropToFolder={() => {}}
            draggingPaths={new Set()}
          />
        )}
      </div>
      {contextMenu}
    </div>
  );
}
