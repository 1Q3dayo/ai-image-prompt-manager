import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptList } from "../components/prompt-manager/PromptList";

const mockFetchPrompts = vi.fn();

vi.mock("../hooks/useApi", () => ({
  fetchPrompts: (...args: unknown[]) => mockFetchPrompts(...args),
  getImageUrl: vi.fn((path: string) => `/api/images/${path}`),
}));

const samplePrompts = [
  {
    id: 1,
    title: "風景プロンプト",
    prompt: "beautiful landscape",
    has_break: 0,
    description: "風景の説明",
    image_path: null,
    created_at: "2024-01-01T00:00:00",
    updated_at: "2024-01-01T00:00:00",
  },
  {
    id: 2,
    title: "人物プロンプト",
    prompt: "portrait photo",
    has_break: 1,
    description: "人物の説明",
    image_path: "test.jpg",
    created_at: "2024-01-02T00:00:00",
    updated_at: "2024-01-02T00:00:00",
  },
];

describe("PromptList", () => {
  const defaultProps = {
    query: "",
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPrompts.mockResolvedValue({
      data: samplePrompts,
      total: 2,
    });
  });

  it("プロンプト一覧が表示される", async () => {
    render(<PromptList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("風景プロンプト")).toBeInTheDocument();
      expect(screen.getByText("人物プロンプト")).toBeInTheDocument();
    });
  });

  it("fetchPromptsが正しいパラメータで呼ばれる", async () => {
    render(<PromptList {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetchPrompts).toHaveBeenCalledWith("", 20, 0, []);
    });
  });

  it("検索クエリが渡されるとfetchPromptsに反映される", async () => {
    render(<PromptList {...defaultProps} query="風景" />);

    await waitFor(() => {
      expect(mockFetchPrompts).toHaveBeenCalledWith("風景", 20, 0, []);
    });
  });

  it("空の結果で空状態メッセージが表示される", async () => {
    mockFetchPrompts.mockResolvedValue({ data: [], total: 0 });
    render(<PromptList {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("保存されたプロンプトはありません"),
      ).toBeInTheDocument();
    });
  });

  it("検索時の空結果で検索用メッセージが表示される", async () => {
    mockFetchPrompts.mockResolvedValue({ data: [], total: 0 });
    render(<PromptList {...defaultProps} query="zzz" />);

    await waitFor(() => {
      expect(screen.getByText("見つかりませんでした")).toBeInTheDocument();
    });
  });

  it("エラー時にエラーメッセージが表示される", async () => {
    mockFetchPrompts.mockRejectedValue(new Error("Network error"));
    render(<PromptList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("読み込みに失敗しました")).toBeInTheDocument();
    });
  });

  it("編集ボタンクリックでonEditが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<PromptList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("風景プロンプト")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("風景プロンプトを編集"));
    expect(defaultProps.onEdit).toHaveBeenCalledWith(1);
  });

  it("削除ボタンクリックでonDeleteが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<PromptList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("風景プロンプト")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("風景プロンプトを削除"));
    expect(defaultProps.onDelete).toHaveBeenCalledWith(1, "風景プロンプト");
  });

  it("画像がある場合imgタグが表示される", async () => {
    render(<PromptList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("人物プロンプト")).toBeInTheDocument();
    });

    const images = document.querySelectorAll("img");
    expect(images.length).toBe(1);
    expect(images[0].getAttribute("src")).toBe("/api/images/test.jpg");
  });

  it("totalが20超の場合ページネーションが表示される", async () => {
    mockFetchPrompts.mockResolvedValue({
      data: samplePrompts,
      total: 45,
    });
    render(<PromptList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("pagination")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-info")).toHaveTextContent("1 / 3");
    });
  });

  it("次へボタンでページ遷移する", async () => {
    const user = userEvent.setup();
    mockFetchPrompts.mockResolvedValue({
      data: samplePrompts,
      total: 45,
    });
    render(<PromptList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("pagination-next")).toBeInTheDocument();
    });

    mockFetchPrompts.mockClear();
    await user.click(screen.getByTestId("pagination-next"));

    expect(mockFetchPrompts).toHaveBeenCalledWith("", 20, 20, []);
  });
});
