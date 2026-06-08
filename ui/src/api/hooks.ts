/**
 * React Query hooks for the Finder API.
 *
 * Wraps the fetch-based client in @tanstack/react-query hooks
 * to match the pattern used by the generated API client.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type BrowseDirectoryResponse,
  browseVfs,
  type FileFavoriteDto,
  listFavorites,
  listVfs,
  toggleFavorite,
  type VfsDto,
} from "./client";

// ─── Query keys ────────────────────────────────────────────────────────

export const queryKeys = {
  favorites: ["file-favorites"] as const,
  vfsList: ["vfs", "list"] as const,
  vfsBrowse: (id: string, path: string) => ["vfs", "browse", id, path] as const,
};

// ─── Favorites hooks ───────────────────────────────────────────────────

export function useFavoritesQuery() {
  return useQuery<FileFavoriteDto[]>({
    queryKey: queryKeys.favorites,
    queryFn: listFavorites,
  });
}

export function useToggleFavoriteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleFavorite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.favorites });
    },
  });
}

// ─── VFS hooks ─────────────────────────────────────────────────────────

export function useVfsListQuery() {
  return useQuery<VfsDto[]>({
    queryKey: queryKeys.vfsList,
    queryFn: listVfs,
  });
}

export function useVfsBrowseQuery(fileSystemId: string, path: string) {
  return useQuery<BrowseDirectoryResponse>({
    queryKey: queryKeys.vfsBrowse(fileSystemId, path),
    queryFn: () => browseVfs(fileSystemId, path),
    enabled: !!fileSystemId,
  });
}
