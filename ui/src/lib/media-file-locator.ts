/**
 * Build a display locator string for a media file.
 * If the file has a sourceAddress, it is prepended to the path.
 */
export function getMediaFileLocator(file: {
  sourceAddress?: string | null;
  path: string;
}): string {
  if (file.sourceAddress) {
    return `${file.sourceAddress}${file.path}`;
  }
  return file.path;
}
