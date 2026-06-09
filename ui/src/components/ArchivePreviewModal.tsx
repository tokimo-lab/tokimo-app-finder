import { useMutation } from "@tanstack/react-query";
import {
  Button,
  formatFileSize,
  MaterialFileIcon,
  Modal,
  Spin,
} from "@tokimo/ui";
import { Download, FileArchive, Lock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ArchiveEntryInfo } from "../api/client";
import { api } from "../api/client";
import { useMessage } from "../hooks/use-message";
import { useErrorDisplay } from "../lib/error-display";

interface ArchivePreviewModalProps {
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  fileSystemId: string;
  archivePath: string;
  archiveName: string;
}

export function ArchivePreviewModal({
  open,
  onClose,
  onRefresh,
  fileSystemId,
  archivePath,
  archiveName,
}: ArchivePreviewModalProps) {
  const { t } = useTranslation();
  const message = useMessage();
  const errorDisplay = useErrorDisplay();

  const [entries, setEntries] = useState<ArchiveEntryInfo[]>([]);
  const [format, setFormat] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [extractingEntry, setExtractingEntry] = useState<string | null>(null);
  const [extractingAll, setExtractingAll] = useState(false);

  // All callbacks at useMutation level so they are not dropped when React
  // StrictMode simulates unmount between the two effect invocations.
  const listMut = useMutation({
    mutationFn: api.vfs.archiveList,
    onSuccess: (data) => {
      setEntries(data.entries);
      setFormat(data.format);
      setNeedsPassword(false);
    },
    onError: (err) => {
      if (
        err.message.toLowerCase().includes("password") ||
        err.message.toLowerCase().includes("密码")
      ) {
        setNeedsPassword(true);
      } else {
        errorDisplay?.error(err.message);
      }
    },
    // onSettled ensures loading is cleared on both success and error paths.
    onSettled: () => setLoading(false),
  });
  const extractFileMut = useMutation({
    mutationFn: api.vfs.archiveExtractFile,
  });
  const extractAllMut = useMutation({ mutationFn: api.vfs.archiveExtract });

  const loadEntries = useCallback(
    (pw?: string) => {
      setLoading(true);
      listMut.mutate({
        fileSystemId,
        path: archivePath,
        password: pw || undefined,
      });
    },
    // listMut.mutate is stable across renders per React Query contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fileSystemId, archivePath, listMut.mutate],
  );

  // Ref so the effect always calls the latest loadEntries without needing it as a dep.
  const loadEntriesRef = useRef(loadEntries);
  loadEntriesRef.current = loadEntries;

  // Tracks whether the initial fetch has been started for the current open session.
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      hasFetchedRef.current = false;
      return;
    }
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    setEntries([]);
    setFormat("");
    setPassword("");
    setNeedsPassword(false);
    loadEntriesRef.current();

    // Reset the guard on cleanup so React StrictMode's simulated unmount/remount
    // allows the re-mounted component to trigger a fresh fetch (the first mount's
    // callbacks are dropped when StrictMode simulates the unmount).
    return () => {
      hasFetchedRef.current = false;
    };
  }, [open]);

  const handleExtractFile = useCallback(
    (entry: string) => {
      setExtractingEntry(entry);
      extractFileMut.mutate(
        {
          fileSystemId,
          path: archivePath,
          entry,
          password: password || undefined,
        },
        {
          onSuccess: () => {
            message.success(t("fileManager.archive.extractFile"));
            setExtractingEntry(null);
            onRefresh?.();
          },
          onError: (err: Error) => {
            message.error(err.message);
            setExtractingEntry(null);
          },
        },
      );
    },
    [
      fileSystemId,
      archivePath,
      password,
      extractFileMut,
      message,
      t,
      onRefresh,
    ],
  );

  const handleExtractAll = useCallback(() => {
    setExtractingAll(true);
    extractAllMut.mutate(
      {
        fileSystemId,
        path: archivePath,
        password: password || undefined,
      },
      {
        onSuccess: () => {
          message.success(t("fileManager.archive.extractAll"));
          setExtractingAll(false);
          onRefresh?.();
          onClose();
        },
        onError: (err: Error) => {
          message.error(err.message);
          setExtractingAll(false);
        },
      },
    );
  }, [
    fileSystemId,
    archivePath,
    password,
    extractAllMut,
    message,
    t,
    onClose,
    onRefresh,
  ]);

  const fileEntries = entries.filter((e) => !e.isDir);
  const dirEntries = entries.filter((e) => e.isDir);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <span className="flex items-center gap-2">
          <FileArchive size={16} />
          {archiveName}
          {format && (
            <span className="text-xs font-normal text-[var(--color-fg-muted)] ml-1">
              ({format})
            </span>
          )}
        </span>
      }
      footer={null}
      width={640}
    >
      <div className="flex flex-col gap-3">
        {/* Password input (if needed) */}
        {needsPassword && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadEntries(password);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Lock
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-fg-disabled)]"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("fileManager.archive.passwordPlaceholder")}
                className="w-full rounded-lg pl-8 pr-3 py-1.5 text-sm border border-black/[0.12] dark:border-white/[0.12] bg-surface-raised outline-none focus:border-blue-500"
                // biome-ignore lint/a11y/noAutofocus: need focus for password entry
                autoFocus
              />
            </div>
            <Button size="small" variant="primary" htmlType="submit">
              {t("common.confirm")}
            </Button>
          </form>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Spin size="small" />
          </div>
        )}

        {/* Entry list */}
        {!loading && !needsPassword && entries.length > 0 && (
          <>
            {/* Header with extract all */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-fg-muted)]">
                {entries.length} {t("fileManager.items")}
              </span>
              <Button
                size="small"
                variant="primary"
                onClick={handleExtractAll}
                loading={extractingAll}
                disabled={extractingAll}
              >
                {extractingAll
                  ? t("fileManager.archive.extracting")
                  : t("fileManager.archive.extractAll")}
              </Button>
            </div>

            {/* Scrollable entry list */}
            <div className="max-h-[400px] overflow-y-auto rounded-lg border border-black/[0.06] dark:border-white/[0.08]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface-base/80 backdrop-blur">
                  <tr className="text-left text-[var(--color-fg-muted)]">
                    <th className="px-3 py-1.5 font-medium">
                      {t("fileManager.archive.name")}
                    </th>
                    <th className="px-3 py-1.5 font-medium w-20 text-right">
                      {t("fileManager.archive.size")}
                    </th>
                    <th className="px-3 py-1.5 font-medium w-10" />
                  </tr>
                </thead>
                <tbody>
                  {dirEntries.map((entry) => (
                    <tr
                      key={entry.path}
                      className="border-t border-black/[0.04] dark:border-white/[0.04]"
                    >
                      <td className="px-3 py-1.5">
                        <span className="flex items-center gap-1.5">
                          <MaterialFileIcon
                            name={entry.path.split("/").pop() || entry.path}
                            isDirectory
                            size={15}
                          />
                          <span className="truncate">{entry.path}</span>
                          {entry.encrypted && (
                            <Lock
                              size={11}
                              className="text-amber-500 shrink-0"
                            />
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right text-[var(--color-fg-disabled)]">
                        —
                      </td>
                      <td className="px-3 py-1.5" />
                    </tr>
                  ))}
                  {fileEntries.map((entry) => (
                    <tr
                      key={entry.path}
                      className="border-t border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-1.5">
                        <span className="flex items-center gap-1.5">
                          <MaterialFileIcon
                            name={entry.path.split("/").pop() || entry.path}
                            size={15}
                          />
                          <span className="truncate">{entry.path}</span>
                          {entry.encrypted && (
                            <Lock
                              size={11}
                              className="text-amber-500 shrink-0"
                            />
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right text-[var(--color-fg-disabled)] whitespace-nowrap">
                        {formatFileSize(entry.size)}
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          type="button"
                          className="p-0.5 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-primary)] transition-colors"
                          onClick={() => handleExtractFile(entry.path)}
                          disabled={extractingEntry === entry.path}
                          title={t("fileManager.archive.extractFile")}
                        >
                          {extractingEntry === entry.path ? (
                            <Spin size="small" />
                          ) : (
                            <Download size={13} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && !needsPassword && entries.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-[var(--color-fg-muted)]">
            {t("fileManager.archive.emptyArchive")}
          </div>
        )}
      </div>
    </Modal>
  );
}
