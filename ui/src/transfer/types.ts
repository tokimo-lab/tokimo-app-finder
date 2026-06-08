/** Drag payload MIME type for cross-storage transfers. */
export const TRANSFER_MIME = "application/x-tokimo-transfer";

/** Source kind in a drag payload. */
export type DragSourceKind = "file-system" | "ssh-terminal";

/** JSON payload written to DataTransfer during drag. */
export interface DragTransferPayload {
  sourceKind: DragSourceKind;
  fileSystemId?: string;
  sshTerminalId?: string;
  sourceLabel: string;
  files: DragFileEntry[];
}

export interface DragFileEntry {
  path: string;
  name: string;
  size: number;
  isDirectory: boolean;
}

/** Transfer progress snapshot pushed by the server via WS. */
export interface TransferProgress {
  transferId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  totalBytes: number;
  transferredBytes: number;
  speedBps: number;
  currentFile: string;
  currentFileIndex: number;
  totalFiles: number;
  elapsedSecs: number;
  etaSecs: number;
  error: string | null;
  srcLabel: string;
  dstLabel: string;
  isDirect: boolean;
  uploading: boolean;
}

export interface TransferEndpoint {
  kind: "fileSystem" | "sshTerminal";
  id: string;
}

export interface CreateTransferRequest {
  src: TransferEndpoint;
  dst: TransferEndpoint;
  srcLabel: string;
  dstLabel: string;
  files: Array<{
    srcPath: string;
    dstPath: string;
    size: number;
    isDirectory: boolean;
  }>;
}
