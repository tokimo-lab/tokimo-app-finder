export interface TransferEndpoint {
  kind: "fileSystem";
  id: string;
}

export interface TransferFile {
  srcPath: string;
  dstPath: string;
  size: number;
  isDirectory: boolean;
}

export interface CreateTransferRequest {
  src: TransferEndpoint;
  dst: TransferEndpoint;
  srcLabel: string;
  dstLabel: string;
  files: TransferFile[];
}
