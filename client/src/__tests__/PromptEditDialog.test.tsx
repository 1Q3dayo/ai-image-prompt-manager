import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptEditDialog } from "../components/prompt-manager/PromptEditDialog";

const mockFetchPrompt = vi.fn();
const mockUpdatePrompt = vi.fn();
const mockSavePrompt = vi.fn();

vi.mock("../hooks/useApi", () => ({
  fetchPrompt: (...args: unknown[]) => mockFetchPrompt(...args),
  updatePrompt: (...args: unknown[]) => mockUpdatePrompt(...args),
  savePrompt: (...args: unknown[]) => mockSavePrompt(...args),
  getImageUrl: vi.fn((path: string) => `/api/images/${path}`),
}));

const samplePrompt = {
  id: 1,
  title: "テストプロンプト",
  prompt: "test prompt text",
  has_break: 0,
  description: "テスト説明",
  image_path: "test.jpg",
  created_at: "2024-01-01T00:00:00",
  updated_at: "2024-01-01T00:00:00",
};

describe("PromptEditDialog", () => {
  const defaultProps = {
    promptId: 1,
    onClose: vi.fn(),
    onSaved: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPrompt.mockResolvedValue(samplePrompt);
    mockUpdatePrompt.mockResolvedValue(samplePrompt);
  });

  it("読み込み中表示の後フォームが表示される", async () => {
    render(<PromptEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-title-input")).toBeInTheDocument();
    });
    expect(screen.getByTestId("edit-title-input")).toHaveValue("テストプロンプト");
    expect(screen.getByTestId("edit-prompt-input")).toHaveValue("test prompt text");
    expect(screen.getByTestId("edit-has-break")).not.toBeChecked();
    expect(screen.getByTestId("edit-description-input")).toHaveValue("テスト説明");
  });

  it("fetchPromptが正しいIDで呼ばれる", async () => {
    render(<PromptEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetchPrompt).toHaveBeenCalledWith(1);
    });
  });

  it("取得失敗時にエラーが表示される", async () => {
    mockFetchPrompt.mockRejectedValue(new Error("取得失敗"));
    render(<PromptEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-prompt-error")).toHaveTextContent(
        "プロンプトの取得に失敗しました",
      );
    });
  });

  it("has_break=1のときチェックボックスがチェック済み", async () => {
    mockFetchPrompt.mockResolvedValue({ ...samplePrompt, has_break: 1 });
    render(<PromptEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-has-break")).toBeChecked();
    });
  });

  it("現在の画像が表示される", async () => {
    render(<PromptEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-current-image")).toBeInTheDocument();
    });
    expect(screen.getByTestId("edit-current-image")).toHaveAttribute(
      "src",
      "/api/images/test.jpg",
    );
  });

  it("画像がない場合は画像表示がない", async () => {
    mockFetchPrompt.mockResolvedValue({ ...samplePrompt, image_path: null });
    render(<PromptEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-title-input")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("edit-current-image")).not.toBeInTheDocument();
  });

  it("タイトル空でバリデーションエラー", async () => {
    const user = userEvent.setup();
    render(<PromptEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-title-input")).toBeInTheDocument();
    });

    await user.clear(screen.getByTestId("edit-title-input"));
    await user.click(screen.getByTestId("edit-prompt-save"));

    expect(screen.getByTestId("edit-prompt-error")).toHaveTextContent(
      "タイトルは必須です",
    );
    expect(mockUpdatePrompt).not.toHaveBeenCalled();
  });

  it("プロンプト空でバリデーションエラー", async () => {
    const user = userEvent.setup();
    render(<PromptEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-prompt-input")).toBeInTheDocument();
    });

    await user.clear(screen.getByTestId("edit-prompt-input"));
    await user.click(screen.getByTestId("edit-prompt-save"));

    expect(screen.getByTestId("edit-prompt-error")).toHaveTextContent(
      "プロンプトは必須です",
    );
  });

  it("保存成功でonSavedが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<PromptEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-title-input")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("edit-prompt-save"));

    await waitFor(() => {
      expect(defaultProps.onSaved).toHaveBeenCalled();
    });
    expect(mockUpdatePrompt).toHaveBeenCalledWith(1, {
      title: "テストプロンプト",
      prompt: "test prompt text",
      has_break: false,
      description: "テスト説明",
    });
  });

  it("保存失敗でエラーが表示される", async () => {
    mockUpdatePrompt.mockRejectedValue(new Error("保存失敗"));
    const user = userEvent.setup();
    render(<PromptEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-title-input")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("edit-prompt-save"));

    await waitFor(() => {
      expect(screen.getByTestId("edit-prompt-error")).toHaveTextContent(
        "保存失敗",
      );
    });
    expect(screen.getByTestId("edit-prompt-save")).not.toBeDisabled();
  });

  it("新規保存でsavePromptが呼ばれる", async () => {
    mockSavePrompt.mockResolvedValue(samplePrompt);
    const user = userEvent.setup();
    render(<PromptEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-title-input")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("edit-prompt-save-new"));

    await waitFor(() => {
      expect(defaultProps.onSaved).toHaveBeenCalled();
    });
    expect(mockSavePrompt).toHaveBeenCalledWith({
      title: "テストプロンプト",
      prompt: "test prompt text",
      has_break: false,
      description: "テスト説明",
      copy_image_from: "test.jpg",
    });
    expect(mockUpdatePrompt).not.toHaveBeenCalled();
  });

  it("キャンセルでonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<PromptEditDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-prompt-cancel")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("edit-prompt-cancel"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
