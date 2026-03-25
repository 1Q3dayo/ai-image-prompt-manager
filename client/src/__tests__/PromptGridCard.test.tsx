import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptGridCard } from "../components/prompt-manager/PromptGridCard";

vi.mock("../hooks/useApi", () => ({
  getImageUrl: vi.fn((path: string) => `/api/images/${path}`),
}));

const samplePrompt = {
  id: 1,
  title: "風景プロンプト",
  prompt: "beautiful landscape",
  has_break: 0,
  description: "風景の説明",
  image_path: "test.jpg",
  created_at: "2024-01-01T00:00:00",
  updated_at: "2024-01-01T00:00:00",
};

describe("PromptGridCard", () => {
  const defaultProps = {
    prompt: samplePrompt,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  it("カードが表示される", () => {
    render(<PromptGridCard {...defaultProps} />);
    expect(screen.getByTestId("prompt-grid-card-1")).toBeInTheDocument();
  });

  it("タイトルがオーバーレイで表示される", () => {
    render(<PromptGridCard {...defaultProps} />);
    expect(screen.getByText("風景プロンプト")).toBeInTheDocument();
  });

  it("画像がある場合にimgが表示される", () => {
    render(<PromptGridCard {...defaultProps} />);
    const img = screen.getByRole("presentation");
    expect(img).toHaveAttribute("src", "/api/images/test.jpg");
  });

  it("画像がない場合にプレースホルダーが表示される", () => {
    render(<PromptGridCard {...defaultProps} prompt={{ ...samplePrompt, image_path: null }} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("編集ボタンで onEdit が呼ばれる", async () => {
    const user = userEvent.setup();
    render(<PromptGridCard {...defaultProps} />);
    await user.click(screen.getByLabelText("風景プロンプトを編集"));
    expect(defaultProps.onEdit).toHaveBeenCalledWith(1);
  });

  it("削除ボタンで onDelete が呼ばれる", async () => {
    const user = userEvent.setup();
    render(<PromptGridCard {...defaultProps} />);
    await user.click(screen.getByLabelText("風景プロンプトを削除"));
    expect(defaultProps.onDelete).toHaveBeenCalledWith(1, "風景プロンプト");
  });
});
