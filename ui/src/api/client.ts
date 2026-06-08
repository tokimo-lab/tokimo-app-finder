/**
 * Finder API client — hand-written, no code generation.
 *
 * Two base URLs:
 * - /api/apps/finder/... → favorites (proxied to app backend)
 * - /api/vfs/... → VFS operations (shared, on main server)
 */
import {
  type QueryKey,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

// ─── Envelope & fetch helpers ─────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type QueryOptions<T> = Omit<
  UseQueryOptions<T, Error, T, QueryKey>,
  "queryKey" | "queryFn"
>;

const API_BASE = "/api/apps/finder";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { ...init, credentials: "include" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const json = (await r.json()) as ApiResponse<T>;
  if (!json.success) throw new Error(json.error ?? "API request failed");
  return json.data as T;
}

async function vfsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { ...init, credentials: "include" });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const json = (await r.json()) as ApiResponse<T>;
  if (!json.success) throw new Error(json.error ?? "VFS request failed");
  return json.data as T;
}

// ─── Types ────────────────────────────────────────────────────────────

export interface VfsDto {
  id: string;
  name: string;
  type: string;
  config?: unknown;
  sortOrder: number;
  lastScanAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  displayHints?: { protocolPrefix?: string; rootPath?: string };
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

export interface SourceStatEntry {
  path: string;
  size?: number | null;
  modifiedAt?: string | null;
  mode?: number | null;
}

export interface DirMeta {
  viewMode?: string | null;
  sortBy?: string | null;
  sortDir?: string | null;
  labels?: Record<string, number>;
}

export interface FileFavoriteDto {
  id: string;
  userId: string;
  vfsId: string;
  path: string;
  name: string;
  isDirectory: boolean;
  createdAt: string;
}

export interface VfsDisplayHints {
  protocolPrefix?: string;
  rootPath?: string;
}

export interface ArchiveEntryInfo {
  path: string;
  size: number;
  isDir: boolean;
  encrypted?: boolean;
}

// ─── API object ───────────────────────────────────────────────────────

export const api = {
  // ── Favorites ──
  fileFavorites: {
    list: {
      useQuery: (options?: QueryOptions<FileFavoriteDto[]>) =>
        useQuery<FileFavoriteDto[]>({
          queryKey: ["file-favorites"],
          queryFn: () => apiFetch<FileFavoriteDto[]>(`${API_BASE}/favorites`),
          ...options,
        }),
    },
    toggle: {
      useMutation: () => {
        const qc = useQueryClient();
        return useMutation({
          mutationFn: (body: {
            vfsId: string;
            path: string;
            name: string;
            isDirectory: boolean;
          }) =>
            apiFetch<{ isFavorited: boolean }>(`${API_BASE}/favorites/toggle`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }),
          onSuccess: () =>
            qc.invalidateQueries({ queryKey: ["file-favorites"] }),
        });
      },
    },
  },

