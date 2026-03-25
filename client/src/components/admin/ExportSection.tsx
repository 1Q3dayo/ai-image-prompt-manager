import { useState } from "react";
import { exportJson, exportDb } from "../../hooks/useApi";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportSection() {
  const [includeImages, setIncludeImages] = useState(false);
  const [exporting, setExporting] = useState<"json" | "db" | null>(null);
  const [error, setError] = useState("");

  const handleJsonExport = async () => {
    setExporting("json");
    setError("");
    try {
      const blob = await exportJson(includeImages);
      const now = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      downloadBlob(blob, `aipm-export-${now}.json`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エクスポートに失敗しました");
    } finally {
      setExporting(null);
    }
  };

  const handleDbExport = async () => {
    setExporting("db");
    setError("");
    try {
      const blob = await exportDb();
      const now = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      downloadBlob(blob, `aipm-db-${now}.sqlite`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エクスポートに失敗しました");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div data-testid="export-section">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">データエクスポート</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">JSONエクスポート</h3>
          <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <input
              type="checkbox"
              checked={includeImages}
              onChange={(e) => setIncludeImages(e.target.checked)}
              data-testid="include-images-checkbox"
            />
            画像をbase64で含める
          </label>
          <button
            onClick={handleJsonExport}
            disabled={exporting !== null}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            data-testid="export-json-button"
          >
            {exporting === "json" ? "エクスポート中..." : "JSONをダウンロード"}
          </button>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">DBダンプ</h3>
          <button
            onClick={handleDbExport}
            disabled={exporting !== null}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            data-testid="export-db-button"
          >
            {exporting === "db" ? "エクスポート中..." : "SQLiteファイルをダウンロード"}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600" data-testid="export-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
