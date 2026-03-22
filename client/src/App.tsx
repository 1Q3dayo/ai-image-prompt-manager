import { useState } from "react";
import { TabNavigation } from "./components/layout/TabNavigation";
import { TabPanel } from "./components/layout/TabPanel";
import type { TabId } from "./types";

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("generator");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">
            AI Image Prompt Manager
          </h1>
        </div>
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </header>

      <main className="p-4">
        <TabPanel tabId="generator" active={activeTab === "generator"}>
          <div data-testid="generator-panel">
            <p className="text-gray-500">プロンプトジェネレーター（実装予定）</p>
          </div>
        </TabPanel>

        <TabPanel tabId="manager" active={activeTab === "manager"}>
          <div data-testid="manager-panel">
            <p className="text-gray-500">プロンプトマネージャ（実装予定）</p>
          </div>
        </TabPanel>

        <TabPanel tabId="admin" active={activeTab === "admin"}>
          <div data-testid="admin-panel">
            <p className="text-gray-500">管理画面（実装予定）</p>
          </div>
        </TabPanel>
      </main>
    </div>
  );
}

export default App;
