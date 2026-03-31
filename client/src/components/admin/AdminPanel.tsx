import { useState } from "react";
import { Dashboard } from "./Dashboard";
import { TagManagementSection } from "./TagManagementSection";
import { ExportSection } from "./ExportSection";
import { ImportSection } from "./ImportSection";

export function AdminPanel() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6" data-testid="admin-panel-content">
      <Dashboard refreshKey={refreshKey} />
      <TagManagementSection />
      <ExportSection />
      <ImportSection onImported={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}
