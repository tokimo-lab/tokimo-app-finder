/**
 * Stub module for unimplemented cross-app dependencies.
 */
import { createContext, useContext } from "react";

// ─── Preferences context ──────────────────────────────────────────────

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

// ─── Transfer types ───────────────────────────────────────────────────

export interface CreateTransferRequest {
  sourceVfsId: string;
  sourcePath: string;
  destVfsId: string;
  destPath: string;
  fileName: string;
  isDirectory?: boolean;
}

export function buildTransferRequest(input: CreateTransferRequest) {
  return input;
}

// ─── Drag-drop helpers ────────────────────────────────────────────────

export function buildDragPayload(data: {
  vfsId: string;
  paths: string[];
  sourceType?: string;
}): string {
  return JSON.stringify(data);
}

export function hasDragPayload(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes("application/json");
}

export function isCrossStorageDrop(_e: React.DragEvent): boolean {
  return false;
}

export function readDragPayload(e: React.DragEvent): {
  vfsId: string;
  paths: string[];
  sourceType?: string;
} | null {
  try {
    const raw = e.dataTransfer.getData("application/json");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Transfer hooks ───────────────────────────────────────────────────

export function useTransferToSubmenu(_props: {
  currentVfsId?: string;
  currentPath?: string;
}) {
  return { items: [], isLoading: false };
}

export function useDragDrop(_props: unknown) {
  return {};
}

export const uploadManager = { upload: async () => {} };

// ─── Additional stubs ─────────────────────────────────────────────────

export function collectDropFiles(_e: React.DragEvent): string[] {
  return [];
}

export function startUpload(_input: {
  fileSystemId: string;
  path: string;
  files: File[];
}) {
  return Promise.resolve();
}

export function useTransfer() {
  return { transfer: async () => {}, isTransferring: false };
}

export function useUploadProgress() {
  return { progress: 0, isUploading: false };
}

export function writeDragPayload(
  _e: React.DragEvent,
  _data: { vfsId: string; paths: string[] },
) {}
