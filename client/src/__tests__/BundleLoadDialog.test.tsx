import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BundleLoadDialog } from "../components/prompt-generator/BundleLoadDialog";

const mockFetchBundles = vi.fn();
const mockFetchBundle = vi.fn();
const mockGetImageUrl = vi.fn();

vi.mock("../hooks/useApi", () => ({
  fetchBundles: (...args: unknown[]) => mockFetchBundles(...args),
  fetchBundle: (...args: unknown[]) => mockFetchBundle(...args),
  getImageUrl: (...args: unknown[]) => mockGetImageUrl(...args),
}));

const sampleBundles = [
  {
    id: 1,
    title: "風景セット",
    description: "風景プロンプト集",
    image_path: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    items: [],
  },
  {
    id: 2,
    title: "人物セット",
    description: "人物プロンプト集",
    image_path: "test.jpg",
    created_at: "2024-01-02",
    updated_at: "2024-01-02",
    items: [],
  },
];

const fullBundle = {
  ...sampleBundles[0],
  items: [
    { title: "山", prompt: "mountain", has_break: 0, sort_order: 0 },
    { title: "川", prompt: "river", has_break: 1, sort_order: 1 },
  ],
};

describe("BundleLoadDialog", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchBundles.mockResolvedValue({
      data: sampleBundles,
      total: 2,
    });
    mockFetchBundle.mockResolvedValue(fullBundle);
    mockGetImageUrl.mockImplementation(
      (path: string) => `/api/images/${path}`,
    );
  });

  it("open=falseのとき何も表示しない", () => {
    render(<BundleLoadDialog {...defaultProps} open={false} />);
    expect(
      screen.queryByText("全体を呼び出し"),
    ).not.toBeInTheDocument();
  });

  it("open=trueのときダイアログが表示される", async () => {
    render(<BundleLoadDialog {...defaultProps} />);
    expect(screen.getByText("全体を呼び出し")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockFetchBundles).toHaveBeenCalled();
    });
  });

  it("バンドル一覧が表示される", async () => {
    render(<BundleLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("風景セット")).toBeInTheDocument();
      expect(screen.getByText("人物セット")).toBeInTheDocument();
    });
  });

  it("バンドルをクリックするとfetchBundleが呼ばれ、onSelectとonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<BundleLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("風景セット")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("bundle-load-item-1"));

    await waitFor(() => {
      expect(mockFetchBundle).toHaveBeenCalledWith(1);
      expect(defaultProps.onSelect).toHaveBeenCalledWith(fullBundle);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it("閉じるボタンでonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<BundleLoadDialog {...defaultProps} />);

    await user.click(screen.getByText("閉じる"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("読み込みエラー時にエラーメッセージが表示される", async () => {
    mockFetchBundles.mockRejectedValue(new Error("Network error"));
    render(<BundleLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("読み込みに失敗しました")).toBeInTheDocument();
    });
  });

  it("バンドル選択エラー時にエラーメッセージが表示される", async () => {
    const user = userEvent.setup();
    mockFetchBundle.mockRejectedValue(new Error("Not found"));
    render(<BundleLoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("風景セット")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("bundle-load-item-1"));

    await waitFor(() => {
      expect(
        screen.getByText("バンドルの読み込みに失敗しました"),
      ).toBeInTheDocument();
    });
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });
});
