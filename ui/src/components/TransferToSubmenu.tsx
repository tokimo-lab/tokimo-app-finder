/**
 * Cascading hover submenu for "传输到".
 *
 * State-driven keep-alive: each hover item reports open/close to its parent
 * via ActiveDescendantContext. The parent blocks its own close while any child
 * is open, and re-evaluates via isPointerInsideRef when the last child closes.
 *
 * - Hover a file system → opens its root directory panel
 * - Click a folder → transfers files to that folder
 * - Hover a folder → opens its subdirectory panel (recursive)
 */

import {
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  flip,
  offset,
  safePolygon,
  shift,
  size,
  useFloating,
  useFloatingNodeId,
  useHover,
  useInteractions,
  useTransitionStyles,
} from "@floating-ui/react";
import type { FileNode } from "@tokimo/ui";
import {
  ActiveDescendantContext,
  type ActiveDescendantControls,
  MaterialFileIcon,
} from "@tokimo/ui";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  Cloud,
  Database,
  Globe,
  HardDrive,
  Loader2,
  Network,
  Server,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";

/* ─── FS icon mapping ─── */

const FS_TYPE_ICON: Record<string, LucideIcon> = {
  local: HardDrive,
  smb: Network,
  nfs: Network,
  ftp: Server,
  sftp: Server,
  webdav: Globe,
  s3: Database,
};

function getFsIcon(type: string): LucideIcon {
  return FS_TYPE_ICON[type] ?? Cloud;
}

/* ─── Panel shell ─── */

function HoverPanel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: "var(--window-radius, 12px)",
        backdropFilter: "blur(var(--window-blur, 24px))",
        WebkitBackdropFilter: "blur(var(--window-blur, 24px))",
        maxHeight: "var(--submenu-avail-h, 600px)",
      }}
      className="w-[200px] border shadow-2xl overflow-hidden select-none flex flex-col bg-[rgba(255,255,255,calc(var(--window-opacity,85)/100))] border-black/[0.07] ring-1 ring-black/5 dark:bg-[rgba(18,18,28,calc(var(--window-opacity,85)/100))] dark:border-white/[0.09] dark:ring-white/[0.06] dark:shadow-black/60"
    >
      {children}
    </div>
  );
}

/* ─── useHoverFloat ─── */

function useHoverFloat(nodeId: string | undefined) {
  const myId = useId();
  const parentControls = useContext(ActiveDescendantContext);
  const [open, setOpen] = useState(false);

  const isPointerInsideRef = useRef(false);
  const openChildIds = useRef(new Set<string>());

  const myControls = useMemo<ActiveDescendantControls>(
    () => ({
      reportOpen: (childId: string) => {
        openChildIds.current.add(childId);
        parentControls.reportOpen(myId);
      },
      reportClose: (childId: string) => {
        openChildIds.current.delete(childId);
        if (openChildIds.current.size === 0 && !isPointerInsideRef.current) {
          setOpen(false);
          parentControls.reportClose(myId);
        }
      },
    }),
    [parentControls, myId],
  );

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (v) {
        setOpen(true);
        parentControls.reportOpen(myId);
      } else {
        if (openChildIds.current.size > 0) return;
        setOpen(false);
        parentControls.reportClose(myId);
      }
    },
    [parentControls, myId],
  );

  const { refs, floatingStyles, context } = useFloating({
    nodeId,
    open,
    onOpenChange: handleOpenChange,
    placement: "right-start",
    middleware: [
      offset({ mainAxis: 4, crossAxis: -4 }),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          // Direct DOM mutation — no React re-render
          const h = `${Math.max(120, availableHeight - 8)}px`;
          elements.floating.style.setProperty("--submenu-avail-h", h);
        },
      }),
    ],
  });

  const hover = useHover(context, {
    delay: { open: 0, close: 75 },
    move: false,
    handleClose: safePolygon(),
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  const { isMounted, styles: transitionStyles } = useTransitionStyles(context, {
    duration: 50,
    initial: { opacity: 0 },
  });

  return {
    myControls,
    isPointerInsideRef,
    refs,
    floatingStyles,
    getFloatingProps,
    getReferenceProps,
    isMounted,
    transitionStyles,
    open,
  };
}

/* ─── DirPanel — subdirectory list ─── */

interface DirPanelProps {
  fsId: string;
  fsName: string;
  path: string;
  onTransfer: (fsId: string, fsName: string, path: string) => void;
}

function DirPanel({ fsId, fsName, path, onTransfer }: DirPanelProps) {
  const { t } = useTranslation();

  const { data, isLoading } = api.vfs.browse.useQuery(
    { fileSystemId: fsId, path },
    { retry: false, staleTime: 30_000 },
  );

  const dirs = (data?.entries ?? []).filter((e) => e.isDirectory);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-5">
        <Loader2 size={15} className="animate-spin opacity-40" />
      </div>
    );
  }

  if (dirs.length === 0) {
    return (
      <p className="px-3 py-3 text-xs text-[var(--color-fg-muted)]">
        {t("fileManager.emptyFolder")}
      </p>
    );
  }

  return (
    <div className="overflow-y-auto overscroll-contain py-1 flex-1">
      {dirs.map((dir) => (
        <DirHoverItem
          key={dir.path}
          fsId={fsId}
          fsName={fsName}
          dirName={dir.name}
          dirPath={dir.path}
          onTransfer={onTransfer}
        />
      ))}
    </div>
  );
}

/* ─── DirHoverItem — click to transfer, hover to expand subdirs ─── */

interface DirHoverItemProps {
  fsId: string;
  fsName: string;
  dirName: string;
  dirPath: string;
  onTransfer: (fsId: string, fsName: string, path: string) => void;
}

