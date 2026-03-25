import { useRef, type KeyboardEvent } from "react";
import type { TabId } from "../../types";
import { TABS } from "../../types";

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());

  const handleKeyDown = (e: KeyboardEvent) => {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    let nextIndex: number | null = null;

    switch (e.key) {
      case "ArrowRight":
        nextIndex = (currentIndex + 1) % TABS.length;
        break;
      case "ArrowLeft":
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = TABS.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    const nextTab = TABS[nextIndex];
    onTabChange(nextTab.id);
    tabRefs.current.get(nextTab.id)?.focus();
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="flex gap-0" role="tablist" onKeyDown={handleKeyDown}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
            }}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            role="tab"
            tabIndex={activeTab === tab.id ? 0 : -1}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
