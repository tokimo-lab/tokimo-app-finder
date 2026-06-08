import { useCallback, useEffect, useRef } from "react";
import type { UseFileManagerReturn } from "../components/useFileManager";
import { useUploadProgress } from "../transfer/upload-manager";
import { useTransfer } from "../transfer/use-transfer";

interface UseFinderTransferOptions {
  fm: UseFileManagerReturn;
  bumpSubColumnRefresh: () => void;
}

export function useFinderTransfer({
  fm,
  bumpSubColumnRefresh,
}: UseFinderTransferOptions) {
  const { transfers, createTransfer } = useTransfer();
  const uploadProgress = useUploadProgress();

  const pendingTransferIds = useRef(new Set<string>());
  const completedTransferIds = useRef(new Set<string>());

  // Keep refs so async `.then()` callbacks can read the latest values.
  const transfersRef = useRef(transfers);
  transfersRef.current = transfers;
  const uploadProgressRef = useRef(uploadProgress);
  uploadProgressRef.current = uploadProgress;

  const markPendingAndCheck = useCallback(
    (tid: string) => {
      pendingTransferIds.current.add(tid);
      // For fast transfers the "completed" WS event may arrive before
      // this callback runs, so do an immediate check against the latest snapshot.
      const snap =
        transfersRef.current.get(tid) ?? uploadProgressRef.current.get(tid);
      if (
        snap?.status === "completed" &&
        !completedTransferIds.current.has(tid)
      ) {
        completedTransferIds.current.add(tid);
        fm.refresh();
        bumpSubColumnRefresh();
      }
    },
    [fm, bumpSubColumnRefresh],
  );

  useEffect(() => {
    for (const tid of pendingTransferIds.current) {
      const snap = transfers.get(tid) ?? uploadProgress.get(tid);
      if (
        snap?.status === "completed" &&
        !completedTransferIds.current.has(tid)
      ) {
        completedTransferIds.current.add(tid);
        fm.refresh();
        bumpSubColumnRefresh();
      }
    }
  }, [transfers, uploadProgress, fm, bumpSubColumnRefresh]);

  return {
    transfers,
    createTransfer,
    markPendingAndCheck,
  };
}
