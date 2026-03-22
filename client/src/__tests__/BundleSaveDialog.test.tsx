import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BundleSaveDialog } from "../components/prompt-generator/BundleSaveDialog";

const mockSaveBundle = vi.fn();

vi.mock("../hooks/useApi", () => ({
  saveBundle: (...args: unknown[]) => mockSaveBundle(...args),
}));

describe("BundleSaveDialog", () => {
  const sampleSets = [
    { id: "1", title: "背景", prompt: "landscape", hasBreak: false },
    { id: "2", title: "人物", prompt: "portrait", hasBreak: true },
    { id: "3", title: "空", prompt: "", hasBreak: false },
  ];

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    sets: sampleSets,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveBundle.mockResolvedValue({ id: 1 });
  });

  it("open=falseのとき何も表示しない", () => {
    render(<BundleSaveDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("全体を保存")).not.toBeInTheDocument();
  });

  it("open=trueのときダイアログが表示される", () => {
    render(<BundleSaveDialog {...defaultProps} />);
    expect(screen.getByText("全体を保存")).toBeInTheDocument();
  });

  it("保存されるセット数が表示される（promptが空のセットは除外）", () => {
    render(<BundleSaveDialog {...defaultProps} />);
    expect(screen.getByText("保存されるセット: 2件")).toBeInTheDocument();
  });

  it("タイトルなしで保存するとエラーが表示される", async () => {
    const user = userEvent.setup();
    render(<BundleSaveDialog {...defaultProps} />);

    await user.type(screen.getByLabelText(/説明文/), "テスト");
    await user.click(screen.getByText("保存"));
    expect(screen.getByTestId("bundle-save-error")).toHaveTextContent(
      "タイトルは必須です",
    );
  });

  it("説明文なしで保存するとエラーが表示される", async () => {
    const user = userEvent.setup();
    render(<BundleSaveDialog {...defaultProps} />);

    await user.type(screen.getByLabelText(/タイトル/), "テスト");
    await user.click(screen.getByText("保存"));
    expect(screen.getByTestId("bundle-save-error")).toHaveTextContent(
      "説明文は必須です",
    );
  });

  it("正しく入力して保存するとsaveBundleが呼ばれonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<BundleSaveDialog {...defaultProps} />);

    await user.type(screen.getByLabelText(/タイトル/), "バンドル名");
    await user.type(screen.getByLabelText(/説明文/), "バンドル説明");
    await user.click(screen.getByText("保存"));

    expect(mockSaveBundle).toHaveBeenCalledWith({
      title: "バンドル名",
      description: "バンドル説明",
      items: [
        { title: "背景", prompt: "landscape", has_break: false },
        { title: "人物", prompt: "portrait", has_break: true },
      ],
      image: undefined,
    });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("キャンセルボタンでonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<BundleSaveDialog {...defaultProps} />);

    await user.click(screen.getByText("キャンセル"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
