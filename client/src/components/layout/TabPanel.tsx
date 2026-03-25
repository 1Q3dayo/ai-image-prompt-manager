import type { ReactNode } from "react";
import type { TabId } from "../../types";

interface TabPanelProps {
  tabId: TabId;
  active: boolean;
  children: ReactNode;
}

export function TabPanel({ tabId, active, children }: TabPanelProps) {
  if (!active) return null;

  return (
    <div
      id={`tabpanel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`tab-${tabId}`}
    >
      {children}
    </div>
  );
}
