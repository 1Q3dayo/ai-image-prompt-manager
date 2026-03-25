import { useState, useEffect, useRef } from "react";
import {
  fetchPrompt,
  updatePrompt,
  getImageUrl,
  type Prompt,
} from "../../hooks/useApi";

interface PromptEditDialogProps {
  promptId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function PromptEditDialog({
  promptId,
  onClose,
  onSaved,
}: PromptEditDialogProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [hasBreak, setHasBreak] = useState(false);
  const [description, setDescription] = useState("");
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPrompt(promptId)
      .then((data: Prompt) => {
        if (cancelled) return;
        setTitle(data.title);
        setPrompt(data.prompt);
        setHasBreak(data.has_break === 1);
        setDescription(data.description);
        setCurrentImagePath(data.image_path);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("プロンプトの取得に失敗しました");
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [promptId]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("タイトルは必須です");
      return;
    }
    if (!prompt.trim()) {
      setError("プロンプトは必須です");
      return;
    }
    if (!description.trim()) {
      setError("説明文は必須です");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updatePrompt(promptId, {
        title: title.trim(),
        prompt: prompt.trim(),
        has_break: hasBreak,
        description: description.trim(),
        ...(newImage ? { image: newImage } : {}),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={saving ? undefined : onClose}
      data-testid="prompt-edit-dialog-overlay"
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">プロンプトを編集</h3>

        {loading && (
          <p className="text-sm text-gray-500 text-center py-8">
            読み込み中...
          </p>
        )}

        {!loading && loadError && (
          <p
            className="text-sm text-red-600 text-center py-8"
            data-testid="edit-prompt-error"
          >
            {error}
          </p>
        )}

        {!loading && !loadError && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="edit-title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="edit-title-input"
              />
            </div>

            <div>
              <label
                htmlFor="edit-prompt"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                プロンプト <span className="text-red-500">*</span>
              </label>
              <textarea
                id="edit-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="edit-prompt-input"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="edit-has-break"
                type="checkbox"
                checked={hasBreak}
                onChange={(e) => setHasBreak(e.target.checked)}
                className="rounded border-gray-300"
                data-testid="edit-has-break"
              />
              <label
                htmlFor="edit-has-break"
                className="text-sm text-gray-700"
              >
                BREAK
              </label>
            </div>

            <div>
              <label
                htmlFor="edit-description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                説明文
              </label>
              <textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="edit-description-input"
              />
            </div>

            {currentImagePath && !newImage && (
              <div>
                <p className="text-sm text-gray-700 mb-1">現在の画像</p>
                <img
                  src={getImageUrl(currentImagePath)}
                  alt=""
                  className="w-20 h-20 object-cover rounded"
                  data-testid="edit-current-image"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                画像を差し替え（任意）
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => setNewImage(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                data-testid="edit-image-input"
              />
            </div>

            {error && (
              <p
                className="text-sm text-red-600"
                data-testid="edit-prompt-error"
              >
                {error}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            data-testid="edit-prompt-cancel"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || loadError}
            className="px-4 py-2 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50"
            data-testid="edit-prompt-save"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
