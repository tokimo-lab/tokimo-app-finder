import { useCallback, useState } from "react";

export function useSidebarCollapsed(
  _scope: string,
  defaultCollapsed = false,
): { collapsed: boolean; onToggleCollapse: () => void } {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const onToggleCollapse = useCallback(() => {
    setCollapsed((v) => !v);
  }, []);

  return { collapsed, onToggleCollapse };
}
