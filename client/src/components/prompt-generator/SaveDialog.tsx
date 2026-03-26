import { useState, useRef, useEffect } from "react";
import { savePrompt, updatePrompt, fetchPrompt } from "../../hooks/useApi";

interface SaveDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  prompt: string;
  hasBreak: boolean;
  sourcePromptId?: number;
}

export function SaveDialog({
  open,
  onClose,
  title,
  prompt,
  hasBreak,
  sourcePromptId,
}: SaveDialogProps) {
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [savingAction, setSavingAction] = useState<"update" | "new" | null>(null);
  const saving = savingAction !== null;
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !sourcePromptId) return;
    let cancelled = false;
    fetchPrompt(sourcePromptId).then((data) => {
      if (cancelled) return;
      if (!description) setDescription(data.description);
    }).catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sourcePromptId]);

  if (!open) return null;

  const getData = () => ({
    title,
    prompt,
    has_break: hasBreak,
    description: description.trim(),
    ...(image ? { image } : {}),
  });

  const handleSaveNew = async () => {
    if (!description.trim()) {
      setError("説明文は必須です");
      return;
    }
    setError("");
    setSavingAction("new");
    try {
      await savePrompt(getData());
      setDescription("");
      setImage(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSavingAction(null);
    }
  };

  const handleUpdate = async () => {
    if (!sourcePromptId) return;
    if (!description.trim()) {
      setError("説明文は必須です");
      return;
    }
    setError("");
    setSavingAction("update");
    try {
      await updatePrompt(sourcePromptId, getData());
      setDescription("");
      setImage(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSavingAction(null);
    }
  };

  const handleClose = () => {
    setDescription("");
    setImage(null);
    setError("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={saving ? undefined : handleClose}
      data-testid="save-dialog-overlay"
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">プロンプトを保存</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル
            </label>
            <p className="text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded-md">
              {title || "(未入力)"}
            </p>
          </div>

          <div>
            <label
              htmlFor="save-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              説明文 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="save-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="このプロンプトの説明"
            />
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
            <p className="text-sm text-red-600" data-testid="save-error">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            キャンセル
          </button>
          {sourcePromptId && (
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50"
              data-testid="save-overwrite"
            >
              {savingAction === "update" ? "保存中..." : "上書き保存"}
            </button>
          )}
          <button
            onClick={handleSaveNew}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {savingAction === "new" ? "保存中..." : (sourcePromptId ? "新規保存" : "保存")}
          </button>
        </div>
      </div>
    </div>
  );
}
