/**
 * Window state hooks — reads current window's metadata from SDK.
 */
import { useWindowActions, useWindows } from "@tokimo/sdk";
import { useMemo } from "react";

/** Get the current window's metadata. */
export function useWindowMetadata(): Record<string, unknown> {
  const { currentWindowId } = useWindowActions();
  const windows = useWindows();
  return useMemo(() => {
    const win = windows.find((w) => w.id === currentWindowId);
    return (win?.metadata as Record<string, unknown>) ?? {};
  }, [windows, currentWindowId]);
}