function DirHoverItem({
  fsId,
  fsName,
  dirName,
  dirPath,
  onTransfer,
}: DirHoverItemProps) {
  const nodeId = useFloatingNodeId();
  const {
    myControls,
    isPointerInsideRef,
    refs,
    floatingStyles,
    getFloatingProps,
    getReferenceProps,
    isMounted,
    transitionStyles,
    open,
  } = useHoverFloat(nodeId);

  return (
    <FloatingNode id={nodeId}>
      <ActiveDescendantContext.Provider value={myControls}>
        <button
          ref={refs.setReference}
          type="button"
          className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-left text-[var(--color-fg-primary)] cursor-pointer ${open ? "bg-black/[0.04] dark:bg-white/[0.06]" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"}`}
          onClick={() => onTransfer(fsId, fsName, dirPath)}
          {...getReferenceProps({
            onPointerEnter: () => {
              isPointerInsideRef.current = true;
            },
            onPointerLeave: () => {
              isPointerInsideRef.current = false;
            },
          })}
        >
          <span className="shrink-0 opacity-70">
            <MaterialFileIcon name={dirName} isDirectory size={14} />
          </span>
          <span className="flex-1 truncate">{dirName}</span>
          <ChevronRight size={12} className="opacity-40 shrink-0" />
        </button>
        {isMounted && (
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-[9999]"
              {...getFloatingProps({
                onPointerEnter: () => {
                  isPointerInsideRef.current = true;
                },
                onPointerLeave: () => {
                  isPointerInsideRef.current = false;
                },
              })}
            >
              <div style={transitionStyles}>
                <HoverPanel>
                  <DirPanel
                    fsId={fsId}
                    fsName={fsName}
                    path={dirPath}
                    onTransfer={onTransfer}
                  />
                </HoverPanel>
              </div>
            </div>
          </FloatingPortal>
        )}
      </ActiveDescendantContext.Provider>
    </FloatingNode>
  );
}

/* ─── FsHoverItem — hover to expand root dirs ─── */

interface FsHoverItemProps {
  fsId: string;
  fsName: string;
  fsType: string;
  onTransfer: (fsId: string, fsName: string, path: string) => void;
}

function FsHoverItem({ fsId, fsName, fsType, onTransfer }: FsHoverItemProps) {
  const nodeId = useFloatingNodeId();
  const Icon = getFsIcon(fsType);
  const {
    myControls,
    isPointerInsideRef,
    refs,
    floatingStyles,
    getFloatingProps,
    getReferenceProps,
    isMounted,
    transitionStyles,
    open,
  } = useHoverFloat(nodeId);

  return (
    <FloatingNode id={nodeId}>
      <ActiveDescendantContext.Provider value={myControls}>
        <button
          ref={refs.setReference}
          type="button"
          className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-left text-[var(--color-fg-primary)] cursor-default ${open ? "bg-black/[0.04] dark:bg-white/[0.06]" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"}`}
          {...getReferenceProps({
            onPointerEnter: () => {
              isPointerInsideRef.current = true;
            },
            onPointerLeave: () => {
              isPointerInsideRef.current = false;
            },
          })}
        >
          <span className="shrink-0 opacity-60">
            <Icon size={14} />
          </span>
          <span className="flex-1 truncate">{fsName}</span>
          <ChevronRight size={12} className="opacity-40 shrink-0" />
        </button>
        {isMounted && (
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-[9999]"
              {...getFloatingProps({
                onPointerEnter: () => {
                  isPointerInsideRef.current = true;
                },
                onPointerLeave: () => {
                  isPointerInsideRef.current = false;
                },
              })}
            >
              <div style={transitionStyles}>
                <HoverPanel>
                  <DirPanel
                    fsId={fsId}
                    fsName={fsName}
                    path="/"
                    onTransfer={onTransfer}
                  />
                </HoverPanel>
              </div>
            </div>
          </FloatingPortal>
        )}
      </ActiveDescendantContext.Provider>
    </FloatingNode>
  );
}

/* ─── TransferToSubmenu — entry point ─── */

interface TransferToSubmenuProps {
  nodes: FileNode[];
  sourceFileSystemId: string;
  onTransfer: (dstFsId: string, dstFsLabel: string, dstPath: string) => void;
}

export function TransferToSubmenu({
  nodes,
  sourceFileSystemId,
  onTransfer,
}: TransferToSubmenuProps) {
  const { t } = useTranslation();

  const { data: fileSystems, isLoading: isFsLoading } = api.vfs.list.useQuery();
  const otherFileSystems = (fileSystems ?? []).filter(
    (fs) => fs.id !== sourceFileSystemId,
  );

  return (
    <FloatingTree>
      <div className="w-[220px]">
        {/* Header */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.07] min-h-[36px]">
          <span className="text-xs font-medium text-[var(--color-fg-secondary)] truncate flex-1">
            {t("fileManager.ctx.transferTo")}
          </span>
          {nodes.length > 1 && (
            <span className="text-xs text-[var(--color-fg-muted)] shrink-0">
              {nodes.length}
            </span>
          )}
        </div>

        {/* FS list */}
        <div className="py-1 max-h-[min(280px,calc(100vh-120px))] overflow-y-auto overscroll-contain">
          {isFsLoading ? (
            <div className="flex items-center justify-center py-5">
              <Loader2 size={16} className="animate-spin opacity-40" />
            </div>
          ) : otherFileSystems.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--color-fg-muted)]">
              {t("fileManager.ctx.noOtherFs")}
            </p>
          ) : (
            otherFileSystems.map((fs) => (
              <FsHoverItem
                key={fs.id}
                fsId={fs.id}
                fsName={fs.name}
                fsType={fs.type}
                onTransfer={onTransfer}
              />
            ))
          )}
        </div>
      </div>
    </FloatingTree>
  );
}
