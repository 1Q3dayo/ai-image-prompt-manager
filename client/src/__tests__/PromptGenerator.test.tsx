import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptGenerator } from "../components/prompt-generator/PromptGenerator";

vi.mock("../hooks/useApi", () => ({
  savePrompt: vi.fn().mockResolvedValue({ id: 1 }),
  fetchPrompts: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  getImageUrl: vi.fn((path: string) => `/api/images/${path}`),
}));

describe("PromptGenerator", () => {
  it("初期状態で入力セットが1つ表示される", () => {
    render(<PromptGenerator />);
    expect(screen.getByTestId("input-set-0")).toBeInTheDocument();
  });

  it("セット追加ボタンでセットが増える", async () => {
    const user = userEvent.setup();
    render(<PromptGenerator />);

    await user.click(screen.getByText("+ セット追加"));
    expect(screen.getByTestId("input-set-1")).toBeInTheDocument();
  });

  it("削除ボタンでセットが減る", async () => {
    const user = userEvent.setup();
    render(<PromptGenerator />);

    await user.click(screen.getByText("+ セット追加"));
    expect(screen.getByTestId("input-set-1")).toBeInTheDocument();

    const set1 = screen.getByTestId("input-set-1");
    await user.click(within(set1).getByLabelText("セット2を削除"));
    expect(screen.queryByTestId("input-set-1")).not.toBeInTheDocument();
  });

  it("タイトルとプロンプトを入力すると中央カラムに反映される", async () => {
    const user = userEvent.setup();
    render(<PromptGenerator />);

    const set0 = screen.getByTestId("input-set-0");
    await user.type(within(set0).getByLabelText("タイトル"), "背景");
    await user.type(within(set0).getByLabelText("プロンプト"), "landscape");

    const output = screen.getByTestId("human-readable-output");
    expect(output).toHaveTextContent("# 背景");
    expect(output).toHaveTextContent("landscape");
  });

  it("プロンプトを入力すると右カラムに反映される", async () => {
    const user = userEvent.setup();
    render(<PromptGenerator />);

    const set0 = screen.getByTestId("input-set-0");
    await user.type(within(set0).getByLabelText("プロンプト"), "test prompt");

    const output = screen.getByTestId("ai-ready-output");
    expect(output).toHaveTextContent("test prompt");
  });

  it("BREAKチェックで中央・右カラムにBREAKが表示される", async () => {
    const user = userEvent.setup();
    render(<PromptGenerator />);

    const set0 = screen.getByTestId("input-set-0");
    await user.type(within(set0).getByLabelText("プロンプト"), "test");
    await user.click(within(set0).getByLabelText("BREAK"));

    expect(screen.getByTestId("human-readable-output")).toHaveTextContent(
      "BREAK",
    );
    expect(screen.getByTestId("ai-ready-output")).toHaveTextContent("BREAK");
  });

  it("クリアボタンで全セットがリセットされる", async () => {
    const user = userEvent.setup();
    render(<PromptGenerator />);

    const set0 = screen.getByTestId("input-set-0");
    await user.type(within(set0).getByLabelText("タイトル"), "テスト");
    await user.type(within(set0).getByLabelText("プロンプト"), "prompt");

    await user.click(screen.getByText("クリア"));

    const newSet0 = screen.getByTestId("input-set-0");
    expect(within(newSet0).getByLabelText("タイトル")).toHaveValue("");
    expect(within(newSet0).getByLabelText("プロンプト")).toHaveValue("");
  });

  it("並び替え（上移動）でセットの順序が変わる", async () => {
    const user = userEvent.setup();
    render(<PromptGenerator />);

    await user.click(screen.getByText("+ セット追加"));

    const set0 = screen.getByTestId("input-set-0");
    const set1 = screen.getByTestId("input-set-1");
    await user.type(within(set0).getByLabelText("タイトル"), "A");
    await user.type(within(set1).getByLabelText("タイトル"), "B");

    await user.click(within(set1).getByLabelText("セット2を上に移動"));

    const newSet0 = screen.getByTestId("input-set-0");
    expect(within(newSet0).getByLabelText("タイトル")).toHaveValue("B");
  });

  it("3カラムレイアウトの各カラムヘッダーが表示される", () => {
    render(<PromptGenerator />);
    expect(screen.getByText("入力")).toBeInTheDocument();
    expect(screen.getByText("人間用表示")).toBeInTheDocument();
    expect(screen.getByText("AI用表示")).toBeInTheDocument();
  });

  it("保存ボタンでSaveDialogが開く", async () => {
    const user = userEvent.setup();
    render(<PromptGenerator />);

    const set0 = screen.getByTestId("input-set-0");
    await user.type(within(set0).getByLabelText("タイトル"), "テスト");
    await user.type(within(set0).getByLabelText("プロンプト"), "test");

    await user.click(within(set0).getByLabelText("セット1を保存"));
    expect(screen.getByText("プロンプトを保存")).toBeInTheDocument();
  });

  it("呼び出しボタンでLoadDialogが開く", async () => {
    const user = userEvent.setup();
    render(<PromptGenerator />);

    const set0 = screen.getByTestId("input-set-0");
    await user.click(within(set0).getByLabelText("セット1に呼び出し"));

    await waitFor(() => {
      expect(screen.getByText("プロンプトを呼び出し")).toBeInTheDocument();
    });
  });
});
