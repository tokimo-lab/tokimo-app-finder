import { useShellApi } from "@tokimo/sdk";

export function useMessage() {
  const { notify } = useShellApi();
  return {
    success: (msg: string) => notify({ type: "info", message: msg }),
    error: (msg: string) => notify({ type: "error", message: msg }),
    warning: (msg: string) => notify({ type: "warning", message: msg }),
    info: (msg: string) => notify({ type: "info", message: msg }),
  };
}
