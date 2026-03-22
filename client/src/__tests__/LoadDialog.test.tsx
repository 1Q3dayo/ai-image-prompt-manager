import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoadDialog } from "../components/prompt-generator/LoadDialog";

const mockFetchPrompts = vi.fn();
const mockGetImageUrl = vi.fn();

vi.mock("../hooks/useApi", () => ({
  fetchPrompts: (...args: unknown[]) => mockFetchPrompts(...args),
  getImageUrl: (...args: unknown[]) => mockGetImageUrl(...args),
}));

const samplePrompts = [
  {
    id: 1,
    title: "風景プロンプト",
    prompt: "beautiful landscape",
    has_break: 0,
    description: "風景の説明",
    image_path: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  {
    id: 2,
    title: "人物プロンプト",
    prompt: "portrait photo",
    has_break: 1,
    description: "人物の説明",
    image_path: "test.jpg",
    created_at: "2024-01-02",
    updated_at: "2024-01-02",
  },
];

describe("LoadDialog", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPrompts.mockResolvedValue({
      data: samplePrompts,
      total: 2,
    });
    mockGetImageUrl.mockImplementation(
      (path: string) => `/api/images/${path}`,
    );
  });

  it("open=falseのとき何も表示しない", () => {
    render(<LoadDialog {...defaultProps} open={false} />);
    expect(
      screen.queryByText("プロンプトを呼び出し"),
    ).not.toBeInTheDocument();
  });

  it("open=trueのときダイアログと検索入力が表示される", async () => {
    render(<LoadDialog {...defaultProps} />);
    expect(screen.getByText("プロンプトを呼び出し")).toBeInTheDocument();
    expect(screen.getByTestId("load-search-input")).toBeInTheDocument();
  });

  it("保存済みプロンプトが一覧表示される", async () => {
    render(<LoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("風景プロンプト")).toBeInTheDocument();
      expect(screen.getByText("人物プロンプト")).toBeInTheDocument();
    });
  });

  it("プロンプトをクリックするとonSelectとonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<LoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("風景プロンプト")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("load-item-1"));
    expect(defaultProps.onSelect).toHaveBeenCalledWith(samplePrompts[0]);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("検索入力がデバウンスされてfetchPromptsを呼ぶ", async () => {
    const user = userEvent.setup();
    render(<LoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetchPrompts).toHaveBeenCalled();
    });

    mockFetchPrompts.mockClear();

    await user.type(screen.getByTestId("load-search-input"), "風景");

    await waitFor(() => {
      expect(mockFetchPrompts).toHaveBeenCalledWith("風景", 20);
    });
  });

  it("閉じるボタンでonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<LoadDialog {...defaultProps} />);

    await user.click(screen.getByText("閉じる"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("画像パスがある場合imgタグが表示される", async () => {
    render(<LoadDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("人物プロンプト")).toBeInTheDocument();
    });

    const images = document.querySelectorAll("img");
    expect(images.length).toBeGreaterThanOrEqual(1);
    expect(images[0].getAttribute("src")).toBe("/api/images/test.jpg");
  });
});
