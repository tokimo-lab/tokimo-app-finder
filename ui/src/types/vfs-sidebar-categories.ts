import type { VfsType } from "./vfs";

/** Three sidebar category buckets for VFS sources */
export type VfsSidebarCategory = "local" | "remote" | "cloud";

export const VFS_SIDEBAR_CATEGORY_LABELS: Record<VfsSidebarCategory, string> = {
  local: "本地存储",
  remote: "远程存储",
  cloud: "网盘",
};

const LOCAL_TYPES = new Set<VfsType>(["local"]);
const REMOTE_TYPES = new Set<VfsType>([
  "nfs",
  "smb",
  "webdav",
  "ftp",
  "sftp",
  "s3",
]);

export function getVfsSidebarCategory(type: string): VfsSidebarCategory {
  if (LOCAL_TYPES.has(type as VfsType)) return "local";
  if (REMOTE_TYPES.has(type as VfsType)) return "remote";
  return "cloud";
}
