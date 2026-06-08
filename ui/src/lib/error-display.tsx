/**
 * ErrorDisplayContext — routes API error display to the nearest provider.
 *
 * Inside a FloatingWindow the provider renders inline notifications;
 * at the App level it falls back to the global toast.
 *
 * `createMutation` / `createPathMutation` call `useErrorDisplay()` so
 * every mutation automatically shows errors in the correct scope —
 * no per-app changes required.
 */

import { createContext, useContext } from "react";

export interface ErrorDisplay {
  error: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

export const ErrorDisplayContext = createContext<ErrorDisplay | null>(null);

export function useErrorDisplay(): ErrorDisplay | null {
  return useContext(ErrorDisplayContext);
}
