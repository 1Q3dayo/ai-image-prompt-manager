import type { ReactNode } from "react";
import type { TabId } from "../../types";

interface TabPanelProps {
  tabId: TabId;
  active: boolean;
  children: ReactNode;
}

export function TabPanel({ tabId, active, children }: TabPanelProps) {
  return (
    <div
      id={`tabpanel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`tab-${tabId}`}
      style={{ display: active ? "block" : "none" }}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}
