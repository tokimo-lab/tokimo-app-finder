/**
 * FinderContent — top-level component for the finder standalone app.
 *
 * Uses @tokimo/sdk hooks for window state and the hand-written api client
 * for VFS + favorites operations. No @/ imports.
 */
import { useWindowActions, useWindows } from "@tokimo/sdk";
import { AppSetupGuide, Spin } from "@tokimo/ui";
import { FolderPlus, HardDrive } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../api/client";

export default function FinderContent() {
  const { currentWindowId, openWindow } = useWindowActions();
  const windows = useWindows();

  // Read current window's metadata (set by the opener, e.g. VFS settings page)
  const metadata = useMemo(() => {
    const win = windows.find((w) => w.id === currentWindowId);
    return (win?.metadata as Record<string, unknown>) ?? {};
  }, [windows, currentWindowId]);

  const fileSystemId = metadata.fileSystemId as string | undefined;

  const [currentPath, setCurrentPath] = useState<string>(
    (metadata.route as string) || "/",
  );

  const { data: fileSystems, isLoading: isVfsLoading } =
    api.vfs.list.useQuery();

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
        title="开始使用 Finder"
        description="连接存储源后即可浏览和管理文件"
        features={[
          { icon: HardDrive, label: "连接本地或远程存储" },
          { icon: FolderPlus, label: "浏览、创建、管理文件" },
        ]}
        actionLabel="添加存储源"
        actionIcon={FolderPlus}
        onAction={openVfsSettings}
      />
    );
  }

  // Determine which filesystem to show
  const activeFs = fileSystemId
    ? fileSystems.find((f) => f.id === fileSystemId)
    : fileSystems[0];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-black/10 dark:border-white/10 overflow-y-auto">
        <div className="p-3 text-xs font-semibold text-fg-muted uppercase tracking-wide">
          存储源
        </div>
        {fileSystems.map((fs) => (
          <button
            key={fs.id}
            type="button"
            onClick={() => setCurrentPath("/")}
            className={`w-full text-left px-3 py-2 text-sm cursor-pointer transition ${
              fs.id === activeFs?.id
                ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                : "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
            }`}
          >
            {fs.name}
          </button>
        ))}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {activeFs ? (
          <FileBrowser fileSystemId={activeFs.id} initialPath={currentPath} />
        ) : (
          <div className="flex h-full items-center justify-center text-fg-muted">
            选择一个存储源开始浏览
          </div>
        )}
      </main>
    </div>
  );
}

// ─── FileBrowser (minimal inline implementation) ──────────────────────

function FileBrowser({
  fileSystemId,
  initialPath,
}: {
  fileSystemId: string;
  initialPath: string;
}) {
  const [path, setPath] = useState(initialPath);

  const { data, isLoading, error } = api.vfs.browse.useQuery({
    fileSystemId,
    path,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        {error.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-black/10 dark:border-white/10 text-sm">
        {path
          .split("/")
          .filter(Boolean)
          .map((segment, i, arr) => {
            const segPath = `/${arr.slice(0, i + 1).join("/")}`;
            return (
              <span key={segPath} className="flex items-center gap-1">
                {i > 0 && <span className="text-fg-muted">/</span>}
                <button
                  type="button"
                  onClick={() => setPath(segPath)}
                  className="hover:text-[var(--color-accent)] cursor-pointer"
                >
                  {segment}
                </button>
              </span>
            );
          })}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {data?.entries.map((entry) => (
          <button
            key={entry.path}
            type="button"
            onClick={() => entry.isDirectory && setPath(entry.path)}
            className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.04] cursor-pointer"
          >
            <span className="text-sm">{entry.isDirectory ? "📁" : "📄"}</span>
            <span className="text-sm truncate">{entry.name}</span>
            {entry.size != null && (
              <span className="ml-auto text-xs text-fg-muted">
                {formatSize(entry.size)}
              </span>
            )}
          </button>
        ))}
        {data?.entries.length === 0 && (
          <div className="flex h-full items-center justify-center text-fg-muted">
            空文件夹
          </div>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
  return `${bytes} B`;
}
