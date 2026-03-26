import type { ReactNode } from "react";
import type { TabId } from "../../types";

interface TabPanelProps {
  tabId: TabId;
  active: boolean;
  keepMounted?: boolean;
  children: ReactNode;
}

export function TabPanel({ tabId, active, keepMounted, children }: TabPanelProps) {
  if (!active && !keepMounted) return null;

  return (
    <div
      id={`tabpanel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`tab-${tabId}`}
      style={!active ? { display: "none" } : undefined}
    >
      {children}
    </div>
  );
}
