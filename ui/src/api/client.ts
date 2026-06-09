/**
 * Finder API client — hand-written, matching music/book pattern.
 *
 * Queries use React Query hooks. Mutations are plain async functions.
 * No makeMutation, no mutation objects. Just functions.
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

/**
 * Wrap a plain async function into a React Query mutation hook.
 * Usage: const mut = useVfsMutation(api.vfs.mkdir);
 *        mut.mutate({ fileSystemId, path });
 */
export function useVfsMutation<Args, Result>(
  fn: (args: Args) => Promise<Result>,
  opts?: { onSuccess?: (data: Result, args: Args) => void },
) {
  return useMutation({
    mutationFn: fn,
    onSuccess: opts?.onSuccess
      ? (data, args) => opts.onSuccess!(data, args as Args)
      : undefined,
  });
}

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

async function vfsPost<T>(path: string, body: unknown): Promise<T> {
  return vfsFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
  // ── Favorites (React Query hooks — needs cache invalidation) ──
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
            apiFetch<{ isFavorited: boolean }>(
              `${API_BASE}/favorites/toggle`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              },
            ),
          onSuccess: () =>
            qc.invalidateQueries({ queryKey: ["file-favorites"] }),
        });
      },
    },
  },

  // ── VFS (shared, calls main server) ──
  // Queries: React Query hooks. Mutations: plain async functions.
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

    // ── Mutations: plain async functions (music/book pattern) ──

    mkdir: (input: { fileSystemId: string; path: string }) =>
      vfsPost<void>(
        `/api/vfs/${encodeURIComponent(input.fileSystemId)}/mkdir`,
        { path: input.path },
      ),

    deleteFile: (input: { fileSystemId: string; path: string }) =>
      vfsPost<void>(
        `/api/vfs/${encodeURIComponent(input.fileSystemId)}/delete-file`,
        { path: input.path },
      ),

    deleteDir: (input: { fileSystemId: string; path: string }) =>
      vfsPost<void>(
        `/api/vfs/${encodeURIComponent(input.fileSystemId)}/delete-dir`,
        { path: input.path },
      ),

    rename: (input: { fileSystemId: string; from: string; to: string }) =>
      vfsPost<void>(
        `/api/vfs/${encodeURIComponent(input.fileSystemId)}/rename`,
        { from: input.from, to: input.to },
      ),

    copy: (input: { fileSystemId: string; from: string; to: string }) =>
      vfsPost<void>(
        `/api/vfs/${encodeURIComponent(input.fileSystemId)}/copy`,
        { from: input.from, to: input.to },
      ),

    move: (input: {
      fileSystemId: string;
      from: string;
      toDir: string;
    }) =>
      vfsPost<void>(
        `/api/vfs/${encodeURIComponent(input.fileSystemId)}/move`,
        { from: input.from, toDir: input.toDir },
      ),

    writeFile: (input: {
      fileSystemId: string;
      path: string;
      content: string;
    }) =>
      vfsFetch<void>(
        `/api/vfs/${encodeURIComponent(input.fileSystemId)}/write-file`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: input.path, content: input.content }),
        },
      ),

    stat: (input: {
      fileSystemId: string;
      paths: string[];
    }): Promise<SourceStatEntry[]> =>
      vfsPost<SourceStatEntry[]>(
        `/api/vfs/${encodeURIComponent(input.fileSystemId)}/stat`,
        { paths: input.paths },
      ),

    archiveExtract: (input: {
      fileSystemId: string;
      path: string;
      dest?: string;
      password?: string;
    }) =>
      vfsPost<void>(
        `/api/vfs/${encodeURIComponent(input.fileSystemId)}/archive/extract`,
        input,
      ),

    archiveExtractFile: (input: {
      fileSystemId: string;
      path: string;
      entry: string;
      dest?: string;
      password?: string;
    }) =>
      vfsPost<void>(
        `/api/vfs/${encodeURIComponent(input.fileSystemId)}/archive/extract-file`,
        input,
      ),

    archiveList: (input: {
      fileSystemId: string;
      path: string;
      password?: string;
    }): Promise<{ entries: ArchiveEntryInfo[] }> =>
      vfsPost(
        `/api/vfs/${encodeURIComponent(input.fileSystemId)}/archive/list`,
        input,
      ),

    archiveCreate: (input: {
      fileSystemId: string;
      archivePath: string;
      sources: string[];
      password?: string;
    }) =>
      vfsPost<void>(
        `/api/vfs/${encodeURIComponent(input.fileSystemId)}/archive/create`,
        input,
      ),

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
    saveFsWallpaper: (body: { vfsId: string; path: string }) =>
      apiFetch<void>("/api/user/fs-wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  },
};
