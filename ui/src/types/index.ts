export type { MediaFileOutput } from "./app";
export type {
  FsEntry,
  FsStat,
  VfsConnection,
  VfsType,
} from "./vfs";

export type WallpaperMode = "static" | "slideshow" | "random";

export interface WallpaperPrefs {
  wallpaperMode?: WallpaperMode;
  wallpaperKeys?: string[];
  wallpaperInterval?: number;
  wallpaperDimming?: number;
  wallpaperBlur?: number;
}
