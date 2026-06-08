/**
 * usePreference — fetch-based preference hooks for the standalone finder app.
 *
 * Calls the main server's /api/user/preferences endpoints directly.
 * Supports arbitrary scopes (app, component, ui).
 */

import { useCallback, useEffect, useState } from "react";

// ─── Module-level cache ───────────────────────────────────────────────

interface PreferenceItem {
  scope: string;
  scopeId: string;
  key: string;
  value: unknown;
}

let allPrefs: PreferenceItem[] = [];
let loaded = false;
let loading = false;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

async function ensureLoaded() {
  if (loaded || loading) return;
  loading = true;
  try {
    const r = await fetch("/api/user/preferences", { credentials: "include" });
    if (r.ok) {
      const json = await r.json();
      allPrefs = json.data ?? [];
      loaded = true;
    }
  } catch {
    /* ignore */
  }
  loading = false;
  emit();
}

async function savePref(
  scope: string,
  scopeId: string,
  key: string,
  value: unknown,
) {
  await fetch("/api/user/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ scope, scopeId, key, value }),
  });
  const idx = allPrefs.findIndex(
    (p) => p.scope === scope && p.scopeId === scopeId && p.key === key,
  );
  if (idx >= 0) {
    allPrefs[idx] = { ...allPrefs[idx], value };
  } else {
    allPrefs.push({ scope, scopeId, key, value });
  }
  emit();
}

async function deletePref(scope: string, scopeId: string, key: string) {
  await fetch(
    `/api/user/preferences/${encodeURIComponent(scope)}/${encodeURIComponent(scopeId)}/${encodeURIComponent(key)}`,
    { method: "DELETE", credentials: "include" },
  );
  allPrefs = allPrefs.filter(
    (p) => !(p.scope === scope && p.scopeId === scopeId && p.key === key),
  );
  emit();
}

// ─── Hooks ────────────────────────────────────────────────────────────

/** Low-level hook: read & mutate a single preference entry. */
export function usePreference<T extends object = Record<string, unknown>>(
  scope: string,
  scopeId: string,
) {
  const [isMutating, setIsMutating] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    ensureLoaded();
    const unsub = subscribe(() => forceUpdate((n) => n + 1));
    return unsub;
  }, []);

  const data =
    (allPrefs.find((p) => p.scope === scope && p.scopeId === scopeId)
      ?.value as T) ?? ({} as T);

  const patch = useCallback(
    async (partial: Partial<T>) => {
      setIsMutating(true);
      try {
        for (const [key, value] of Object.entries(partial)) {
          await savePref(scope, scopeId, key, value);
        }
      } finally {
        setIsMutating(false);
      }
    },
    [scope, scopeId],
  );

  const put = useCallback(
    async (value: T) => {
      setIsMutating(true);
      try {
        for (const [key, val] of Object.entries(value)) {
          await savePref(scope, scopeId, key, val);
        }
      } finally {
        setIsMutating(false);
      }
    },
    [scope, scopeId],
  );

  const reset = useCallback(async () => {
    setIsMutating(true);
    try {
      const keys = allPrefs
        .filter((p) => p.scope === scope && p.scopeId === scopeId)
        .map((p) => p.key);
      for (const key of keys) {
        await deletePref(scope, scopeId, key);
      }
    } finally {
      setIsMutating(false);
    }
  }, [scope, scopeId]);

  return { data, isLoading: !loaded, isMutating, patch, put, reset };
}

/** Per-component preference. scope = "component", scopeId = component ID. */
export function useComponentPreference<
  T extends object = Record<string, unknown>,
>(componentId: string) {
  return usePreference<T>("component", componentId);
}

/** User-level UI preference. scope = "ui", scopeId = category key. */
export function useUiPreference<T extends object = Record<string, unknown>>(
  key: string,
) {
  return usePreference<T>("ui", key);
}
