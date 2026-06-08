/** Stub for transfer types. */
export interface CreateTransferRequest {
  sourceVfsId: string;
  sourcePath: string;
  destVfsId: string;
  destPath: string;
  fileName: string;
  isDirectory?: boolean;
}
