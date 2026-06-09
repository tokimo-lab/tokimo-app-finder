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
import { I18nextProvider } from "react-i18next";
import { AppCtxProvider } from "./AppContext";
import FinderContent from "./components/FinderContent";
import i18n, { SUPPORTED_LOCALES } from "./i18n";
import "./index.css";

export default defineApp({
  id: "finder",
  manifest: {
    id: "finder",
    appName: "dashboard.menu.files",
    icon: "FolderOpen",
    image: "icon.png",
    color: "#3b82f6",
    windowType: "finder",
    defaultSize: { width: 1100, height: 700 },
    category: "system",
  },
  mount(container, ctx): Dispose {
    const applyLocale = (raw: string) => {
      const target = SUPPORTED_LOCALES.includes(raw) ? raw : "en-US";
      if (i18n.language !== target) {
        void i18n.changeLanguage(target);
      }
    };

    applyLocale(ctx.locale);
    const unsubLocale = ctx.shell.subscribeLocale(applyLocale);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
    });
    const uiLocale = ctx.locale.startsWith("zh") ? uiZhCN : uiEnUS;
    const root: Root = createRoot(container);

    root.render(
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          <RuntimeProvider value={ctx}>
            <AppCtxProvider value={ctx}>
              <QueryClientProvider client={queryClient}>
                <ConfigProvider locale={uiLocale} dateFormat={{}}>
                  <ToastProvider>
                    <FinderContent />
                  </ToastProvider>
                </ConfigProvider>
              </QueryClientProvider>
            </AppCtxProvider>
          </RuntimeProvider>
        </I18nextProvider>
      </StrictMode>,
    );
    return () => {
      unsubLocale();
      root.unmount();
    };
  },
});
