export type { FileFavoriteDto } from "../../api/client";

/** Archive entry info — matches the web package's generated type. */
export interface ArchiveEntryInfo {
  path: string;
  size: number;
  isDir: boolean;
  encrypted?: boolean;
}
