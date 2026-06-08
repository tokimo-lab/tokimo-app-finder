/**
 * Global file clipboard store — shared across all FileManager instances.
 *
 * Uses `useSyncExternalStore` for React integration so every
 * FileManager window sees the same clipboard state.
 */

import type { Clipboard } from "@tokimo/ui";
import { useSyncExternalStore } from "react";

// ─── Module-level singleton state ───

let clipboard: Clipboard | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Clipboard | null {
  return clipboard;
}

// ─── Public API ───

export function setFileClipboard(value: Clipboard | null) {
  clipboard = value;
  emitChange();
}

export function clearFileClipboard() {
  clipboard = null;
  emitChange();
}

/** React hook — subscribe to the global file clipboard. */
export function useFileClipboard(): Clipboard | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
