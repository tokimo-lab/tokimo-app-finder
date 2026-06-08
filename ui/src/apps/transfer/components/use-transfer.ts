/**
 * Transfer hook stub — transfer system not available in standalone app.
 */
import type { CreateTransferRequest } from "./types";
import type { TransferSnapshot } from "./upload-manager";

export function useTransfer(): {
  transfers: Map<string, TransferSnapshot>;
  createTransfer: (req: CreateTransferRequest) => Promise<string>;
} {
  return {
    transfers: new Map(),
    createTransfer: async () => "",
  };
}
