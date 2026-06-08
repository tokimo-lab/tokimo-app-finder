import { useCallback, useState } from "react";

interface PreferenceApi<T> {
  data: T;
  patch: (partial: Partial<T>) => void;
}

/**
 * Stub preference hook — stores values in memory (no persistence).
 * The web package persists to user_preferences on the server.
 */
export function useComponentPreference(
  _componentId: string,
): PreferenceApi<Record<string, unknown>> {
  const [data, setData] = useState<Record<string, unknown>>({});

  const patch = useCallback((partial: Record<string, unknown>) => {
    setData((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(partial)) {
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          next[key] = { ...(prev[key] as Record<string, unknown>), ...value };
        } else {
          next[key] = value;
        }
      }
      return next;
    });
  }, []);

  return { data, patch };
}

export function useUiPreference<T>(_key: string): {
  put: (value: T) => Promise<void>;
} {
  return {
    put: async () => {
      /* no-op in standalone */
    },
  };
}
