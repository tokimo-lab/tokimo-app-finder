import { useState } from "react";

export function useFinderColumn() {
  const [columnLeafPath, setColumnLeafPath] = useState<string | null>(null);

  return {
    columnLeafPath,
    setColumnLeafPath,
  };
}
