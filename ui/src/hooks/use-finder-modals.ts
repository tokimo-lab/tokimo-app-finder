import { useState } from "react";

export interface FinderModalsHookReturn {
  showNewTextFile: boolean;
  setShowNewTextFile: (open: boolean) => void;
  archivePreview: { path: string; name: string } | null;
  setArchivePreview: (v: { path: string; name: string } | null) => void;
  showCompress: boolean;
  setShowCompress: (open: boolean) => void;
}

export function useFinderModals(): FinderModalsHookReturn {
  const [showNewTextFile, setShowNewTextFile] = useState(false);
  const [archivePreview, setArchivePreview] = useState<{
    path: string;
    name: string;
  } | null>(null);
  const [showCompress, setShowCompress] = useState(false);

  return {
    showNewTextFile,
    setShowNewTextFile,
    archivePreview,
    setArchivePreview,
    showCompress,
    setShowCompress,
  };
}
