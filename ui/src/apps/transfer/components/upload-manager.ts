/**
 * Upload manager stub — transfer system not available in standalone app.
 */
export interface TransferSnapshot {
  status: string;
}

export function useUploadProgress(): Map<string, TransferSnapshot> {
  return new Map();
}

export function collectDropFiles(
  _e: React.DragEvent,
): Promise<Array<{ file: File; relativePath: string }>> {
  return Promise.resolve([]);
}

export function startUpload(_input: {
  fileSystemId: string;
  targetDir: string;
  dstLabel: string;
  files: Array<{ file: File; relativePath: string }>;
}): string {
  return "";
}