  // ── VFS (shared, calls main server) ──
  vfs: {
    list: {
      useQuery: (options?: QueryOptions<VfsDto[]>) =>
        useQuery<VfsDto[]>({
          queryKey: ["vfs", "list"],
          queryFn: () => vfsFetch<VfsDto[]>("/api/vfs"),
          ...options,
        }),
    },
    browse: {
      useQuery: (
        input: { fileSystemId: string; path: string },
        options?: QueryOptions<BrowseDirectoryResponse>,
      ) =>
        useQuery<BrowseDirectoryResponse>({
          queryKey: ["vfs", "browse", input.fileSystemId, input.path],
          queryFn: () =>
            vfsFetch<BrowseDirectoryResponse>(
              `/api/vfs/${encodeURIComponent(input.fileSystemId)}/browse?path=${encodeURIComponent(input.path)}`,
            ),
          enabled: !!input.fileSystemId,
          ...options,
        }),
    },
    dirMeta: {
      useQuery: (
        input: { fileSystemId: string; path: string },
        options?: QueryOptions<DirMeta>,
      ) =>
        useQuery<DirMeta>({
          queryKey: ["vfs", "dirMeta", input.fileSystemId, input.path],
          queryFn: () =>
            vfsFetch<DirMeta>(
              `/api/vfs/${encodeURIComponent(input.fileSystemId)}/dir-meta?path=${encodeURIComponent(input.path)}`,
            ),
          enabled: !!input.fileSystemId,
          ...options,
        }),
    },
    mkdir: {
      useMutation: () =>
        useMutation({
          mutationFn: (input: { fileSystemId: string; path: string }) =>
            vfsFetch<void>(
              `/api/vfs/${encodeURIComponent(input.fileSystemId)}/mkdir`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: input.path }),
              },
            ),
        }),
    },
    deleteFile: {
      useMutation: () =>
        useMutation({
          mutationFn: (input: { fileSystemId: string; path: string }) =>
            vfsFetch<void>(
              `/api/vfs/${encodeURIComponent(input.fileSystemId)}/delete-file`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: input.path }),
              },
            ),
        }),
    },
    deleteDir: {
      useMutation: () =>
        useMutation({
          mutationFn: (input: { fileSystemId: string; path: string }) =>
            vfsFetch<void>(
              `/api/vfs/${encodeURIComponent(input.fileSystemId)}/delete-dir`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: input.path }),
              },
            ),
        }),
    },
    rename: {
      useMutation: () =>
        useMutation({
          mutationFn: (input: {
            fileSystemId: string;
            from: string;
            to: string;
          }) =>
            vfsFetch<void>(
              `/api/vfs/${encodeURIComponent(input.fileSystemId)}/rename`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ from: input.from, to: input.to }),
              },
            ),
        }),
    },
    copy: {
      useMutation: () =>
        useMutation({
          mutationFn: (input: {
            fileSystemId: string;
            from: string;
            to: string;
          }) =>
            vfsFetch<void>(
              `/api/vfs/${encodeURIComponent(input.fileSystemId)}/copy`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ from: input.from, to: input.to }),
              },
            ),
        }),
    },
    move: {
      useMutation: () =>
        useMutation({
          mutationFn: (input: {
            fileSystemId: string;
            from: string;
            toDir: string;
          }) =>
            vfsFetch<void>(
              `/api/vfs/${encodeURIComponent(input.fileSystemId)}/move`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ from: input.from, toDir: input.toDir }),
              },
            ),
        }),
    },
    writeFile: {
      useMutation: () =>
        useMutation({
          mutationFn: (input: {
            fileSystemId: string;
            path: string;
            content: string;
          }) =>
            vfsFetch<void>(
              `/api/vfs/${encodeURIComponent(input.fileSystemId)}/write-file`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  path: input.path,
                  content: input.content,
                }),
              },
            ),
        }),
    },
    stat: {
      useMutation: () =>
        useMutation({
          mutationFn: (input: {
            fileSystemId: string;
            paths: string[];
          }): Promise<SourceStatEntry[]> =>
            vfsFetch<SourceStatEntry[]>(
              `/api/vfs/${encodeURIComponent(input.fileSystemId)}/stat`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paths: input.paths }),
              },
            ),
        }),
    },
    archiveExtract: {
      useMutation: () =>
        useMutation({
          mutationFn: (input: {
            fileSystemId: string;
            path: string;
            dest?: string;
            password?: string;
          }) =>
            vfsFetch<void>(
              `/api/vfs/${encodeURIComponent(input.fileSystemId)}/archive/extract`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
              },
            ),
        }),
    },
    archiveList: {
      useMutation: () =>
        useMutation({
          mutationFn: (input: {
            fileSystemId: string;
            path: string;
            password?: string;
          }) =>
            vfsFetch<{
              entries: Array<{
                name: string;
                size: number;
                isDirectory: boolean;
              }>;
            }>(
              `/api/vfs/${encodeURIComponent(input.fileSystemId)}/archive/list`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
              },
            ),
        }),
    },
    archiveCreate: {
      useMutation: () =>
        useMutation({
          mutationFn: (input: {
            fileSystemId: string;
            archivePath: string;
            sources: string[];
            password?: string;
          }) =>
            vfsFetch<void>(
              `/api/vfs/${encodeURIComponent(input.fileSystemId)}/archive/create`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
              },
            ),
        }),
    },
    uploadFile: {
      mutate: async (input: {
        fileSystemId: string;
        path: string;
        filename: string;
        file: File | Blob;
      }): Promise<void> => {
        const url = `/api/vfs/${encodeURIComponent(input.fileSystemId)}/upload?path=${encodeURIComponent(input.path)}&filename=${encodeURIComponent(input.filename)}`;
        const form = new FormData();
        form.append("file", input.file, input.filename);
        const r = await fetch(url, {
          method: "POST",
          body: form,
          credentials: "include",
        });
        if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
      },
    },
  },

  // ── User prefs ──
  user: {
    saveFsWallpaper: {
      useMutation: () =>
        useMutation({
          mutationFn: (body: { vfsId: string; path: string }) =>
            apiFetch<void>("/api/user/fs-wallpaper", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }),
        }),
    },
  },
};
