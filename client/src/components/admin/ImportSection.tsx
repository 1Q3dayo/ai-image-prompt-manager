import { useState, useRef } from "react";
import { importJson, importDb } from "../../hooks/useApi";
import { DangerConfirmDialog } from "./DangerConfirmDialog";

interface ImportSectionProps {
  onImported: () => void;
}

export function ImportSection({ onImported }: ImportSectionProps) {
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [dbFile, setDbFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [confirm, setConfirm] = useState<"json-replace" | "db" | null>(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const dbInputRef = useRef<HTMLInputElement>(null);

  const handleJsonImport = () => {
    if (!jsonFile) return;
    if (mode === "replace") {
      setConfirm("json-replace");
    } else {
      doJsonImport();
    }
  };

  const doJsonImport = async () => {
    if (!jsonFile) return;
    setError("");
    setResult("");
    try {
      const res = await importJson(jsonFile, mode);
      setResult(
        `インポート完了: プロンプト ${res.imported.prompts}件、バンドル ${res.imported.bundles}件、画像 ${res.imported.images}件`,
      );
      setJsonFile(null);
      if (jsonInputRef.current) jsonInputRef.current.value = "";
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "インポートに失敗しました");
    }
    setConfirm(null);
  };

  const handleDbRestore = () => {
    if (!dbFile) return;
    setConfirm("db");
  };

  const doDbRestore = async () => {
    if (!dbFile) return;
    setError("");
    setResult("");
    try {
      await importDb(dbFile);
      setResult("データベースをリストアしました");
      setDbFile(null);
      if (dbInputRef.current) dbInputRef.current.value = "";
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "リストアに失敗しました");
    }
    setConfirm(null);
  };

  return (
    <div data-testid="import-section">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">データインポート</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">JSONインポート</h3>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={(e) => setJsonFile(e.target.files?.[0] ?? null)}
            className="block text-sm text-gray-500 mb-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            data-testid="json-file-input"
          />
          <div className="flex items-center gap-4 mb-2">
            <label className="flex items-center gap-1 text-sm text-gray-600">
              <input
                type="radio"
                name="import-mode"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
                data-testid="mode-replace"
              />
              全置換
            </label>
            <label className="flex items-center gap-1 text-sm text-gray-600">
              <input
                type="radio"
                name="import-mode"
                checked={mode === "append"}
                onChange={() => setMode("append")}
                data-testid="mode-append"
              />
              追加
            </label>
          </div>
          <button
            onClick={handleJsonImport}
            disabled={!jsonFile}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            data-testid="import-json-button"
          >
            インポート実行
          </button>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">DBリストア</h3>
          <input
            ref={dbInputRef}
            type="file"
            accept=".sqlite,.db"
            onChange={(e) => setDbFile(e.target.files?.[0] ?? null)}
            className="block text-sm text-gray-500 mb-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            data-testid="db-file-input"
          />
          <p className="text-xs text-amber-600 mb-2">
            データベースを完全に置き換えます。この操作は取り消せません。
          </p>
          <button
            onClick={handleDbRestore}
            disabled={!dbFile}
            className="px-4 py-2 text-sm text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50"
            data-testid="import-db-button"
          >
            リストア実行
          </button>
        </div>

        {result && (
          <p className="text-sm text-green-600" data-testid="import-result">
            {result}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600" data-testid="import-error">
            {error}
          </p>
        )}
      </div>

      {confirm === "json-replace" && (
        <DangerConfirmDialog
          title="全置換インポート"
          message="既存のデータをすべて削除し、インポートデータで置き換えます。この操作は取り消せません。"
          confirmLabel="全置換"
          onConfirm={doJsonImport}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm === "db" && (
        <DangerConfirmDialog
          title="DBリストア"
          message="データベースを完全に置き換えます。現在のデータはすべて失われます。"
          confirmText="リストア"
          confirmLabel="リストア実行"
          onConfirm={doDbRestore}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
