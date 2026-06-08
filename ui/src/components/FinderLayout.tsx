import { FileBreadcrumb, FileToolbar } from "@tokimo/ui";
import { useTranslation } from "react-i18next";
import { useFinder } from "../context";
import { FinderViewArea } from "./FinderViewArea";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function FinderLayout() {
  const { t } = useTranslation();
  const {
    fm,
    sourceType,
    sourceLabel,
    readOnly,
    onClose,
    drag,
    interaction,
    view,
  } = useFinder();

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: keyboard shortcut wrapper
    <div
      className={[
        "flex flex-col h-full",
        drag.isDragOver
          ? "outline-2 outline-dashed outline-blue-400/60 -outline-offset-2 bg-blue-500/5"
          : "",
      ].join(" ")}
      onKeyDown={interaction.handleKeyDown}
      onPaste={interaction.handleBrowserPaste}
      onDragOver={drag.handleContainerDragOver}
      onDragEnter={drag.handleContainerDragEnter}
      onDragLeave={drag.handleContainerDragLeave}
      onDrop={drag.handleContainerDrop}
      tabIndex={-1}
    >
      {/* Breadcrumb */}
      <div className="border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
        <FileBreadcrumb
          currentPath={view.effectivePath}
          onNavigate={view.navigateToWithCallback}
          sourceType={sourceType}
          sourceLabel={sourceLabel}
          onClose={onClose}
        />
      </div>

      {/* Toolbar */}
      {!readOnly && (
        <FileToolbar
          viewMode={fm.viewMode}
          sortBy={fm.sortBy}
          sortDir={fm.sortDir}
          showHidden={fm.showHidden}
          isFetching={fm.isFetching}
          onNewFolder={() => fm.setShowNewFolder(true)}
          onSetViewMode={view.viewPrefs.setViewMode}
          onSetSortBy={view.viewPrefs.setSortBy}
          onSetSortDir={view.viewPrefs.setSortDir}
          onSetShowHidden={view.viewPrefs.setShowHidden}
          onRefresh={fm.refresh}
        />
      )}

      {/* File list / grid / column */}
      <FinderViewArea />

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-black/[0.06] dark:border-white/[0.08] text-xs text-[var(--color-fg-disabled)] shrink-0 select-none">
        <span>
          {fm.nodes.length} {t("fileManager.items")}
          {fm.selectedPaths.size > 0
            ? ` · ${fm.selectedPaths.size} ${t("fileManager.selected")}${view.selectedSize > 0 ? ` · ${formatSize(view.selectedSize)}` : ""}`
            : view.totalSize > 0 && ` · ${formatSize(view.totalSize)}`}
        </span>
        <span className="truncate ml-4 font-mono opacity-80">
          {sourceLabel
            ? `${sourceLabel.replace(/\/$/, "")}${view.effectivePath}`
            : sourceType
              ? `${sourceType}://${view.effectivePath.replace(/^\//, "")}`
              : view.effectivePath}
        </span>
      </div>

      {/* Context menu portal */}
      {interaction.contextMenuPortal}
    </div>
  );
}
