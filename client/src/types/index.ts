export type TabId = "generator" | "manager" | "admin";

export interface Tab {
  id: TabId;
  label: string;
}

export const TABS: Tab[] = [
  { id: "generator", label: "プロンプトジェネレーター" },
  { id: "manager", label: "プロンプトマネージャ" },
  { id: "admin", label: "管理" },
];
