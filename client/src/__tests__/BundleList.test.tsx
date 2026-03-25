import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BundleList } from "../components/prompt-manager/BundleList";

const mockFetchBundles = vi.fn();

vi.mock("../hooks/useApi", () => ({
  fetchBundles: (...args: unknown[]) => mockFetchBundles(...args),
  getImageUrl: vi.fn((path: string) => `/api/images/${path}`),
}));

const sampleBundles = [
  {
    id: 1,
    title: "風景バンドル",
    description: "風景系のプロンプト集",
    image_path: null,
    item_count: 2,
    created_at: "2024-01-01T00:00:00",
    updated_at: "2024-01-01T00:00:00",
  },
  {
    id: 2,
    title: "人物バンドル",
    description: "人物系のプロンプト集",
    image_path: "bundle.jpg",
    item_count: 1,
    created_at: "2024-01-02T00:00:00",
    updated_at: "2024-01-02T00:00:00",
  },
];

describe("BundleList", () => {
  const defaultProps = {
    query: "",
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchBundles.mockResolvedValue({
      data: sampleBundles,
      total: 2,
    });
  });

  it("バンドル一覧が表示される", async () => {
    render(<BundleList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("風景バンドル")).toBeInTheDocument();
      expect(screen.getByText("人物バンドル")).toBeInTheDocument();
    });
  });

  it("fetchBundlesが正しいパラメータで呼ばれる", async () => {
    render(<BundleList {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetchBundles).toHaveBeenCalledWith("", 20, 0);
    });
  });

  it("検索クエリが渡されるとfetchBundlesに反映される", async () => {
    render(<BundleList {...defaultProps} query="風景" />);

    await waitFor(() => {
      expect(mockFetchBundles).toHaveBeenCalledWith("風景", 20, 0);
    });
  });

  it("空の結果で空状態メッセージが表示される", async () => {
    mockFetchBundles.mockResolvedValue({ data: [], total: 0 });
    render(<BundleList {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("保存されたバンドルはありません"),
      ).toBeInTheDocument();
    });
  });

  it("検索時の空結果で検索用メッセージが表示される", async () => {
    mockFetchBundles.mockResolvedValue({ data: [], total: 0 });
    render(<BundleList {...defaultProps} query="zzz" />);

    await waitFor(() => {
      expect(screen.getByText("見つかりませんでした")).toBeInTheDocument();
    });
  });

  it("エラー時にエラーメッセージが表示される", async () => {
    mockFetchBundles.mockRejectedValue(new Error("Network error"));
    render(<BundleList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("読み込みに失敗しました")).toBeInTheDocument();
    });
  });

  it("アイテム数が表示される", async () => {
    render(<BundleList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("2件のプロンプト")).toBeInTheDocument();
    });
    expect(screen.getByText("1件のプロンプト")).toBeInTheDocument();
  });

  it("編集ボタンクリックでonEditが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<BundleList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("風景バンドル")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("風景バンドルを編集"));
    expect(defaultProps.onEdit).toHaveBeenCalledWith(1);
  });

  it("削除ボタンクリックでonDeleteが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<BundleList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("風景バンドル")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("風景バンドルを削除"));
    expect(defaultProps.onDelete).toHaveBeenCalledWith(1, "風景バンドル");
  });

  it("画像がある場合imgタグが表示される", async () => {
    render(<BundleList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("人物バンドル")).toBeInTheDocument();
    });

    const images = document.querySelectorAll("img");
    expect(images.length).toBe(1);
    expect(images[0].getAttribute("src")).toBe("/api/images/bundle.jpg");
  });

  it("totalが20超の場合ページネーションが表示される", async () => {
    mockFetchBundles.mockResolvedValue({
      data: sampleBundles,
      total: 45,
    });
    render(<BundleList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("pagination")).toBeInTheDocument();
      expect(screen.getByTestId("pagination-info")).toHaveTextContent("1 / 3");
    });
  });

  it("次へボタンでページ遷移する", async () => {
    const user = userEvent.setup();
    mockFetchBundles.mockResolvedValue({
      data: sampleBundles,
      total: 45,
    });
    render(<BundleList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("pagination-next")).toBeInTheDocument();
    });

    mockFetchBundles.mockClear();
    await user.click(screen.getByTestId("pagination-next"));

    expect(mockFetchBundles).toHaveBeenCalledWith("", 20, 20);
  });
});
