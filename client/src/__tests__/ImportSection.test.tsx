import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportSection } from "../components/admin/ImportSection";

const mockImportJson = vi.fn();
const mockImportDb = vi.fn();

vi.mock("../hooks/useApi", () => ({
  importJson: (...args: unknown[]) => mockImportJson(...args),
  importDb: (...args: unknown[]) => mockImportDb(...args),
}));

function createFile(name: string, content: string, type = "application/json") {
  return new File([content], name, { type });
}

describe("ImportSection", () => {
  const onImported = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("インポートセクションが表示される", () => {
    render(<ImportSection onImported={onImported} />);
    expect(screen.getByTestId("import-section")).toBeInTheDocument();
  });

  it("ファイル未選択ではインポートボタンが無効", () => {
    render(<ImportSection onImported={onImported} />);
    expect(screen.getByTestId("import-json-button")).toBeDisabled();
    expect(screen.getByTestId("import-db-button")).toBeDisabled();
  });

  it("appendモードではファイル選択後に直接インポート", async () => {
    const user = userEvent.setup();
    mockImportJson.mockResolvedValue({
      imported: { prompts: 3, bundles: 1, images: 0 },
    });
    render(<ImportSection onImported={onImported} />);

    await user.click(screen.getByTestId("mode-append"));
    const file = createFile("test.json", "{}");
    await user.upload(screen.getByTestId("json-file-input"), file);
    await user.click(screen.getByTestId("import-json-button"));

    await waitFor(() => {
      expect(mockImportJson).toHaveBeenCalledWith(file, "append");
    });
    expect(screen.getByTestId("import-result")).toBeInTheDocument();
    expect(screen.getByText(/プロンプト 3件/)).toBeInTheDocument();
    expect(onImported).toHaveBeenCalled();
  });

  it("replaceモードでは確認ダイアログが表示される", async () => {
    const user = userEvent.setup();
    render(<ImportSection onImported={onImported} />);

    const file = createFile("test.json", "{}");
    await user.upload(screen.getByTestId("json-file-input"), file);
    await user.click(screen.getByTestId("import-json-button"));

    expect(screen.getByTestId("danger-dialog-overlay")).toBeInTheDocument();
    expect(screen.getByText(/全置換インポート/)).toBeInTheDocument();
  });

  it("replaceの確認ダイアログで実行するとインポートされる", async () => {
    const user = userEvent.setup();
    mockImportJson.mockResolvedValue({
      imported: { prompts: 2, bundles: 0, images: 1 },
    });
    render(<ImportSection onImported={onImported} />);

    const file = createFile("test.json", "{}");
    await user.upload(screen.getByTestId("json-file-input"), file);
    await user.click(screen.getByTestId("import-json-button"));
    await user.click(screen.getByTestId("danger-dialog-confirm"));

    await waitFor(() => {
      expect(mockImportJson).toHaveBeenCalledWith(file, "replace");
    });
    expect(onImported).toHaveBeenCalled();
  });

  it("replaceの確認ダイアログでキャンセルするとインポートされない", async () => {
    const user = userEvent.setup();
    render(<ImportSection onImported={onImported} />);

    const file = createFile("test.json", "{}");
    await user.upload(screen.getByTestId("json-file-input"), file);
    await user.click(screen.getByTestId("import-json-button"));
    await user.click(screen.getByTestId("danger-dialog-cancel"));

    expect(mockImportJson).not.toHaveBeenCalled();
    expect(screen.queryByTestId("danger-dialog-overlay")).not.toBeInTheDocument();
  });

  it("DBリストアでは確認テキスト入力付きダイアログが表示される", async () => {
    const user = userEvent.setup();
    render(<ImportSection onImported={onImported} />);

    const file = createFile("backup.sqlite", "data", "application/octet-stream");
    await user.upload(screen.getByTestId("db-file-input"), file);
    await user.click(screen.getByTestId("import-db-button"));

    expect(screen.getByTestId("danger-dialog-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("danger-dialog-input")).toBeInTheDocument();
    expect(screen.getByTestId("danger-dialog-confirm")).toBeDisabled();
  });

  it("DBリストアで確認テキスト入力後に実行できる", async () => {
    const user = userEvent.setup();
    mockImportDb.mockResolvedValue({ status: "ok" });
    render(<ImportSection onImported={onImported} />);

    const file = createFile("backup.sqlite", "data", "application/octet-stream");
    await user.upload(screen.getByTestId("db-file-input"), file);
    await user.click(screen.getByTestId("import-db-button"));
    await user.type(screen.getByTestId("danger-dialog-input"), "リストア");
    await user.click(screen.getByTestId("danger-dialog-confirm"));

    await waitFor(() => {
      expect(mockImportDb).toHaveBeenCalledWith(file);
    });
    expect(screen.getByText("データベースをリストアしました")).toBeInTheDocument();
    expect(onImported).toHaveBeenCalled();
  });

  it("インポートエラーが表示される", async () => {
    const user = userEvent.setup();
    mockImportJson.mockRejectedValue(new Error("形式が不正です"));
    render(<ImportSection onImported={onImported} />);

    await user.click(screen.getByTestId("mode-append"));
    const file = createFile("test.json", "bad");
    await user.upload(screen.getByTestId("json-file-input"), file);
    await user.click(screen.getByTestId("import-json-button"));

    await waitFor(() => {
      expect(screen.getByTestId("import-error")).toBeInTheDocument();
    });
    expect(screen.getByText("形式が不正です")).toBeInTheDocument();
  });
});
