/**
 * File URL utilities — shared between shell/window-manager and finder.
 *
 * Moved here so shell/ doesn't import from apps/finder.
 */

/** In standalone app, API is same-origin. */
function rustUrl(path: string): string {
  return path;
}

function encodeSourcePath(filePath: string): string {
  const normalized = filePath.trim() || "/";
  return encodeURIComponent(
    normalized.startsWith("/") ? normalized : `/${normalized}`,
  );
}

/** Build a streaming URL for a file in a given file-system. Returns null if no fileSystemId. */
export function buildFileUrl(
  path: string,
  fileSystemId: string | undefined,
): string | null {
  if (!fileSystemId) return null;
  return rustUrl(
    `/api/vfs/${encodeURIComponent(fileSystemId)}/stream?path=${encodeSourcePath(path)}`,
  );
}
