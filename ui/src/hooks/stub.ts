/**
 * Compatibility layer — re-exports real transfer implementations
 * and provides stubs for remaining cross-app dependencies.
 */

// ─── Re-export real transfer implementations ──────────────────────────

export {
  buildDragPayload,
  buildTransferRequest,
  hasDragPayload,
  isCrossStorageDrop,
  readDragPayload,
  writeDragPayload,
} from "../transfer/drag-drop";
export type {
  CreateTransferRequest,
  DragFileEntry,
  DragTransferPayload,
  TransferEndpoint,
  TransferProgress,
} from "../transfer/types";
export { TRANSFER_MIME } from "../transfer/types";
export {
  cancelUpload,
  collectDropFiles,
  isLocalUpload,
  startUpload,
  useUploadProgress,
} from "../transfer/upload-manager";
export { useTransfer } from "../transfer/use-transfer";

// ─── Preferences context (stub — SDK provides real one) ───────────────

import { createContext, useContext } from "react";

interface PreferencesContextValue {
  get: (scope: string, scopeId: string) => Record<string, unknown>;
  set: (scope: string, scopeId: string, key: string, value: unknown) => void;
}

const PreferencesCtx = createContext<PreferencesContextValue | null>(null);
export const PreferencesProvider = PreferencesCtx.Provider;

export function usePreferencesContext(): PreferencesContextValue {
  const ctx = useContext(PreferencesCtx);
  if (!ctx) return { get: () => ({}), set: () => {} };
  return ctx;
}

// ─── TransferToSubmenu stub ───────────────────────────────────────────

export function useTransferToSubmenu(_props: {
  currentVfsId?: string;
  currentPath?: string;
}) {
  return { items: [], isLoading: false };
}

// ─── Drag-drop hook stub ──────────────────────────────────────────────

export function useDragDrop(_props: unknown) {
  return {};
}
