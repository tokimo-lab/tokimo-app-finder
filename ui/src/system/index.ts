/**
 * System shim — re-exports from @tokimo/sdk to match the web package's
 * @/system import path.
 */

export type { WindowType } from "@tokimo/sdk";
export {
  RuntimeProvider,
  useDateFormat,
  useWindowActions,
  useWindowNav,
  useWindows,
} from "@tokimo/sdk";
