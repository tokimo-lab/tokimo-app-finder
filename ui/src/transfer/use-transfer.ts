/**
 * useTransfer — subscribe to transfer progress updates via WebSocket.
 *
 * Uses the SDK's shell.ws API for WS communication.
 */

import { useShellApi } from "@tokimo/sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CreateTransferRequest, TransferProgress } from "./types";

export function useTransfer() {
  const { ws } = useShellApi();
  const [transfers, setTransfers] = useState<Map<string, TransferProgress>>(
    () => new Map(),
  );
  const transfersRef = useRef(transfers);
  transfersRef.current = transfers;

  // Subscribe to progress pushes.
  useEffect(() => {
    const unsub = ws.subscribe("transfer:progress", (msg) => {
      const snap = msg.data as TransferProgress;
      if (!snap?.transferId) return;
      setTransfers((prev) => {
        const next = new Map(prev);
        next.set(snap.transferId, snap);
        return next;
      });
    });
    return unsub;
  }, [ws]);

  // On WS re-connect, fetch active transfer list.
  const wsRef = useRef(ws);
  wsRef.current = ws;
  useEffect(() => {
    if (ws.status !== "connected") return;
    wsRef.current
      .request<TransferProgress[]>("transfer:list")
      .then((list) => {
        if (!Array.isArray(list)) return;
        setTransfers((prev) => {
          const next = new Map(prev);
          for (const snap of list) {
            next.set(snap.transferId, snap);
          }
          return next;
        });
      })
      .catch(() => {});
  }, [ws.status]);

  const createTransfer = useCallback(
    async (req: CreateTransferRequest): Promise<string> => {
      const resp = await ws.request<{ transferId: string }>(
        "transfer:create",
        req,
      );
      return resp.transferId;
    },
    [ws],
  );

  const cancelTransfer = useCallback(
    async (transferId: string) => {
      await ws.request("transfer:cancel", { transferId });
    },
    [ws],
  );

  const removeTransfer = useCallback((transferId: string) => {
    setTransfers((prev) => {
      const next = new Map(prev);
      next.delete(transferId);
      return next;
    });
  }, []);

  return {
    transfers,
    createTransfer,
    cancelTransfer,
    removeTransfer,
  };
}
