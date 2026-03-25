import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DangerConfirmDialog } from "../components/admin/DangerConfirmDialog";

describe("DangerConfirmDialog", () => {
  const defaultProps = {
    title: "危険な操作",
    message: "本当に実行しますか？",
    onConfirm: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("タイトルとメッセージが表示される", () => {
    render(<DangerConfirmDialog {...defaultProps} />);
    expect(screen.getByText("危険な操作")).toBeInTheDocument();
    expect(screen.getByText("本当に実行しますか？")).toBeInTheDocument();
  });

  it("確認テキストなしで即実行可能", async () => {
    const user = userEvent.setup();
    render(<DangerConfirmDialog {...defaultProps} />);
    await user.click(screen.getByTestId("danger-dialog-confirm"));
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it("確認テキストが一致するまでボタンが無効", async () => {
    const user = userEvent.setup();
    render(<DangerConfirmDialog {...defaultProps} confirmText="削除" />);
    expect(screen.getByTestId("danger-dialog-confirm")).toBeDisabled();
    await user.type(screen.getByTestId("danger-dialog-input"), "削除");
    expect(screen.getByTestId("danger-dialog-confirm")).toBeEnabled();
  });

  it("確認テキストが不一致だとボタンが無効のまま", async () => {
    const user = userEvent.setup();
    render(<DangerConfirmDialog {...defaultProps} confirmText="削除" />);
    await user.type(screen.getByTestId("danger-dialog-input"), "削");
    expect(screen.getByTestId("danger-dialog-confirm")).toBeDisabled();
  });

  it("キャンセルボタンでonCancelが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<DangerConfirmDialog {...defaultProps} />);
    await user.click(screen.getByTestId("danger-dialog-cancel"));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("オーバーレイクリックでonCancelが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<DangerConfirmDialog {...defaultProps} />);
    await user.click(screen.getByTestId("danger-dialog-overlay"));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("エラー時にエラーメッセージが表示される", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error("失敗しました"));
    render(<DangerConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    await user.click(screen.getByTestId("danger-dialog-confirm"));
    await waitFor(() => {
      expect(screen.getByTestId("danger-dialog-error")).toBeInTheDocument();
    });
    expect(screen.getByText("失敗しました")).toBeInTheDocument();
  });

  it("confirmLabelでボタンテキストをカスタマイズできる", () => {
    render(<DangerConfirmDialog {...defaultProps} confirmLabel="リストア実行" />);
    expect(screen.getByTestId("danger-dialog-confirm")).toHaveTextContent("リストア実行");
  });
});
