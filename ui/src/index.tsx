/**
 * Finder standalone app — file manager with favorites.
 *
 * This is the entry point loaded by the Tokimo shell via defineApp().
 * The app backend provides favorites CRUD; VFS browsing uses the main
 * server's shared VFS endpoints.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  type AppRuntimeCtx,
  type Dispose,
  defineApp,
  makeTranslator,
  RuntimeProvider,
} from "@tokimo/sdk";
import {
  ConfigProvider,
  ToastProvider,
  enUS as uiEnUS,
  zhCN as uiZhCN,
} from "@tokimo/ui";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { enUS, zhCN } from "./i18n";
import "./index.css";

// Placeholder — full Finder UI will be migrated from packages/web/src/apps/finder/
function FinderPlaceholder({ ctx }: { ctx: AppRuntimeCtx }) {
  const t = makeTranslator({ "zh-CN": zhCN, "en-US": enUS }, ctx.locale);
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("finder.title")}</h1>
        <p className="mt-2 text-sm opacity-60">
          Finder app — backend extracted, frontend migration pending
        </p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default defineApp({
  id: "finder",
  manifest: {
    id: "finder",
    appName: "dashboard.menu.files",
    icon: "FolderOpen",
    image: "page-icons/files.png",
    color: "#3b82f6",
    windowType: "finder",
    defaultSize: { width: 1100, height: 700 },
    category: "system",
  },
  translations: { "zh-CN": zhCN, "en-US": enUS },
  mount(container, ctx): Dispose {
    const root: Root = createRoot(container);
    const locale = ctx.locale.startsWith("zh") ? uiZhCN : uiEnUS;
    root.render(
      <StrictMode>
        <ConfigProvider locale={locale}>
          <ToastProvider>
            <QueryClientProvider client={queryClient}>
              <RuntimeProvider value={ctx}>
                <FinderPlaceholder ctx={ctx} />
              </RuntimeProvider>
            </QueryClientProvider>
          </ToastProvider>
        </ConfigProvider>
      </StrictMode>,
    );
    return () => root.unmount();
  },
});
