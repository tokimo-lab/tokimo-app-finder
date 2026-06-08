import { useFinder } from "../context";
import { ArchivePreviewModal } from "./ArchivePreviewModal";
import { CompressModal } from "./CompressModal";
import { NewFolderModal } from "./FileModals";

export function FinderModals() {
  const { fm, fileSystemId, modals, interaction, mutations } = useFinder();

  return (
    <>
      <NewFolderModal
        open={modals.showNewFolder}
        onClose={() => fm.setShowNewFolder(false)}
        onConfirm={interaction.handleCreateFolder}
        loading={mutations.mkdirIsPending}
      />

      <NewFolderModal
        open={modals.showNewTextFile}
        onClose={() => modals.setShowNewTextFile(false)}
        onConfirm={interaction.handleCreateTextFile}
        loading={mutations.writeFileIsPending}
        titleKey="fileManager.newTextFile"
        defaultName="untitled.txt"
      />

      {modals.archivePreview && fileSystemId && (
        <ArchivePreviewModal
          open={Boolean(modals.archivePreview)}
          onClose={() => modals.setArchivePreview(null)}
          onRefresh={fm.refresh}
          fileSystemId={fileSystemId}
          archivePath={modals.archivePreview.path}
          archiveName={modals.archivePreview.name}
        />
      )}

      {modals.showCompress && fileSystemId && (
        <CompressModal
          open={modals.showCompress}
          onClose={() => modals.setShowCompress(false)}
          fileSystemId={fileSystemId}
          sourcePaths={Array.from(fm.selectedPaths)}
          sourceNames={fm.nodes
            .filter((n) => fm.selectedPaths.has(n.path))
            .map((n) => n.name)}
          currentPath={fm.currentPath}
          onSuccess={fm.refresh}
        />
      )}
    </>
  );
}
