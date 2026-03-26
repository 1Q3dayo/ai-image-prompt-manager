import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BundleEditDialog } from "../components/prompt-manager/BundleEditDialog";

const mockFetchBundle = vi.fn();
const mockUpdateBundle = vi.fn();
const mockSaveBundle = vi.fn();

vi.mock("../hooks/useApi", () => ({
  fetchBundle: (...args: unknown[]) => mockFetchBundle(...args),
  updateBundle: (...args: unknown[]) => mockUpdateBundle(...args),
  saveBundle: (...args: unknown[]) => mockSaveBundle(...args),
  getImageUrl: vi.fn((path: string) => `/api/images/${path}`),
}));

const sampleBundle = {
  id: 1,
  title: "テストバンドル",
  description: "テスト説明",
  image_path: "bundle.jpg",
  created_at: "2024-01-01T00:00:00",
  updated_at: "2024-01-01T00:00:00",
  items: [
    { title: "プロンプト1", prompt: "prompt1", has_break: 0, sort_order: 0 },
    { title: "プロンプト2", prompt: "prompt2", has_break: 1, sort_order: 1 },
  ],
};

describe("BundleEditDialog", () => {
  const defaultProps = {
    bundleId: 1,
    onClose: vi.fn(),
    onSaved: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchBundle.mockResolvedValue(sampleBundle);
    mockUpdateBundle.mockResolvedValue(sampleBundle);
  });

  it("読み込み後フォームが表示される", async () => {
    render(<BundleEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-bundle-title-input")).toBeInTheDocument();
    });
    expect(screen.getByTestId("edit-bundle-title-input")).toHaveValue("テストバンドル");
    expect(screen.getByTestId("edit-bundle-description-input")).toHaveValue("テスト説明");
  });

  it("fetchBundleが正しいIDで呼ばれる", async () => {
    render(<BundleEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetchBundle).toHaveBeenCalledWith(1);
    });
  });

  it("取得失敗時にエラーが表示される", async () => {
    mockFetchBundle.mockRejectedValue(new Error("取得失敗"));
    render(<BundleEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-bundle-error")).toHaveTextContent(
        "バンドルの取得に失敗しました",
      );
    });
  });

  it("現在の画像が表示される", async () => {
    render(<BundleEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-bundle-current-image")).toBeInTheDocument();
    });
    expect(screen.getByTestId("edit-bundle-current-image")).toHaveAttribute(
      "src",
      "/api/images/bundle.jpg",
    );
  });

  it("アイテム一覧が読み取り専用で表示される", async () => {
    render(<BundleEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-bundle-items")).toBeInTheDocument();
    });
    expect(screen.getByText("プロンプト1")).toBeInTheDocument();
    expect(screen.getByText("プロンプト2")).toBeInTheDocument();
    expect(screen.getByText("含まれるプロンプト（2件）")).toBeInTheDocument();
  });

  it("タイトル空でバリデーションエラー", async () => {
    const user = userEvent.setup();
    render(<BundleEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-bundle-title-input")).toBeInTheDocument();
    });

    await user.clear(screen.getByTestId("edit-bundle-title-input"));
    await user.click(screen.getByTestId("edit-bundle-save"));

    expect(screen.getByTestId("edit-bundle-error")).toHaveTextContent(
      "タイトルは必須です",
    );
    expect(mockUpdateBundle).not.toHaveBeenCalled();
  });

  it("保存成功でonSavedが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<BundleEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-bundle-title-input")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("edit-bundle-save"));

    await waitFor(() => {
      expect(defaultProps.onSaved).toHaveBeenCalled();
    });
    expect(mockUpdateBundle).toHaveBeenCalledWith(1, {
      title: "テストバンドル",
      description: "テスト説明",
    });
  });

  it("保存失敗でエラーが表示される", async () => {
    mockUpdateBundle.mockRejectedValue(new Error("保存失敗"));
    const user = userEvent.setup();
    render(<BundleEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-bundle-title-input")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("edit-bundle-save"));

    await waitFor(() => {
      expect(screen.getByTestId("edit-bundle-error")).toHaveTextContent(
        "保存失敗",
      );
    });
  });

  it("新規保存でsaveBundleが呼ばれる", async () => {
    mockSaveBundle.mockResolvedValue(sampleBundle);
    const user = userEvent.setup();
    render(<BundleEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-bundle-title-input")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("edit-bundle-save-new"));

    await waitFor(() => {
      expect(defaultProps.onSaved).toHaveBeenCalled();
    });
    expect(mockSaveBundle).toHaveBeenCalledWith({
      title: "テストバンドル",
      description: "テスト説明",
      items: [
        { title: "プロンプト1", prompt: "prompt1", has_break: false },
        { title: "プロンプト2", prompt: "prompt2", has_break: true },
      ],
      copy_image_from: "bundle.jpg",
    });
    expect(mockUpdateBundle).not.toHaveBeenCalled();
  });

  it("キャンセルでonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<BundleEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-bundle-cancel")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("edit-bundle-cancel"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
