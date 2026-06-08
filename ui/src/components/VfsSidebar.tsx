/**
 * 文件系统侧边栏 — 显示所有已配置的文件系统，按分类分组，支持收藏夹。
 * 支持 collapsed 图标模式（< 720px 时由父组件传入）。
 */

import { useWindowActions } from "@tokimo/sdk";
import { AppSidebar, Tooltip } from "@tokimo/ui";
import {
  Cloud,
  Database,
  Globe,
  HardDrive,
  Network,
  PanelLeft,
  PanelLeftClose,
  Server,
  Settings,
  Star,
} from "lucide-react";
import { useMemo } from "react";
import type { VfsDto } from "../api/client";
import { api } from "../api/client";
import type { VfsType } from "../types/vfs";
import {
  getVfsSidebarCategory,
  VFS_SIDEBAR_CATEGORY_LABELS,
} from "../types/vfs-sidebar-categories";
import { sourceTypeLabels } from "../types/vfs-types";

export const FAVORITES_KEY = "__favorites__";

const FS_TYPE_ICON: Record<string, typeof HardDrive> = {
  local: HardDrive,
  smb: Network,
  nfs: Network,
  ftp: Server,
  sftp: Server,
  webdav: Globe,
  s3: Database,
};

function getFsIcon(type: string) {
  return FS_TYPE_ICON[type] ?? Cloud;
}

function getFsDescription(fs: VfsDto): string | null {
  return fs.displayHints?.protocolPrefix ?? fs.displayHints?.rootPath ?? null;
}

function getFsTooltip(fs: VfsDto): string | undefined {
  const desc = getFsDescription(fs);
  if (desc) return desc;
  const label = sourceTypeLabels[fs.type as VfsType];
  return label ?? undefined;
}

interface VfsSidebarProps {
  /** VFS ID or FAVORITES_KEY */
  activeKey?: string;
  onSelect: (fs: VfsDto) => void;
  onSelectFavorites: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function VfsSidebar({
  activeKey,
  onSelect,
  onSelectFavorites,
  collapsed = false,
  onToggleCollapse,
}: VfsSidebarProps) {
  const windowManager = useWindowActions();
  const { data: fileSystems } = api.vfs.list.useQuery();

  const enabledSystems = useMemo(() => fileSystems ?? [], [fileSystems]);

  const openSettings = () =>
    windowManager.openWindow({
      type: "system",
      title: "系统设置",
      route: "/file-systems",
      metadata: { pageId: "system-settings" },
    });

  // Group VFS by category
  const grouped = useMemo(() => {
    const local: VfsDto[] = [];
    const remote: VfsDto[] = [];
    const cloud: VfsDto[] = [];
    for (const fs of enabledSystems) {
      const cat = getVfsSidebarCategory(fs.type);
      if (cat === "local") local.push(fs);
      else if (cat === "remote") remote.push(fs);
      else cloud.push(fs);
    }
    return { local, remote, cloud };
  }, [enabledSystems]);

  const makeItem = (fs: VfsDto) => {
    const Icon = getFsIcon(fs.type);
    return {
      key: fs.id,
      icon: <Icon size={16} />,
      label: fs.name,
      tooltip: getFsTooltip(fs),
    };
  };

  // ── Full (label) mode ─────────────────────────────────────────────
  const sections = [
    {
      label: "收藏夹",
      items: [
        {
          key: FAVORITES_KEY,
          icon: <Star size={16} className="text-yellow-500" />,
          label: "收藏",
        },
      ],
    },
    ...(grouped.local.length > 0
      ? [
          {
            label: VFS_SIDEBAR_CATEGORY_LABELS.local,
            items: grouped.local.map(makeItem),
          },
        ]
      : []),
    ...(grouped.remote.length > 0
      ? [
          {
            label: VFS_SIDEBAR_CATEGORY_LABELS.remote,
            items: grouped.remote.map(makeItem),
          },
        ]
      : []),
    ...(grouped.cloud.length > 0
      ? [
          {
            label: VFS_SIDEBAR_CATEGORY_LABELS.cloud,
            items: grouped.cloud.map(makeItem),
          },
        ]
      : []),
  ];

  const collapsedFooter = (
    <div className="flex flex-col items-center gap-1">
      <Tooltip title="文件系统设置" placement="right">
        <button
          type="button"
          onClick={openSettings}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
        >
          <Settings size={15} className="opacity-70" />
        </button>
      </Tooltip>
      <Tooltip title="展开侧边栏" placement="right">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
        >
          <PanelLeft size={15} className="opacity-70" />
        </button>
      </Tooltip>
    </div>
  );

  const fullFooter = (
    <div className="flex items-center">
      <button
        type="button"
        onClick={openSettings}
        className="flex flex-1 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-fg-muted transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
      >
        <Settings size={14} className="shrink-0 opacity-60" />
        <span>文件系统设置</span>
      </button>
      <Tooltip title="收起侧边栏">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
        >
          <PanelLeftClose size={14} className="opacity-70" />
        </button>
      </Tooltip>
    </div>
  );

  return (
    <AppSidebar
      sections={sections}
      collapsed={collapsed}
      activeKey={activeKey}
      onSelect={(key) => {
        if (key === FAVORITES_KEY) {
          onSelectFavorites();
          return;
        }
        const fs = enabledSystems.find((f) => f.id === key);
        if (fs) onSelect(fs);
      }}
      footer={collapsed ? collapsedFooter : fullFooter}
    />
  );
}
