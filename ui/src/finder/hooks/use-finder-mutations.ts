import type { FileNode } from "@tokimo/ui";
import {
  getPreviewKind,
  guessContentType,
  isArchiveFile,
  isImageType,
  joinPath,
  Modal,
} from "@tokimo/ui";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { CreateTransferRequest } from "../../apps/transfer/components/types";
import { api } from "../../generated/rust-api";
import { buildFileUrl } from "../../lib/file-url";
import { useUiPreference } from "../../shared/hooks/use-preference";
import { useWindowActions } from "../../system";
import { useMessage } from "../../system/notifications/useMessage";
import type { WallpaperPrefs } from "../../types";
import type { UseFileManagerReturn } from "../components/useFileManager";

interface UseFinderMutationsOptions {
  fm: UseFileManagerReturn;
  fileSystemId?: string;
  sourceType?: string;
  sourceLabel?: string;
  readOnly: boolean;
  createTransfer: (req: CreateTransferRequest) => Promise<string>;
  markPendingAndCheck: (tid: string) => void;
  setShowNewTextFile: (open: boolean) => void;
  setArchivePreview: (v: { path: string; name: string } | null) => void;
  setShowCompress: (open: boolean) => void;
  favSet: Set<string>;
  refetchFavs: () => void;
  contextMenuTarget: React.MutableRefObject<FileNode | null>;
}

