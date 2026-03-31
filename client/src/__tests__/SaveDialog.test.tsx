import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SaveDialog } from "../components/prompt-generator/SaveDialog";

vi.mock("../hooks/useApi", () => ({
  savePrompt: vi.fn().mockResolvedValue({ id: 1 }),
  updatePrompt: vi.fn().mockResolvedValue({ id: 1 }),
  fetchPrompt: vi.fn().mockResolvedValue({ id: 1, description: "既存の説明" }),
  fetchTagKeys: vi.fn().mockResolvedValue([]),
  fetchTagValues: vi.fn().mockResolvedValue([]),
}));

describe("SaveDialog", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    title: "テストタイトル",
    prompt: "test prompt",
    hasBreak: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("open=falseのとき何も表示しない", () => {
    render(<SaveDialog {...defaultProps} open={false} />);
    expect(
      screen.queryByText("プロンプトを保存"),
    ).not.toBeInTheDocument();
  });

  it("open=trueのときダイアログが表示される", () => {
    render(<SaveDialog {...defaultProps} />);
    expect(screen.getByText("プロンプトを保存")).toBeInTheDocument();
    expect(screen.getByText("テストタイトル")).toBeInTheDocument();
  });

  it("説明文なしで保存するとエラーが表示される", async () => {
    const user = userEvent.setup();
    render(<SaveDialog {...defaultProps} />);

    await user.click(screen.getByText("保存"));
    expect(screen.getByTestId("save-error")).toHaveTextContent(
      "説明文は必須です",
    );
  });

  it("説明文を入力して保存するとonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    const { savePrompt } = await import("../hooks/useApi");
    render(<SaveDialog {...defaultProps} />);

    await user.type(screen.getByLabelText(/説明文/), "テスト説明");
    await user.click(screen.getByText("保存"));

    expect(savePrompt).toHaveBeenCalledWith({
      title: "テストタイトル",
      prompt: "test prompt",
      has_break: false,
      description: "テスト説明",
      tags: [],
    });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("キャンセルボタンでonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<SaveDialog {...defaultProps} />);

    await user.click(screen.getByText("キャンセル"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("オーバーレイクリックでonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<SaveDialog {...defaultProps} />);

    await user.click(screen.getByTestId("save-dialog-overlay"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
