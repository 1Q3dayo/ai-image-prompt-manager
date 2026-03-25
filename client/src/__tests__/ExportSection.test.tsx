import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportSection } from "../components/admin/ExportSection";

const mockExportJson = vi.fn();
const mockExportDb = vi.fn();

vi.mock("../hooks/useApi", () => ({
  exportJson: (...args: unknown[]) => mockExportJson(...args),
  exportDb: (...args: unknown[]) => mockExportDb(...args),
}));

describe("ExportSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:fake"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("エクスポートセクションが表示される", () => {
    render(<ExportSection />);
    expect(screen.getByTestId("export-section")).toBeInTheDocument();
    expect(screen.getByText("データエクスポート")).toBeInTheDocument();
  });

  it("JSONエクスポートボタンが表示される", () => {
    render(<ExportSection />);
    expect(screen.getByTestId("export-json-button")).toBeInTheDocument();
  });

  it("DBエクスポートボタンが表示される", () => {
    render(<ExportSection />);
    expect(screen.getByTestId("export-db-button")).toBeInTheDocument();
  });

  it("画像含めるチェックボックスが表示される", () => {
    render(<ExportSection />);
    expect(screen.getByTestId("include-images-checkbox")).toBeInTheDocument();
  });

  it("JSONエクスポートが呼ばれる（画像なし）", async () => {
    const user = userEvent.setup();
    mockExportJson.mockResolvedValue(new Blob(["{}"]));
    render(<ExportSection />);
    await user.click(screen.getByTestId("export-json-button"));
    await waitFor(() => {
      expect(mockExportJson).toHaveBeenCalledWith(false);
    });
  });

  it("画像チェックでincludeImages=trueが渡される", async () => {
    const user = userEvent.setup();
    mockExportJson.mockResolvedValue(new Blob(["{}"]));
    render(<ExportSection />);
    await user.click(screen.getByTestId("include-images-checkbox"));
    await user.click(screen.getByTestId("export-json-button"));
    await waitFor(() => {
      expect(mockExportJson).toHaveBeenCalledWith(true);
    });
  });

  it("DBエクスポートが呼ばれる", async () => {
    const user = userEvent.setup();
    mockExportDb.mockResolvedValue(new Blob(["sqlite"]));
    render(<ExportSection />);
    await user.click(screen.getByTestId("export-db-button"));
    await waitFor(() => {
      expect(mockExportDb).toHaveBeenCalled();
    });
  });

  it("エクスポートエラーが表示される", async () => {
    const user = userEvent.setup();
    mockExportJson.mockRejectedValue(new Error("エクスポート失敗"));
    render(<ExportSection />);
    await user.click(screen.getByTestId("export-json-button"));
    await waitFor(() => {
      expect(screen.getByTestId("export-error")).toBeInTheDocument();
    });
    expect(screen.getByText("エクスポート失敗")).toBeInTheDocument();
  });
});