export function useFinderMutations({
  fm,
  fileSystemId,
  sourceType,
  sourceLabel,
  readOnly,
  createTransfer,
  markPendingAndCheck,
  setShowNewTextFile,
  setArchivePreview,
  setShowCompress,
  favSet,
  refetchFavs,
  contextMenuTarget,
}: UseFinderMutationsOptions) {
  const { t } = useTranslation();
  const windowManager = useWindowActions();
  const message = useMessage();

  const mkdirMut = api.vfs.mkdir.useMutation({ onSuccess: fm.refresh });
  const deleteFileMut = api.vfs.deleteFile.useMutation({
    onSuccess: fm.refresh,
  });
  const deleteDirMut = api.vfs.deleteDir.useMutation({
    onSuccess: fm.refresh,
  });
  const moveMut = api.vfs.move.useMutation({ onSuccess: fm.refresh });
  const copyMut = api.vfs.copy.useMutation({ onSuccess: fm.refresh });
  const writeFileMut = api.vfs.writeFile.useMutation({
    onSuccess: fm.refresh,
  });
  const extractMut = api.vfs.archiveExtract.useMutation({
    onSuccess: fm.refresh,
  });
  const saveFsWallpaperMut = api.user.saveFsWallpaper.useMutation();
  const toggleFavMut = api.fileFavorites.toggle.useMutation();
  const wallpaperPref = useUiPreference<WallpaperPrefs>("wallpaper");
  const handleRequestDelete = useCallback(() => {
    let nodes = fm.nodes.filter((n) => fm.selectedPaths.has(n.path));
    if (nodes.length === 0 && contextMenuTarget.current) {
      const target = contextMenuTarget.current;
      const found = fm.nodes.find((n) => n.path === target.path);
      if (found) nodes = [found];
    }
    if (nodes.length === 0) return;
    const names = nodes.map((n) => n.name);
    const content =
      names.length === 1
        ? t("fileManager.deleteConfirmMsgNamed", { name: names[0] })
        : t("fileManager.deleteConfirmMsg", { count: names.length });
    Modal.confirm({
      title: t("fileManager.deleteConfirmTitle"),
      content,
      okText: t("fileManager.delete"),
      variant: "danger",
      onOk: () => {
        for (const node of nodes) {
          if (node.isDirectory) {
            deleteDirMut.mutate(
              { path: node.path, fileSystemId: fileSystemId! },
              { onSuccess: () => fm.refresh() },
            );
          } else {
            deleteFileMut.mutate(
              { path: node.path, fileSystemId: fileSystemId! },
              { onSuccess: () => fm.refresh() },
            );
          }
        }
        fm.clearSelection();
      },
    });
  }, [fm, fileSystemId, deleteFileMut, deleteDirMut, t, contextMenuTarget]);

  const handleCreateFolder = useCallback(
    (name: string) => {
      mkdirMut.mutate(
        { path: joinPath(fm.currentPath, name), fileSystemId: fileSystemId! },
        {
          onSuccess: () => {
            fm.setShowNewFolder(false);
            fm.refresh();
          },
        },
      );
    },
    [fm, fileSystemId, mkdirMut],
  );

  const handleCreateTextFile = useCallback(
    (name: string) => {
      const filePath = joinPath(fm.currentPath, name);
      writeFileMut.mutate(
        { path: filePath, content: "", fileSystemId: fileSystemId! },
        {
          onSuccess: () => {
            setShowNewTextFile(false);
            fm.refresh();
          },
        },
      );
    },
    [fm, fileSystemId, writeFileMut, setShowNewTextFile],
  );

  const handlePaste = useCallback(() => {
    if (!fm.clipboard || !fileSystemId) return;
    const isCrossFs = fm.clipboard.fileSystemId !== fileSystemId;

    if (isCrossFs) {
      const files = fm.clipboard.entries.map((entry) => ({
        srcPath: entry.path,
        dstPath:
          fm.currentPath === "/"
            ? `/${entry.name}`
            : `${fm.currentPath}/${entry.name}`,
        size: entry.size,
        isDirectory: entry.isDirectory,
      }));
      const req: CreateTransferRequest = {
        src: { kind: "fileSystem" as const, id: fm.clipboard.fileSystemId },
        dst: { kind: "fileSystem" as const, id: fileSystemId },
        srcLabel: fm.clipboard.sourceLabel || fm.clipboard.fileSystemId,
        dstLabel: sourceLabel ?? sourceType ?? fileSystemId,
        files,
      };
      createTransfer(req)
        .then((transferId) => {
          markPendingAndCheck(transferId);
          windowManager.openWindow({
            type: "transfer",
            title: t("transfer.title"),
            route: `/transfers/${transferId}`,
            metadata: { transferId },
          });
        })
        .catch((err: Error) => message.error(err.message));
      if (fm.clipboard.mode === "cut") fm.clearClipboard();
      return;
    }

    for (const srcPath of fm.clipboard.paths) {
      if (fm.clipboard.mode === "cut") {
        moveMut.mutate(
          { from: srcPath, toDir: fm.currentPath, fileSystemId },
          { onSuccess: () => fm.refresh() },
        );
      } else {
        const name = srcPath.split("/").filter(Boolean).pop() ?? "copy";
        const to = joinPath(fm.currentPath, name);
        copyMut.mutate(
          { from: srcPath, to, fileSystemId },
          { onSuccess: () => fm.refresh() },
        );
      }
    }
    if (fm.clipboard.mode === "cut") fm.clearClipboard();
  }, [
    fm,
    fileSystemId,
    moveMut,
    copyMut,
    createTransfer,
    windowManager,
    t,
    message,
    sourceLabel,
    sourceType,
    markPendingAndCheck,
  ]);

  const handleOpen = useCallback(
    (node: FileNode) => {
      if (node.isDirectory) {
        fm.navigateTo(node.path);
      } else {
        const kind = getPreviewKind(node.name);
        const winType = (kind === "none" ? "hex" : kind) as Parameters<
          typeof windowManager.openWindow
        >[0]["type"];
        windowManager.openWindow({
          type: winType,
          title: node.name,
          route: node.path,
          filePath: node.path,
          fileName: node.name,
          fileSystemId: fileSystemId ?? "",
        });
      }
    },
    [fm, windowManager, fileSystemId],
  );

  const handleTransferTo = useCallback(
    (
      dstFsId: string,
      dstFsLabel: string,
      dstPath: string,
      sourceNodes: FileNode[],
    ) => {
      if (!fileSystemId) return;
      const srcLabel = sourceLabel ?? sourceType ?? fileSystemId;
      const files = sourceNodes.map((n) => {
        const dstFilePath =
          dstPath === "/" ? `/${n.name}` : `${dstPath}/${n.name}`;
        return {
          srcPath: n.path,
          dstPath: dstFilePath,
          size: n.stat?.size ?? n.size ?? 0,
          isDirectory: !!n.isDirectory,
        };
      });
      const req: CreateTransferRequest = {
        src: { kind: "fileSystem", id: fileSystemId },
        dst: { kind: "fileSystem", id: dstFsId },
        srcLabel,
        dstLabel: dstFsLabel,
        files,
      };
      createTransfer(req).then((transferId) => {
        markPendingAndCheck(transferId);
        windowManager.openWindow({
          type: "transfer",
          title: t("transfer.title"),
          route: `/transfers/${transferId}`,
          metadata: { transferId },
        });
      });
    },
    [
      fileSystemId,
      sourceLabel,
      sourceType,
      createTransfer,
      windowManager,
      t,
      markPendingAndCheck,
    ],
  );

  const getContextMenuNodeActions = useCallback(() => {
    return {
      onOpen: () => {
        const node = contextMenuTarget.current;
        if (node) handleOpen(node);
      },
      onPreview: () => {
        const node = contextMenuTarget.current;
        if (node && !node.isDirectory) {
          const kind = getPreviewKind(node.name);
          const winType = (kind === "none" ? "hex" : kind) as Parameters<
            typeof windowManager.openWindow
          >[0]["type"];
          windowManager.openWindow({
            type: winType,
            title: node.name,
            route: node.path,
            filePath: node.path,
            fileName: node.name,
            fileSystemId: fileSystemId ?? "",
          });
        }
      },
      onDownload: () => {
        const node = contextMenuTarget.current;
        if (node && !node.isDirectory && fileSystemId) {
          const url = buildFileUrl(node.path, fileSystemId);
          if (url) {
            const a = document.createElement("a");
            a.href = url;
            a.download = node.name;
            a.click();
          }
        }
      },
      onSetAsWallpaper: async () => {
        const node = contextMenuTarget.current;
        if (!node || node.isDirectory || !fileSystemId) return;
        if (!isImageType(guessContentType(node.name))) return;
        try {
          const { key } = await saveFsWallpaperMut.mutateAsync({
            fileSystemId,
            path: node.path,
          });
          await wallpaperPref.put({
            wallpaperMode: "static",
            wallpaperKeys: [key],
          });
          message.success(t("userSettings.wallpaperSaved"));
        } catch (err) {
          message.error(
            err instanceof Error ? err.message : t("common.saveFailed"),
          );
        }
      },
      onCut: () => !readOnly && fm.setClipboard("cut"),
      onCopy: () => fm.setClipboard("copy"),
      onPaste: () => !readOnly && handlePaste(),
      onRename: () => {
        if (readOnly) return;
        const node = contextMenuTarget.current;
        if (node) fm.setRenaming(node.path);
      },
      onDelete: () => !readOnly && handleRequestDelete(),
      onNewFolder: () => !readOnly && fm.setShowNewFolder(true),
      onNewTextFile: () => !readOnly && setShowNewTextFile(true),
      onRefresh: () => fm.refresh(),
      onExtractHere: () => {
        if (readOnly) return;
        const node = contextMenuTarget.current;
        if (
          node &&
          !node.isDirectory &&
          isArchiveFile(node.name) &&
          fileSystemId
        ) {
          extractMut.mutate(
            { fileSystemId, path: node.path },
            {
              onSuccess: () => {
                message.success(t("fileManager.archive.extractAll"));
                fm.refresh();
              },
              onError: (err: Error) => message.error(err.message),
            },
          );
        }
      },
      onBrowseArchive: () => {
        const node = contextMenuTarget.current;
        if (node && !node.isDirectory && isArchiveFile(node.name)) {
          setArchivePreview({ path: node.path, name: node.name });
        }
      },
      onCompress: () => {
        if (readOnly || !fileSystemId) return;
        setShowCompress(true);
      },
      onToggleFavorite: () => {
        const node = contextMenuTarget.current;
        if (!node || !fileSystemId) return;
        toggleFavMut.mutate(
          {
            vfsId: fileSystemId,
            path: node.path,
            name: node.name,
            isDirectory: node.isDirectory ?? false,
          },
          { onSuccess: () => refetchFavs() },
        );
      },
      isFavorited: (node: FileNode) =>
        fileSystemId ? favSet.has(`${fileSystemId}:${node.path}`) : false,
    };
  }, [
    contextMenuTarget,
    handleOpen,
    windowManager,
    fileSystemId,
    saveFsWallpaperMut,
    wallpaperPref,
    message,
    t,
    readOnly,
    fm,
    handlePaste,
    handleRequestDelete,
    setShowNewTextFile,
    extractMut,
    setArchivePreview,
    setShowCompress,
    toggleFavMut,
    refetchFavs,
    favSet,
  ]);

  return {
    mkdirMut,
    deleteFileMut,
    deleteDirMut,
    moveMut,
    copyMut,
    writeFileMut,
    extractMut,
    handleRequestDelete,
    handleCreateFolder,
    handleCreateTextFile,
    handlePaste,
    handleOpen,
    handleTransferTo,
    getContextMenuNodeActions,
  };
}
