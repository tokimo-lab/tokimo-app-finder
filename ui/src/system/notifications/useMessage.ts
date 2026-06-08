/**
 * Message notification shim — provides a simple toast-like API.
 * Falls back to console + alert for the standalone app.
 */
interface MessageApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
}

export function useMessage(): MessageApi {
  return {
    success: (msg) => console.log("[success]", msg),
    error: (msg) => console.error("[error]", msg),
    info: (msg) => console.info("[info]", msg),
    warning: (msg) => console.warn("[warning]", msg),
  };
}
