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

export interface PromptSet {
  id: string;
  title: string;
  prompt: string;
  hasBreak: boolean;
}
