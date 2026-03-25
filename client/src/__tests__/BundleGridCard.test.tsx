import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BundleGridCard } from "../components/prompt-manager/BundleGridCard";

vi.mock("../hooks/useApi", () => ({
  getImageUrl: vi.fn((path: string) => `/api/images/${path}`),
}));

const sampleBundle = {
  id: 1,
  title: "テストバンドル",
  description: "バンドル説明",
  image_path: "bundle.jpg",
  item_count: 5,
  created_at: "2024-01-01T00:00:00",
  updated_at: "2024-01-01T00:00:00",
};

describe("BundleGridCard", () => {
  const defaultProps = {
    bundle: sampleBundle,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  it("カードが表示される", () => {
    render(<BundleGridCard {...defaultProps} />);
    expect(screen.getByTestId("bundle-grid-card-1")).toBeInTheDocument();
  });

  it("タイトルとアイテム数がオーバーレイで表示される", () => {
    render(<BundleGridCard {...defaultProps} />);
    expect(screen.getByText("テストバンドル")).toBeInTheDocument();
    expect(screen.getByText("5件")).toBeInTheDocument();
  });

  it("画像がある場合にimgが表示される", () => {
    render(<BundleGridCard {...defaultProps} />);
    const img = screen.getByRole("presentation");
    expect(img).toHaveAttribute("src", "/api/images/bundle.jpg");
  });

  it("画像がない場合にプレースホルダーが表示される", () => {
    render(<BundleGridCard {...defaultProps} bundle={{ ...sampleBundle, image_path: null }} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("編集ボタンで onEdit が呼ばれる", async () => {
    const user = userEvent.setup();
    render(<BundleGridCard {...defaultProps} />);
    await user.click(screen.getByLabelText("テストバンドルを編集"));
    expect(defaultProps.onEdit).toHaveBeenCalledWith(1);
  });

  it("削除ボタンで onDelete が呼ばれる", async () => {
    const user = userEvent.setup();
    render(<BundleGridCard {...defaultProps} />);
    await user.click(screen.getByLabelText("テストバンドルを削除"));
    expect(defaultProps.onDelete).toHaveBeenCalledWith(1, "テストバンドル");
  });
});
