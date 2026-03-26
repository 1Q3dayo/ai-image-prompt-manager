import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteConfirmDialog } from "../components/prompt-manager/DeleteConfirmDialog";

describe("DeleteConfirmDialog", () => {
  const defaultProps = {
    title: "削除確認",
    message: "「テスト」を削除しますか？",
    onConfirm: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("タイトルとメッセージが表示される", () => {
    render(<DeleteConfirmDialog {...defaultProps} />);
    expect(screen.getByText("削除確認")).toBeInTheDocument();
    expect(
      screen.getByText("「テスト」を削除しますか？"),
    ).toBeInTheDocument();
  });

  it("キャンセルボタンでonCancelが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<DeleteConfirmDialog {...defaultProps} />);

    await user.click(screen.getByTestId("delete-dialog-cancel"));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("オーバーレイクリックでonCancelが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<DeleteConfirmDialog {...defaultProps} />);

    await user.click(screen.getByTestId("delete-dialog-overlay"));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("削除ボタンでonConfirmが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<DeleteConfirmDialog {...defaultProps} />);

    await user.click(screen.getByTestId("delete-dialog-confirm"));
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it("削除中はボタンが無効化される", async () => {
    const user = userEvent.setup();
    let resolveDelete: () => void;
    const onConfirm = vi.fn(
      () => new Promise<void>((resolve) => { resolveDelete = resolve; }),
    );
    render(<DeleteConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByTestId("delete-dialog-confirm"));
    expect(screen.getByTestId("delete-dialog-confirm")).toBeDisabled();
    expect(screen.getByTestId("delete-dialog-confirm")).toHaveTextContent(
      "処理中...",
    );

    resolveDelete!();
  });

  it("削除中はオーバーレイクリックでキャンセルされない", async () => {
    const user = userEvent.setup();
    let resolveDelete: () => void;
    const onConfirm = vi.fn(
      () => new Promise<void>((resolve) => { resolveDelete = resolve; }),
    );
    render(
      <DeleteConfirmDialog {...defaultProps} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByTestId("delete-dialog-confirm"));
    expect(screen.getByTestId("delete-dialog-confirm")).toBeDisabled();

    await user.click(screen.getByTestId("delete-dialog-overlay"));
    expect(defaultProps.onCancel).not.toHaveBeenCalled();

    resolveDelete!();
  });

  it("エラー時にエラーメッセージが表示される", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error("削除に失敗"));
    render(<DeleteConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByTestId("delete-dialog-confirm"));

    await waitFor(() => {
      expect(screen.getByTestId("delete-dialog-error")).toHaveTextContent(
        "削除に失敗",
      );
    });
    expect(screen.getByTestId("delete-dialog-confirm")).not.toBeDisabled();
  });
});
