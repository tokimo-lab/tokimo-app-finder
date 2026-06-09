/**
 * usePreference — finder preference hooks backed by the SDK's per-app
 * DB-backed preference store (`useShellPreference`).
 *
 * The shell exposes a SINGLE flat app-scoped preference object. Finder needs
 * arbitrary `(scope, scopeId)` namespacing, so we nest every entry under that
 * single object as `data[scope][scopeId]` (an object of key → value). All
 * reads/writes go through the typed shell preferences API — no raw fetch.
 */

import { useRuntimeCtx, useShellPreference } from "@tokimo/sdk";
import { useCallback, useState } from "react";

type ShellPrefShape = Record<string, Record<string, Record<string, unknown>>>;

/** Low-level hook: read & mutate a single namespaced preference object. */
export function usePreference<T extends object = Record<string, unknown>>(
  scope: string,
  scopeId: string,
) {
  const ctx = useRuntimeCtx();
  const { data: shellData, patch: shellPatch } =
    useShellPreference<ShellPrefShape>(ctx);
  const [isMutating, setIsMutating] = useState(false);

  const data = (shellData[scope]?.[scopeId] as T) ?? ({} as T);

  const patch = useCallback(
    async (partial: Partial<T>) => {
      setIsMutating(true);
      try {
        await shellPatch({ [scope]: { [scopeId]: partial } });
      } finally {
        setIsMutating(false);
      }
    },
    [shellPatch, scope, scopeId],
  );

  // The shell only deep-merges, so `put` shares the same merge semantics as
  // `patch`. The finder consumers only ever write small partials, so a true
  // overwrite isn't required — merge keeps every other scopeId untouched.
  const put = useCallback(
    async (value: T) => {
      setIsMutating(true);
      try {
        await shellPatch({ [scope]: { [scopeId]: value } });
      } finally {
        setIsMutating(false);
      }
    },
    [shellPatch, scope, scopeId],
  );

  // Clear this namespaced entry back to an empty object (deep-merge can't
  // delete keys, so reset just overwrites with `{}` for the scopeId).
  const reset = useCallback(async () => {
    setIsMutating(true);
    try {
      await shellPatch({ [scope]: { [scopeId]: {} } });
    } finally {
      setIsMutating(false);
    }
  }, [shellPatch, scope, scopeId]);

  return { data, isLoading: false, isMutating, patch, put, reset };
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
