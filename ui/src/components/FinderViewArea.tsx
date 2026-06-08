import { Spin } from "@tokimo/ui";
import { useFinder } from "../context";
import { FinderFileColumnView } from "./FinderFileColumnView";
import { FinderFileGrid } from "./FinderFileGrid";

export function FinderViewArea() {
  const { fm, view } = useFinder();

  return (
    <div ref={view.listAreaRef} className="flex-1 min-h-0">
      {fm.isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Spin size="small" />
        </div>
      ) : fm.viewMode === "column" ? (
        <FinderFileColumnView />
      ) : (
        <FinderFileGrid />
      )}
    </div>
  );
}
