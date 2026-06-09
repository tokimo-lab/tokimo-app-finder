import { useVfsMutation } from "../../api/client";
import { Button, joinPath, Modal } from "@tokimo/ui";
import { Lock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useMessage } from "../hooks/use-message";

const ARCHIVE_FORMATS = [
  { value: "zip", label: "ZIP (.zip)", supportsPassword: true },
  { value: "tar.gz", label: "TAR.GZ (.tar.gz)", supportsPassword: false },
  { value: "tar.bz2", label: "TAR.BZ2 (.tar.bz2)", supportsPassword: false },
  { value: "tar.xz", label: "TAR.XZ (.tar.xz)", supportsPassword: false },
  { value: "tar.zst", label: "TAR.ZST (.tar.zst)", supportsPassword: false },
  { value: "7z", label: "7Z (.7z)", supportsPassword: true },
] as const;

interface CompressModalProps {
  open: boolean;
  onClose: () => void;
  fileSystemId: string;
  /** VFS paths of the files/folders to compress */
  sourcePaths: string[];
  /** Names of the selected files (for default archive name) */
  sourceNames: string[];
  /** Current directory path */
  currentPath: string;
  onSuccess?: () => void;
}

export function CompressModal({
  open,
  onClose,
  fileSystemId,
  sourcePaths,
  sourceNames,
  currentPath,
  onSuccess,
}: CompressModalProps) {
  const { t } = useTranslation();
  const message = useMessage();

  const [format, setFormat] = useState("zip");
  const [archiveName, setArchiveName] = useState("");
  const [password, setPassword] = useState("");

  const createMut = useVfsMutation(api.vfs.archiveCreate);

  // Derive default archive name from selection
  useEffect(() => {
    if (open) {
      const defaultName =
        sourceNames.length === 1
          ? sourceNames[0]
          : `archive-${new Date().toISOString().slice(0, 10)}`;
      setArchiveName(defaultName);
      setFormat("zip");
      setPassword("");
    }
  }, [open, sourceNames]);

  const selectedFormat = ARCHIVE_FORMATS.find((f) => f.value === format);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const name = archiveName.trim();
      if (!name || sourcePaths.length === 0) return;

      const ext = `.${format}`;
      const fullName = name.endsWith(ext) ? name : `${name}${ext}`;
      const archivePath = joinPath(currentPath, fullName);

      createMut.mutate(
        {
          fileSystemId,
          archivePath,
          sources: sourcePaths,
          password:
            selectedFormat?.supportsPassword && password ? password : undefined,
        },
        {
          onSuccess: () => {
            message.success(t("fileManager.archive.compressConfirm"));
            onSuccess?.();
            onClose();
          },
          onError: (err: Error) => {
            message.error(err.message);
          },
        },
      );
    },
    [
      archiveName,
      format,
      password,
      sourcePaths,
      currentPath,
      fileSystemId,
      selectedFormat,
      createMut,
      message,
      t,
      onSuccess,
      onClose,
    ],
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t("fileManager.archive.compressTitle")}
      footer={null}
      width={440}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Selected items summary */}
        <div className="text-xs text-[var(--color-fg-muted)] bg-surface-base/50 rounded-lg px-3 py-2">
          {sourceNames.length <= 3
            ? sourceNames.join(", ")
            : `${sourceNames.slice(0, 3).join(", ")} +${sourceNames.length - 3}`}
        </div>

        {/* Archive name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="archive-name"
            className="text-xs font-medium text-[var(--color-fg-secondary)]"
          >
            {t("fileManager.archive.archiveName")}
          </label>
          <input
            id="archive-name"
            type="text"
            value={archiveName}
            onChange={(e) => setArchiveName(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm border border-black/[0.12] dark:border-white/[0.12] bg-surface-raised outline-none focus:border-blue-500"
            // biome-ignore lint/a11y/noAutofocus: modal input needs focus
            autoFocus
          />
        </div>

        {/* Format selector */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="archive-format"
            className="text-xs font-medium text-[var(--color-fg-secondary)]"
          >
            {t("fileManager.archive.formatLabel")}
          </label>
          <select
            id="archive-format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm border border-black/[0.12] dark:border-white/[0.12] bg-surface-raised outline-none focus:border-blue-500 appearance-none"
          >
            {ARCHIVE_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Password (only for formats that support it) */}
        {selectedFormat?.supportsPassword && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="archive-password"
              className="text-xs font-medium text-[var(--color-fg-secondary)]"
            >
              {t("fileManager.archive.passwordPlaceholder")}
            </label>
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-fg-disabled)]"
              />
              <input
                id="archive-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("fileManager.archive.passwordPlaceholder")}
                className="w-full rounded-lg pl-8 pr-3 py-2 text-sm border border-black/[0.12] dark:border-white/[0.12] bg-surface-raised outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button size="small" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            size="small"
            variant="primary"
            htmlType="submit"
            disabled={!archiveName.trim() || createMut.isPending}
            loading={createMut.isPending}
          >
            {createMut.isPending
              ? t("fileManager.archive.creating")
              : t("fileManager.archive.compressConfirm")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
