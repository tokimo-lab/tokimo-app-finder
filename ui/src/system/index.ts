/**
 * System shim — re-exports from @tokimo/sdk to match the web package's
 * @/system import path.
 */

export type { ViewerWindowType } from "@tokimo/sdk";
export {
  RuntimeProvider,
  useWindowActions,
  useWindowNav,
  useWindows,
} from "@tokimo/sdk";
export { useDateFormat } from "@tokimo/ui";
