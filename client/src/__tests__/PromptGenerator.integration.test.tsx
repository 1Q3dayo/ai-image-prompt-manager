import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptGenerator } from "../components/prompt-generator/PromptGenerator";

const mockFetchBundles = vi.fn();
const mockFetchBundle = vi.fn();

vi.mock("../hooks/useApi", () => ({
  savePrompt: vi.fn().mockResolvedValue({ id: 1 }),
  saveBundle: vi.fn().mockResolvedValue({ id: 1 }),
  fetchPrompts: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  fetchBundles: (...args: unknown[]) => mockFetchBundles(...args),
  fetchBundle: (...args: unknown[]) => mockFetchBundle(...args),
  getImageUrl: vi.fn((path: string) => `/api/images/${path}`),
}));

describe("PromptGenerator 統合テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchBundles.mockResolvedValue({ data: [], total: 0 });
  });

  it("バンドル呼び出しでセットが置換される", async () => {
    const bundleList = [
      {
        id: 10,
        title: "テストバンドル",
        description: "説明",
        image_path: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        items: [],
      },
    ];
    mockFetchBundles.mockResolvedValue({
      data: bundleList,
      total: 1,
    });
    mockFetchBundle.mockResolvedValue({
      ...bundleList[0],
      items: [
        { title: "山", prompt: "mountain", has_break: 0, sort_order: 0 },
        { title: "川", prompt: "river", has_break: 1, sort_order: 1 },
      ],
    });

    const user = userEvent.setup();
    render(<PromptGenerator />);

    // 初期入力があることを確認
    const set0 = screen.getByTestId("input-set-0");
    await user.type(within(set0).getByLabelText("プロンプト"), "original");

    // バンドル呼び出しダイアログを開く
    await user.click(screen.getByText("全体呼び出し"));
    await waitFor(() => {
      expect(screen.getByText("全体を呼び出し")).toBeInTheDocument();
    });

    // バンドルを選択
    await waitFor(() => {
      expect(screen.getByText("テストバンドル")).toBeInTheDocument();
    });
    await user.click(screen.getByTestId("bundle-load-item-10"));

    // セットが置換されたことを確認
    await waitFor(() => {
      const newSet0 = screen.getByTestId("input-set-0");
      expect(within(newSet0).getByLabelText("タイトル")).toHaveValue("山");
      expect(within(newSet0).getByLabelText("プロンプト")).toHaveValue(
        "mountain",
      );
    });

    const newSet1 = screen.getByTestId("input-set-1");
    expect(within(newSet1).getByLabelText("タイトル")).toHaveValue("川");
    expect(within(newSet1).getByLabelText("プロンプト")).toHaveValue("river");

    // 元の入力は消えている
    expect(screen.queryByDisplayValue("original")).not.toBeInTheDocument();
  });

  it("空バンドル呼び出しでセットがクリアされ初期セットに戻る", async () => {
    const bundleList = [
      {
        id: 20,
        title: "空バンドル",
        description: "空の説明",
        image_path: null,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        items: [],
      },
    ];
    mockFetchBundles.mockResolvedValue({
      data: bundleList,
      total: 1,
    });
    mockFetchBundle.mockResolvedValue({
      ...bundleList[0],
      items: [],
    });

    const user = userEvent.setup();
    render(<PromptGenerator />);

    const set0 = screen.getByTestId("input-set-0");
    await user.type(within(set0).getByLabelText("プロンプト"), "something");

    await user.click(screen.getByText("全体呼び出し"));
    await waitFor(() => {
      expect(screen.getByText("空バンドル")).toBeInTheDocument();
    });
    await user.click(screen.getByTestId("bundle-load-item-20"));

    // loadSets([]) が呼ばれ、セットがリセットされる
    await waitFor(() => {
      const newSet0 = screen.getByTestId("input-set-0");
      expect(within(newSet0).getByLabelText("プロンプト")).toHaveValue("");
    });
    expect(screen.queryByDisplayValue("something")).not.toBeInTheDocument();
  });
});
