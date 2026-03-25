import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptManager } from "../components/prompt-manager/PromptManager";

vi.mock("../hooks/useApi", () => ({
  fetchPrompts: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  fetchBundles: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  deletePrompt: vi.fn().mockResolvedValue(undefined),
  deleteBundle: vi.fn().mockResolvedValue(undefined),
  getImageUrl: vi.fn((path: string) => `/api/images/${path}`),
}));

describe("PromptManager", () => {
  it("セグメントコントロールが表示される", async () => {
    render(<PromptManager />);
    expect(screen.getByTestId("segment-control")).toBeInTheDocument();
    expect(screen.getByTestId("segment-prompts")).toBeInTheDocument();
    expect(screen.getByTestId("segment-bundles")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("prompt-list")).toBeInTheDocument();
    });
  });

  it("初期状態でプロンプトセグメントがアクティブ", async () => {
    render(<PromptManager />);
    expect(screen.getByTestId("segment-prompts")).toHaveClass("bg-blue-600");
    expect(screen.getByTestId("segment-bundles")).not.toHaveClass("bg-blue-600");
    await waitFor(() => {
      expect(screen.getByTestId("prompt-list")).toBeInTheDocument();
    });
  });

  it("バンドルセグメントに切り替えられる", async () => {
    const user = userEvent.setup();
    render(<PromptManager />);

    await user.click(screen.getByTestId("segment-bundles"));
    expect(screen.getByTestId("segment-bundles")).toHaveClass("bg-blue-600");
    expect(screen.getByTestId("segment-prompts")).not.toHaveClass("bg-blue-600");
  });

  it("検索入力が表示される", async () => {
    render(<PromptManager />);
    expect(screen.getByTestId("manager-search-input")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("prompt-list")).toBeInTheDocument();
    });
  });

  it("セグメント切替時に検索クエリがクリアされる", async () => {
    const user = userEvent.setup();
    render(<PromptManager />);

    const input = screen.getByTestId("manager-search-input");
    await user.type(input, "test");
    expect(input).toHaveValue("test");

    await user.click(screen.getByTestId("segment-bundles"));
    expect(input).toHaveValue("");
  });

  it("プロンプトセグメントでプロンプト一覧が表示される", async () => {
    render(<PromptManager />);
    await waitFor(() => {
      expect(screen.getByTestId("prompt-list")).toBeInTheDocument();
    });
  });

  it("バンドルセグメントでバンドル一覧が表示される", async () => {
    const user = userEvent.setup();
    render(<PromptManager />);

    await user.click(screen.getByTestId("segment-bundles"));
    await waitFor(() => {
      expect(screen.getByTestId("bundle-list")).toBeInTheDocument();
    });
  });
});
