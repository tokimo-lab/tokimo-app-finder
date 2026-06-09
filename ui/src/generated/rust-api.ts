/**
 * Compatibility layer — wraps the standalone app's hand-written API client
 * to match the interface expected by the finder components from the web package.
 */
import { useMutation } from "@tanstack/react-query";
import type { BrowseDirectoryResponse } from "../api/client";
import { api as raw, type SourceStatEntry } from "../api/client";

// Re-export types for consumers that import from "./rust-api/vfs"
export type { BrowseEntry, VfsDisplayHints, VfsDto } from "../api/client";

interface BrowseResponse {
  entries: BrowseDirectoryResponse["entries"];
  parentPath: string | null;
}

async function browseFetch(input: {
  fileSystemId: string;
  path: string;
}): Promise<BrowseResponse> {
  const r = await fetch(
    `/api/vfs/${encodeURIComponent(input.fileSystemId)}/browse?path=${encodeURIComponent(input.path)}`,
    { credentials: "include" },
  );
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const json = (await r.json()) as {
    success: boolean;
    data: BrowseDirectoryResponse;
  };
  if (!json.success) throw new Error("VFS browse failed");
  return { entries: json.data.entries, parentPath: json.data.parent };
}

async function statMutate(input: {
  fileSystemId: string;
  paths: string[];
}): Promise<SourceStatEntry[]> {
  const r = await fetch(
    `/api/vfs/${encodeURIComponent(input.fileSystemId)}/stat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: input.paths }),
      credentials: "include",
    },
  );
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const json = (await r.json()) as {
    success: boolean;
    data: SourceStatEntry[];
  };
  if (!json.success) throw new Error("VFS stat failed");
  return json.data;
}

export const api = {
  vfs: {
    list: raw.vfs.list,
    browse: {
      useQuery: (
        input: { fileSystemId: string; path: string },
        options?: Parameters<typeof raw.vfs.browse.useQuery>[1],
      ) => {
        const result = raw.vfs.browse.useQuery(input, options);
        return {
          ...result,
          data: result.data
            ? {
                entries: result.data.entries,
                parentPath: result.data.parent,
              }
            : undefined,
        };
      },
      fetch: browseFetch,
    },
    dirMeta: raw.vfs.dirMeta,
    mkdir: raw.vfs.mkdir,
    deleteFile: raw.vfs.deleteFile,
    deleteDir: raw.vfs.deleteDir,
    rename: raw.vfs.rename,
    copy: raw.vfs.copy,
    move: raw.vfs.move,
    writeFile: raw.vfs.writeFile,
    stat: {
      useMutation: raw.vfs.stat.useMutation,
      mutate: statMutate,
    },
    archiveExtract: raw.vfs.archiveExtract,
    archiveExtractFile: {
      useMutation: () =>
        useMutation({
          mutationFn: (input: {
            fileSystemId: string;
            path: string;
            entry: string;
            password?: string;
          }) =>
            raw.vfs.archiveExtractFile({
              fileSystemId: input.fileSystemId,
              path: input.path,
              entry: input.entry,
              password: input.password,
            }),
        }),
    },
    archiveList: raw.vfs.archiveList,
    archiveCreate: raw.vfs.archiveCreate,
    uploadFile: raw.vfs.uploadFile,
  },
  fileFavorites: raw.fileFavorites,
  user: raw.user,
};
