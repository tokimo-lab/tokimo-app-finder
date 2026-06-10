import {
  useSidebarCollapsed,
  useWindowActions,
  useWindowNav,
} from "@tokimo/sdk";
import { AppSetupGuide, type AppSetupGuideProps, Spin } from "@tokimo/ui";
import { Archive, FolderPlus, HardDrive, Star } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { VfsDisplayHints, VfsDto } from "../api/client";
import { api } from "../api/client";
import { FinderFavoritesContent } from "../components/FinderFavoritesContent";
import { FAVORITES_KEY, VfsSidebar } from "../components/VfsSidebar";
import { useContainerWidth } from "../hooks/use-container-width";
import { useWindowMetadata } from "../hooks/use-window-state";

const FileManager = lazy(() =>
  import("./FileManager").then((m) => ({
    default: m.FileManager,
  })),
);

// The app bundles its own lucide-react copy whose `LucideIcon` type is
// nominally distinct from the one @tokimo/ui resolves. Bridge through this
// alias so icon props line up without `any`.
type GuideIcon = NonNullable<AppSetupGuideProps["actionIcon"]>;

function buildBrowseLabel(
  type: string,
  displayHints?: VfsDisplayHints | null,
  name?: string,
): string {
  return displayHints?.protocolPrefix ?? `${type}://${name || type}`;
}

export default function FileBrowserContent() {
  const { t } = useTranslation();
  const { route, replace } = useWindowNav();
  const { currentWindowId, updateMetadata, openWindow } = useWindowActions();
  const metadata = useWindowMetadata();

  const fileSystemId = metadata.fileSystemId as string | undefined;
  const initialPath = route || "/";
  const sourceLabel = metadata.fsSourceLabel as string | undefined;
  const favoritesActive = metadata.favoritesActive === true;

  const [containerRef, containerWidth] = useContainerWidth();
  const { collapsed: sidebarCollapsed, onToggleCollapse } = useSidebarCollapsed(
    "finder",
    containerWidth > 0 && containerWidth < 720,
  );

  // Always query fileSystems (needed for auto-select and favorites→VFS navigation)
  const { data: fileSystems, isLoading: isVfsLoading } =
    api.vfs.list.useQuery();

  // Auto-select first enabled filesystem when none is set
  useEffect(() => {
    if (fileSystemId) return;
    const first = fileSystems?.[0];
    if (!first) return;
    const dirPath =
      first.type === "local" ? "/" : first.displayHints?.rootPath || "/";
    updateMetadata(currentWindowId, {
      fileSystemId: first.id,
      fsSourceType: first.type,
      fsSourceLabel: buildBrowseLabel(
        first.type,
        first.displayHints,
        first.name,
      ),
    });
    replace(dirPath);
    document.title = first.name;
  }, [fileSystemId, fileSystems, updateMetadata, replace, currentWindowId]);

  const handleNavigate = useCallback(
    (path: string) => {
      replace(path);
    },
    [replace],
  );

  const handleSwitchVfs = useCallback(
    (fs: VfsDto) => {
      if (fs.id === fileSystemId && !favoritesActive) return;
      const dirPath =
        fs.type === "local" ? "/" : fs.displayHints?.rootPath || "/";
      updateMetadata(currentWindowId, {
        fileSystemId: fs.id,
        fsSourceType: fs.type,
        fsSourceLabel: buildBrowseLabel(fs.type, fs.displayHints, fs.name),
        favoritesActive: false,
      });
      replace(dirPath);
      document.title = fs.name;
    },
    [fileSystemId, favoritesActive, updateMetadata, replace, currentWindowId],
  );

  const handleSelectFavorites = useCallback(() => {
    updateMetadata(currentWindowId, { favoritesActive: true });
  }, [updateMetadata, currentWindowId]);

  /** Called from FinderFavoritesContent when user double-clicks a directory */
  const handleSwitchToVfsById = useCallback(
    (vfsId: string, path: string) => {
      const fs = (fileSystems ?? []).find((f) => f.id === vfsId);
      if (!fs) return;
      updateMetadata(currentWindowId, {
        fileSystemId: vfsId,
        fsSourceType: fs.type,
        fsSourceLabel: buildBrowseLabel(fs.type, fs.displayHints, fs.name),
        favoritesActive: false,
      });
      replace(path);
      document.title = fs.name;
    },
    [fileSystems, updateMetadata, replace, currentWindowId],
  );

  const openVfsSettings = useCallback(() => {
    openWindow({
      type: "system",
      title: "系统设置",
      route: "/file-systems",
      metadata: { pageId: "system-settings" },
    });
  }, [openWindow]);

  if (isVfsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (!fileSystems?.length) {
    return (
      <AppSetupGuide
        imageSrc="/page-icons/files.png"
        accentColor="blue"
        title={t("common.setupGuide.getStarted", { name: "Finder" })}
        description={t("common.setupGuide.finderTagline")}
        features={(
          t("common.setupGuide.finderFeatures", {
            returnObjects: true,
          }) as string[]
        ).map((label, i) => ({
          icon: [HardDrive, Star, Archive][i] as unknown as GuideIcon,
          label,
        }))}
        actionLabel={t("common.setupGuide.finderAction")}
        actionIcon={FolderPlus as unknown as GuideIcon}
        onAction={openVfsSettings}
      />
    );
  }

  const activeKey = favoritesActive ? FAVORITES_KEY : fileSystemId;

  return (
    <div ref={containerRef} className="relative flex h-full">
      <VfsSidebar
        activeKey={activeKey}
        onSelect={handleSwitchVfs}
        onSelectFavorites={handleSelectFavorites}
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleCollapse}
      />
      <div className="flex-1 min-w-0 bg-[var(--color-surface-content)]">
        {favoritesActive ? (
          <FinderFavoritesContent onSwitchToVfs={handleSwitchToVfsById} />
        ) : (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <Spin />
              </div>
            }
          >
            <FileManager
              key={fileSystemId}
              fileSystemId={fileSystemId}
              initialPath={initialPath}
              sourceType={metadata.fsSourceType as string | undefined}
              sourceLabel={sourceLabel}
              onNavigate={handleNavigate}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
