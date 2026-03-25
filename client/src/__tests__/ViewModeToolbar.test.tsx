import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewModeToolbar } from "../components/prompt-manager/ViewModeToolbar";

describe("ViewModeToolbar", () => {
  const defaultProps = {
    viewMode: "list" as const,
    imageSize: "sm" as const,
    onViewModeChange: vi.fn(),
    onImageSizeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ツールバーが表示される", () => {
    render(<ViewModeToolbar {...defaultProps} />);
    expect(screen.getByTestId("view-mode-toolbar")).toBeInTheDocument();
  });

  it("リスト/グリッド切替ボタンが表示される", () => {
    render(<ViewModeToolbar {...defaultProps} />);
    expect(screen.getByTestId("view-mode-list")).toBeInTheDocument();
    expect(screen.getByTestId("view-mode-grid")).toBeInTheDocument();
  });

  it("画像サイズ切替ボタンが表示される", () => {
    render(<ViewModeToolbar {...defaultProps} />);
    expect(screen.getByTestId("image-size-sm")).toBeInTheDocument();
    expect(screen.getByTestId("image-size-md")).toBeInTheDocument();
    expect(screen.getByTestId("image-size-lg")).toBeInTheDocument();
  });

  it("表示モード切替でコールバックが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<ViewModeToolbar {...defaultProps} />);
    await user.click(screen.getByTestId("view-mode-grid"));
    expect(defaultProps.onViewModeChange).toHaveBeenCalledWith("grid");
  });

  it("画像サイズ切替でコールバックが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<ViewModeToolbar {...defaultProps} />);
    await user.click(screen.getByTestId("image-size-lg"));
    expect(defaultProps.onImageSizeChange).toHaveBeenCalledWith("lg");
  });

  it("アクティブな表示モードがハイライトされる", () => {
    render(<ViewModeToolbar {...defaultProps} viewMode="grid" />);
    expect(screen.getByTestId("view-mode-grid").className).toContain("bg-blue-600");
    expect(screen.getByTestId("view-mode-list").className).not.toContain("bg-blue-600");
  });

  it("アクティブな画像サイズがハイライトされる", () => {
    render(<ViewModeToolbar {...defaultProps} imageSize="md" />);
    expect(screen.getByTestId("image-size-md").className).toContain("bg-blue-600");
    expect(screen.getByTestId("image-size-sm").className).not.toContain("bg-blue-600");
  });
});
