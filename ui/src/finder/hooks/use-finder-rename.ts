import { useVfsMutation } from "../../../api/client";
import type { FileNode } from "@tokimo/ui";
import { getParentPath, joinPath, useInlineRename } from "@tokimo/ui";
import { useCallback } from "react";
import { api } from "../../generated/rust-api";
import type { UseFileManagerReturn } from "../components/useFileManager";

interface UseFinderRenameOptions {
  fm: UseFileManagerReturn;
  fileSystemId?: string;
  readOnly: boolean;
}

export function useFinderRename({
  fm,
  fileSystemId,
  readOnly,
}: UseFinderRenameOptions) {
  const renameMut = useVfsMutation(api.vfs.rename);

  const renameFn = useCallback(
    async (oldPath: string, newName: string) => {
      const parent = getParentPath(oldPath);
      const to = joinPath(parent, newName);
      if (!fileSystemId) return;
      await renameMut.mutateAsync({ from: oldPath, to, fileSystemId });
    },
    [fileSystemId, renameMut],
  );

  const inline = useInlineRename({
    renameFn,
    readOnly,
    onSuccess: fm.refresh,
    renaming: fm.renaming,
    setRenaming: fm.setRenaming,
  });

  const scheduleRename = useCallback(
    (node: FileNode) => inline.scheduleRename(node.path),
    [inline.scheduleRename],
  );

  return {
    cancelRenameTimer: inline.cancelRenameTimer,
    scheduleRename,
    handleInlineRename: inline.handleSubmit,
  };
}
