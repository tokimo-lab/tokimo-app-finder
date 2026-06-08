/**
 * 通用文件管理器组件
 *
 * 支持 grid / list / column 三视图、面包屑导航、右键菜单、文件预览、
 * 新建文件夹、重命名、删除、移动、复制、拖放、剪贴板等操作。
 *
 * 所有状态与交互逻辑委托给 FinderProvider（Context 化架构）。
 *
 * @example
 * ```tsx
 * <FileManager fileSystemId={fileSystem.id} initialPath="/" />
 * ```
 */

import type { ViewMode } from "@tokimo/ui";
import { FinderProvider } from "../context/FinderProvider";
import { FinderLayout } from "./FinderLayout";
import { FinderModals } from "./FinderModals";

export interface FileManagerProps {
  /** 文件系统 ID */
  fileSystemId?: string;
  /** 初始路径 */
  initialPath?: string;
  /** 是否只读（隐藏写操作） */
  readOnly?: boolean;
  /** 来源类型标签（如 smb / local） */
  sourceType?: string;
  /** 来源地址（如 smb://10.0.0.10/media） */
  sourceLabel?: string;
  /** 关闭回调（用于在面包屑行显示关闭按钮） */
  onClose?: () => void;
  /** 视图模式变更回调 */
  onViewModeChange?: (mode: ViewMode) => void;
  /** 排序变更回调 */
  onSortChange?: (
    sortBy: "name" | "size" | "modifiedAt",
    sortDir: "asc" | "desc",
  ) => void;
  /** 路径导航回调（用于将当前路径同步到 URL） */
  onNavigate?: (path: string) => void;
}

export function FileManager({
  fileSystemId,
  initialPath = "/",
  readOnly = false,
  sourceType,
  sourceLabel,
  onClose,
  onViewModeChange,
  onSortChange,
  onNavigate,
}: FileManagerProps) {
  return (
    <FinderProvider
      fileSystemId={fileSystemId}
      initialPath={initialPath}
      readOnly={readOnly}
      sourceType={sourceType}
      sourceLabel={sourceLabel}
      onClose={onClose}
      onViewModeChange={onViewModeChange}
      onSortChange={onSortChange}
      onNavigate={onNavigate}
    >
      <FinderLayout />
      <FinderModals />
    </FinderProvider>
  );
}
