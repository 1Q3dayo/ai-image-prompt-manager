import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminPanel } from "../components/admin/AdminPanel";

const mockFetchAdminStats = vi.fn();

vi.mock("../hooks/useApi", () => ({
  fetchAdminStats: (...args: unknown[]) => mockFetchAdminStats(...args),
  exportJson: vi.fn(),
  exportDb: vi.fn(),
  importJson: vi.fn(),
  importDb: vi.fn(),
}));

const sampleStats = {
  promptCount: 5,
  bundleCount: 2,
  imageCount: 3,
  storageBytes: { images: 1000, database: 500, total: 1500 },
  lastUpdatedAt: "2026-03-25T10:00:00",
};

describe("AdminPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAdminStats.mockResolvedValue(sampleStats);
  });

  it("ダッシュボード・エクスポート・インポートの各セクションが表示される", async () => {
    render(<AdminPanel />);
    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    });
    expect(screen.getByTestId("export-section")).toBeInTheDocument();
    expect(screen.getByTestId("import-section")).toBeInTheDocument();
  });

  it("admin-panel-contentが存在する", () => {
    render(<AdminPanel />);
    expect(screen.getByTestId("admin-panel-content")).toBeInTheDocument();
  });
});
