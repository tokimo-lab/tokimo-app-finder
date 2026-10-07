/** Finder URLs carry the filesystem identity as well as the directory path. */
export function parseFinderRoute(route: string) {
  const url = new URL(route, "http://finder.local");
  if (url.pathname !== "/browse" || !url.searchParams.has("path")) {
    return {
      path: route || "/",
      fileSystemId: undefined,
      favoritesActive: undefined,
    };
  }
  return {
    path: url.searchParams.get("path") ?? "/",
    fileSystemId: url.searchParams.get("fileSystemId") ?? undefined,
    favoritesActive: url.searchParams.get("favorites") === "1",
  };
}

export function buildFinderRoute(
  path: string,
  fileSystemId?: string,
  favoritesActive = false,
) {
  const query = new URLSearchParams({ path });
  if (fileSystemId) query.set("fileSystemId", fileSystemId);
  if (favoritesActive) query.set("favorites", "1");
  return `/browse?${query}`;
}
