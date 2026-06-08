import type { Clipboard as ClipboardState, FileNode } from "@tokimo/ui";
import {
  type ContextMenuItem,
  guessContentType,
  isArchiveFile,
  isImageType,
  isPreviewable,
  useContextMenu,
} from "@tokimo/ui";
import {
  Archive,
  Clipboard,
  ClipboardCopy,
  Download,
  Eye,
  FileArchive,
  FilePlus,
  FileText,
  FolderOpen,
  Image,
  PackageOpen,
  Pencil,
  RefreshCw,
  Scissors,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface FileContextMenuActions {
  onOpen: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onSetAsWallpaper: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onRename: () => void;
  onDelete: () => void;
  onNewFolder: () => void;
  onNewTextFile: () => void;
  onRefresh: () => void;
  onExtractHere: () => void;
  onBrowseArchive: () => void;
  onCompress: () => void;
  onToggleFavorite: () => void;
  isFavorited: (node: FileNode) => boolean;
  /** Returns the submenu content (TransferToSubmenu) for the given selection */
  getTransferToContent: (node: FileNode, selectedCount: number) => ReactNode;
}

export function useFileContextMenu(
  actions: FileContextMenuActions,
  clipboard: ClipboardState | null,
) {
  const { t } = useTranslation();
  const { open, contextMenu } = useContextMenu();

  const buildNodeItems = (
    node: FileNode,
    selectedCount: number,
  ): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];
    const multi = selectedCount > 1;

    if (node.isDirectory) {
      items.push({
        key: "open",
        label: t("fileManager.ctx.open"),
        icon: <FolderOpen size={13} />,
        onClick: actions.onOpen,
        disabled: multi,
      });
    } else if (isPreviewable(node.name)) {
      items.push({
        key: "preview",
        label: t("fileManager.ctx.preview"),
        icon: <Eye size={13} />,
        onClick: actions.onPreview,
        disabled: multi,
      });
    }

    if (!node.isDirectory) {
      items.push({
        key: "download",
        label: t("fileManager.ctx.download"),
        icon: <Download size={13} />,
        onClick: actions.onDownload,
        disabled: multi,
      });

      if (isImageType(guessContentType(node.name))) {
        items.push({
          key: "set-wallpaper",
          label: t("fileManager.ctx.setAsWallpaper"),
          icon: <Image size={13} />,
          onClick: actions.onSetAsWallpaper,
          disabled: multi,
        });
      }
    }

    // Archive-specific actions
    if (!node.isDirectory && isArchiveFile(node.name)) {
      items.push(
        { key: "d-archive", type: "divider" },
        {
          key: "extract-here",
          label: t("fileManager.ctx.extractHere"),
          icon: <PackageOpen size={13} />,
          onClick: actions.onExtractHere,
          disabled: multi,
        },
        {
          key: "browse-archive",
          label: t("fileManager.ctx.browseArchive"),
          icon: <FileArchive size={13} />,
          onClick: actions.onBrowseArchive,
          disabled: multi,
        },
      );
    }

    // Compress (available for any selection)
    items.push({
      key: "compress",
      label: t("fileManager.ctx.compressTo"),
      icon: <Archive size={13} />,
      onClick: actions.onCompress,
    });

    // Favorite toggle
    const favorited = actions.isFavorited(node);
    items.push({
      key: "toggle-favorite",
      label: favorited
        ? t("fileManager.ctx.removeFromFavorites")
        : t("fileManager.ctx.addToFavorites"),
      icon: favorited ? (
        <Star size={13} className="fill-yellow-400 text-yellow-400" />
      ) : (
        <Star size={13} />
      ),
      onClick: actions.onToggleFavorite,
      disabled: multi,
    });

    items.push(
      { key: "d1", type: "divider" },
      {
        key: "cut",
        label: t("fileManager.ctx.cut"),
        icon: <Scissors size={13} />,
        onClick: actions.onCut,
      },
      {
        key: "copy",
        label: t("fileManager.ctx.copy"),
        icon: <ClipboardCopy size={13} />,
        onClick: actions.onCopy,
      },
      {
        key: "transfer-to",
        label: t("fileManager.ctx.transferTo"),
        icon: <Send size={13} />,
        submenuContent: actions.getTransferToContent(node, selectedCount),
      },
      { key: "d2", type: "divider" },
      {
        key: "rename",
        label: t("fileManager.ctx.rename"),
        icon: <Pencil size={13} />,
        onClick: actions.onRename,
        disabled: multi,
      },
      {
        key: "delete",
        label: multi
          ? `${t("fileManager.delete")} (${selectedCount})`
          : t("fileManager.delete"),
        icon: <Trash2 size={13} />,
        danger: true,
        onClick: actions.onDelete,
      },
    );

    return items;
  };

  const buildEmptyItems = (): ContextMenuItem[] => {
    return [
      {
        key: "new-folder",
        label: t("fileManager.newFolder"),
        icon: <FilePlus size={13} />,
        onClick: actions.onNewFolder,
      },
      {
        key: "new-text-file",
        label: t("fileManager.newTextFile"),
        icon: <FileText size={13} />,
        onClick: actions.onNewTextFile,
      },
      {
        key: "paste",
        label: t("fileManager.ctx.paste"),
        icon: <Clipboard size={13} />,
        onClick: actions.onPaste,
        disabled: !clipboard?.paths.length,
      },
      { key: "d3", type: "divider" },
      {
        key: "refresh",
        label: t("pathSelector.refresh"),
        icon: <RefreshCw size={13} />,
        onClick: actions.onRefresh,
      },
    ];
  };

  const openNodeMenu = (
    e: React.MouseEvent,
    node: FileNode,
    selectedCount: number,
  ) => {
    open(e, buildNodeItems(node, selectedCount));
  };

  const openEmptyMenu = (e: React.MouseEvent) => {
    open(e, buildEmptyItems());
  };

  return {
    openNodeMenu,
    openEmptyMenu,
    contextMenu: contextMenu as ReactNode,
  };
}
