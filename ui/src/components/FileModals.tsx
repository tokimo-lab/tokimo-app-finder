import { Button, Modal } from "@tokimo/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// Re-export from @tokimo/ui for backward compatibility
export { NewFolderModal } from "@tokimo/ui";

// ─── Rename Modal ───

interface RenameModalProps {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
  loading?: boolean;
}

export function RenameModal({
  open,
  currentName,
  onClose,
  onConfirm,
  loading,
}: RenameModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== currentName) onConfirm(trimmed);
    else onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t("fileManager.ctx.rename")}
      footer={null}
      width={400}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm border border-black/[0.12] dark:border-white/[0.12] bg-surface-raised outline-none focus:border-blue-500"
          onFocus={(e) => e.target.select()}
          // biome-ignore lint/a11y/noAutofocus: modal input needs focus
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button size="small" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            size="small"
            variant="primary"
            htmlType="submit"
            disabled={!name.trim() || loading}
            loading={loading}
          >
            {t("common.confirm")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
