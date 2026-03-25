import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Dashboard } from "../components/admin/Dashboard";

const mockFetchAdminStats = vi.fn();

vi.mock("../hooks/useApi", () => ({
  fetchAdminStats: (...args: unknown[]) => mockFetchAdminStats(...args),
}));

const sampleStats = {
  promptCount: 42,
  bundleCount: 12,
  imageCount: 38,
  storageBytes: {
    images: 24223744,
    database: 1468006,
    total: 25691750,
  },
  lastUpdatedAt: "2026-03-25T14:30:00",
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中の表示", () => {
    mockFetchAdminStats.mockReturnValue(new Promise(() => {}));
    render(<Dashboard refreshKey={0} />);
    expect(screen.getByTestId("dashboard-loading")).toBeInTheDocument();
  });

  it("統計情報が表示される", async () => {
    mockFetchAdminStats.mockResolvedValue(sampleStats);
    render(<Dashboard refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    });
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByText(/24\.5 MB/)).toBeInTheDocument();
  });

  it("最終更新日時が表示される", async () => {
    mockFetchAdminStats.mockResolvedValue(sampleStats);
    render(<Dashboard refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    });
    expect(screen.getByText(/最終更新/)).toBeInTheDocument();
  });

  it("lastUpdatedAtがnullの場合は最終更新が表示されない", async () => {
    mockFetchAdminStats.mockResolvedValue({ ...sampleStats, lastUpdatedAt: null });
    render(<Dashboard refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    });
    expect(screen.queryByText(/最終更新/)).not.toBeInTheDocument();
  });

  it("エラー時にエラーメッセージが表示される", async () => {
    mockFetchAdminStats.mockRejectedValue(new Error("ネットワークエラー"));
    render(<Dashboard refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-error")).toBeInTheDocument();
    });
    expect(screen.getByText("ネットワークエラー")).toBeInTheDocument();
  });

  it("refreshKeyが変わると再取得される", async () => {
    mockFetchAdminStats.mockResolvedValue(sampleStats);
    const { rerender } = render(<Dashboard refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    });
    expect(mockFetchAdminStats).toHaveBeenCalledTimes(1);

    const updatedStats = { ...sampleStats, promptCount: 100 };
    mockFetchAdminStats.mockResolvedValue(updatedStats);
    rerender(<Dashboard refreshKey={1} />);
    await waitFor(() => {
      expect(screen.getByText("100")).toBeInTheDocument();
    });
    expect(mockFetchAdminStats).toHaveBeenCalledTimes(2);
  });

  it("ストレージの内訳が表示される", async () => {
    mockFetchAdminStats.mockResolvedValue(sampleStats);
    render(<Dashboard refreshKey={0} />);
    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    });
    expect(screen.getByText(/画像.*DB/)).toBeInTheDocument();
  });
});
