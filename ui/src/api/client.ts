/**
 * API client for the Finder standalone app.
 *
 * Two categories of endpoints:
 * 1. App backend (favorites): `/api/apps/finder/...` → proxied to UDS
 * 2. Main server (VFS): `/api/vfs/...` → direct to rust-server
 *
 * Both are same-origin, no CORS issues.
 */

// ─── Favorites API ─────────────────────────────────────────────────────

export interface FileFavoriteDto {
  id: string;
  userId: string;
  vfsId: string;
  path: string;
  name: string;
  isDirectory: boolean;
  createdAt: string;
}

interface ListFavoritesResp {
  items: FileFavoriteDto[];
}

interface ToggleFavoriteResp {
  isFavorited: boolean;
}

export async function listFavorites(): Promise<FileFavoriteDto[]> {
  const res = await fetch("/api/apps/finder/favorites");
  if (!res.ok) throw new Error(`listFavorites: ${res.status}`);
  const data: ListFavoritesResp = await res.json();
  return data.items;
}

export async function toggleFavorite(body: {
  vfsId: string;
  path: string;
  name: string;
  isDirectory: boolean;
}): Promise<boolean> {
  const res = await fetch("/api/apps/finder/favorites/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`toggleFavorite: ${res.status}`);
  const data: ToggleFavoriteResp = await res.json();
  return data.isFavorited;
}

// ─── VFS API (main server) ─────────────────────────────────────────────

export interface VfsDto {
  id: string;
  name: string;
  type: string;
  config: unknown;
  sortOrder: number;
  lastScanAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BrowseEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number | null;
  modifiedAt?: string | null;
  mimeType?: string | null;
}

export interface BrowseDirectoryResponse {
  entries: BrowseEntry[];
  parent: string | null;
}

export async function listVfs(): Promise<VfsDto[]> {
  const res = await fetch("/api/vfs");
  if (!res.ok) throw new Error(`listVfs: ${res.status}`);
  return res.json();
}

export async function browseVfs(
  fileSystemId: string,
  path: string,
): Promise<BrowseDirectoryResponse> {
  const params = new URLSearchParams({ path });
  const res = await fetch(
    `/api/vfs/${encodeURIComponent(fileSystemId)}/browse?${params}`,
  );
  if (!res.ok) throw new Error(`browseVfs: ${res.status}`);
  return res.json();
}
