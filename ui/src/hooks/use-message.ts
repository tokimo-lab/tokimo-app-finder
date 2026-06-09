import { useToast } from "@tokimo/sdk";

/**
 * Toast-based message shim. Maps message.success/error/info/warning(text)
 * to the SDK toast API (mirrors how other standalone apps surface messages).
 */
export function useMessage() {
  return useToast();
}
