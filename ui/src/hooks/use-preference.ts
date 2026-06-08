/**
 * usePreference — React hooks for the unified user_preferences API.
 *
 * 读取统一走 PreferencesContext（顶层一次 getAll，无重复请求）。
 * 写入通过 Context 的 patch/put/reset，立即乐观更新本地缓存。
 */

import { useCallback } from "react";
import type { PreferenceItem } from "../api/client";
import { usePreferencesContext } from "../hooks/stub";

// ── Low-level hook ────────────────────────────────────────────────────────────

/**
 * Read & mutate a single preference entry identified by (scope, scopeId).
 *
 * - `data`: current stored value (empty object `{}` if none).
 * - `patch(partial)`: deep-merge partial update.
 * - `put(value)`: overwrite entire value.
 * - `reset()`: delete (restore to default).
 */
export function usePreference<T extends object = Record<string, unknown>>(
  scope: string,
  scopeId: string,
) {
  const ctx = usePreferencesContext();

  const patch = useCallback(
    (partial: Partial<T>) =>
      ctx.patch(scope, scopeId, partial as Record<string, unknown>),
    [ctx, scope, scopeId],
  );

  const put = useCallback(
    (value: T) => ctx.put(scope, scopeId, value as Record<string, unknown>),
    [ctx, scope, scopeId],
  );

  const reset = useCallback(
    () => ctx.reset(scope, scopeId),
    [ctx, scope, scopeId],
  );

  return {
    data: ctx.get<T>(scope, scopeId),
    isLoading: ctx.isLoading,
    isMutating: ctx.isMutating,
    patch,
    put,
    reset,
  };
}

// ── Semantic wrappers ─────────────────────────────────────────────────────────

/** Per-app-instance user preference. scope = "app", scopeId = app UUID. */
export function useAppPreference<T extends object = Record<string, unknown>>(
  appId: string,
) {
  return usePreference<T>("app", appId);
}

/** System-level per-app settings. scope = "app-system", scopeId = app UUID. */
export function useAppSystemSettings<
  T extends object = Record<string, unknown>,
>(appId: string) {
  return usePreference<T>("app-system", appId);
}

/** System component preference. scope = "component", scopeId = component ID. */
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

// ── Bulk read ─────────────────────────────────────────────────────────────────

/**
 * Read-only bulk view of all preferences (delegates to PreferencesContext).
 * Provided for compatibility; prefer usePreferencesContext() directly.
 */
export function useAllPreferences() {
  const ctx = usePreferencesContext();

  const get = useCallback(
    (scope: string, scopeId: string): Record<string, unknown> =>
      ctx.get(scope, scopeId),
    [ctx],
  );

  const getByScope = useCallback(
    (scope: string): PreferenceItem[] => ctx.getByScope(scope),
    [ctx],
  );

  return {
    data: ctx.getByScope("") as PreferenceItem[], // not useful, kept for compat
    isLoading: ctx.isLoading,
    get,
    getByScope,
  };
}
