import { useState, useEffect, useRef } from "react";
import {
  fetchBundle,
  updateBundle,
  saveBundle,
  getImageUrl,
  type Bundle,
} from "../../hooks/useApi";

interface BundleEditDialogProps {
  bundleId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function BundleEditDialog({
  bundleId,
  onClose,
  onSaved,
}: BundleEditDialogProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [savingAction, setSavingAction] = useState<"update" | "new" | null>(null);
  const saving = savingAction !== null;
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null);
  const [items, setItems] = useState<Bundle["items"]>([]);
  const [newImage, setNewImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBundle(bundleId)
      .then((data: Bundle) => {
        if (cancelled) return;
        setTitle(data.title);
        setDescription(data.description);
        setCurrentImagePath(data.image_path);
        setItems(data.items);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("バンドルの取得に失敗しました");
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bundleId]);

  const validate = () => {
    if (!title.trim()) { setError("タイトルは必須です"); return false; }
    if (!description.trim()) { setError("説明文は必須です"); return false; }
    return true;
  };

  const getItemsData = () =>
    items.map((item) => ({
      title: item.title,
      prompt: item.prompt,
      has_break: item.has_break === 1,
    }));

  const handleUpdate = async () => {
    if (!validate()) return;
    setSavingAction("update");
    setError("");
    try {
      await updateBundle(bundleId, {
        title: title.trim(),
        description: description.trim(),
        ...(newImage ? { image: newImage } : {}),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
      setSavingAction(null);
    }
  };

  const handleSaveAsNew = async () => {
    if (!validate()) return;
    setSavingAction("new");
    setError("");
    try {
      await saveBundle({
        title: title.trim(),
        description: description.trim(),
        items: getItemsData(),
        ...(newImage ? { image: newImage } : {}),
        ...(!newImage && currentImagePath ? { copy_image_from: currentImagePath } : {}),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
      setSavingAction(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={saving ? undefined : onClose}
      data-testid="bundle-edit-dialog-overlay"
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">バンドルを編集</h3>

        {loading && (
          <p className="text-sm text-gray-500 text-center py-8">
            読み込み中...
          </p>
        )}

        {!loading && loadError && (
          <p
            className="text-sm text-red-600 text-center py-8"
            data-testid="edit-bundle-error"
          >
            {error}
          </p>
        )}

        {!loading && !loadError && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="edit-bundle-title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-bundle-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="edit-bundle-title-input"
              />
            </div>

            <div>
              <label
                htmlFor="edit-bundle-description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                説明文
              </label>
              <textarea
                id="edit-bundle-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="edit-bundle-description-input"
              />
            </div>

            {currentImagePath && !newImage && (
              <div>
                <p className="text-sm text-gray-700 mb-1">現在の画像</p>
                <img
                  src={getImageUrl(currentImagePath)}
                  alt=""
                  className="w-20 h-20 object-cover rounded"
                  data-testid="edit-bundle-current-image"
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
                accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                onChange={(e) => setNewImage(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                data-testid="edit-bundle-image-input"
              />
            </div>

            {items.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  含まれるプロンプト（{items.length}件）
                </p>
                <div
                  className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-40 overflow-y-auto"
                  data-testid="edit-bundle-items"
                >
                  {items.map((item, i) => (
                    <div key={i} className="px-3 py-2 text-xs text-gray-600">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-gray-400 ml-2">{item.prompt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p
                className="text-sm text-red-600"
                data-testid="edit-bundle-error"
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
            data-testid="edit-bundle-cancel"
          >
            キャンセル
          </button>
          <button
            onClick={handleSaveAsNew}
            disabled={saving || loading || loadError}
            className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50"
            data-testid="edit-bundle-save-new"
          >
            {savingAction === "new" ? "保存中..." : "新規保存"}
          </button>
          <button
            onClick={handleUpdate}
            disabled={saving || loading || loadError}
            className="px-4 py-2 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50"
            data-testid="edit-bundle-save"
          >
            {savingAction === "update" ? "保存中..." : "上書き保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
