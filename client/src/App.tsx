import { useState, useCallback } from "react";
import { TabNavigation } from "./components/layout/TabNavigation";
import { TabPanel } from "./components/layout/TabPanel";
import { PromptGenerator } from "./components/prompt-generator/PromptGenerator";
import { PromptManager } from "./components/prompt-manager/PromptManager";
import { AdminPanel } from "./components/admin/AdminPanel";
import { GeneratorProvider } from "./contexts/GeneratorContext";
import type { TabId } from "./types";

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("generator");

  const navigateToGenerator = useCallback(() => {
    setActiveTab("generator");
  }, []);

  return (
    <GeneratorProvider>
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
          <TabPanel tabId="generator" active={activeTab === "generator"} keepMounted>
            <div data-testid="generator-panel">
              <PromptGenerator />
            </div>
          </TabPanel>

          <TabPanel tabId="manager" active={activeTab === "manager"}>
            <div data-testid="manager-panel">
              <PromptManager onNavigateToGenerator={navigateToGenerator} />
            </div>
          </TabPanel>

          <TabPanel tabId="admin" active={activeTab === "admin"}>
            <div data-testid="admin-panel">
              <AdminPanel />
            </div>
          </TabPanel>
        </main>
      </div>
    </GeneratorProvider>
  );
}

export default App;
