interface ErrorDisplayApi {
  error: (msg: string) => void;
}

export function useErrorDisplay(): ErrorDisplayApi | null {
  return {
    error: (msg) => console.error("[error-display]", msg),
  };
}
