import { useState, useRef } from "react";
import { saveBundle } from "../../hooks/useApi";
import type { PromptSet } from "../../types";

interface BundleSaveDialogProps {
  open: boolean;
  onClose: () => void;
  sets: PromptSet[];
}

export function BundleSaveDialog({
  open,
  onClose,
  sets,
}: BundleSaveDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      setError("タイトルは必須です");
      return;
    }
    if (!description.trim()) {
      setError("説明文は必須です");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await saveBundle({
        title: title.trim(),
        description: description.trim(),
        items: sets
          .filter((s) => s.prompt)
          .map((s) => ({
            title: s.title,
            prompt: s.prompt,
            has_break: s.hasBreak,
          })),
        image: image ?? undefined,
      });
      setTitle("");
      setDescription("");
      setImage(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setImage(null);
    setError("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
      data-testid="bundle-save-dialog-overlay"
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">全体を保存</h3>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="bundle-title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              id="bundle-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="バンドル名"
            />
          </div>

          <div>
            <label
              htmlFor="bundle-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              説明文 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="bundle-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="このバンドルの説明"
            />
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">
              保存されるセット: {sets.filter((s) => s.prompt).length}件
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              サンプル画像（任意）
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" data-testid="bundle-save-error">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
