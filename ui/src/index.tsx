import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Dispose } from "@tokimo/sdk";
import { defineApp, RuntimeProvider } from "@tokimo/sdk";
import {
  ConfigProvider,
  ToastProvider,
  enUS as uiEnUS,
  zhCN as uiZhCN,
} from "@tokimo/ui";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AppCtxProvider } from "./AppContext";
import FinderContent from "./components/FinderContent";
import "./index.css";

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
  mount(container, ctx): Dispose {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
    });
    const locale = ctx.locale.startsWith("zh") ? uiZhCN : uiEnUS;
    const root: Root = createRoot(container);

    root.render(
      <StrictMode>
        <RuntimeProvider value={ctx}>
          <AppCtxProvider value={ctx}>
            <QueryClientProvider client={queryClient}>
              <ConfigProvider locale={locale}>
                <ToastProvider>
                  <FinderContent />
                </ToastProvider>
              </ConfigProvider>
            </QueryClientProvider>
          </AppCtxProvider>
        </RuntimeProvider>
      </StrictMode>,
    );
    return () => root.unmount();
  },
});
