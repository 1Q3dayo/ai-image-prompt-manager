import { useState, useEffect, useCallback } from "react";
import {
  fetchTagKeys,
  createTagKey,
  updateTagKey,
  deleteTagKey,
  createTagValue,
  updateTagValue,
  deleteTagValue,
} from "../../hooks/useApi";
import type { TagKeyWithValues, TagValue } from "../../hooks/useApi";

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
        <p className="text-sm text-gray-700 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

function TagValueRow({
  value,
  onUpdate,
  onDelete,
}: {
  value: TagValue;
  onUpdate: (id: number, newValue: string) => Promise<void>;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.value);

  const handleSave = async () => {
    if (!editValue.trim()) return;
    await onUpdate(value.id, editValue.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
          autoFocus
        />
        <button
          onClick={handleSave}
          className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          保存
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <span className="flex-1 text-sm text-gray-600">{value.value}</span>
      <button
        onClick={() => setEditing(true)}
        className="px-1.5 py-0.5 text-xs text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        編集
      </button>
      <button
        onClick={() => onDelete(value.id)}
        className="px-1.5 py-0.5 text-xs text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        削除
      </button>
    </div>
  );
}

function TagKeyAccordion({
  tagKey,
  onRefresh,
}: {
  tagKey: TagKeyWithValues;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [keyName, setKeyName] = useState(tagKey.name);
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "key" | "value";
    id: number;
    count?: number;
  } | null>(null);

  const handleUpdateKeyName = async () => {
    if (!keyName.trim()) return;
    try {
      await updateTagKey(tagKey.id, { name: keyName.trim() });
      setEditingName(false);
      setError("");
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };

  const handleDeleteKey = async () => {
    try {
      await deleteTagKey(tagKey.id);
      setConfirmDelete(null);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const handleAddValue = async () => {
    if (!newValue.trim()) return;
    try {
      await createTagValue(tagKey.id, newValue.trim());
      setNewValue("");
      setError("");
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
    }
  };

  const handleUpdateValue = async (id: number, value: string) => {
    try {
      await updateTagValue(id, value);
      setError("");
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };

  const handleDeleteValue = async () => {
    if (!confirmDelete || confirmDelete.type !== "value") return;
    try {
      await deleteTagValue(confirmDelete.id);
      setConfirmDelete(null);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  return (
    <div className="border border-gray-200 rounded-md">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600 text-xs w-4"
        >
          {expanded ? "\u25BC" : "\u25B6"}
        </button>
        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUpdateKeyName();
                if (e.key === "Escape") {
                  setKeyName(tagKey.name);
                  setEditingName(false);
                }
              }}
              className="flex-1 px-2 py-0.5 text-sm border border-gray-300 rounded"
              autoFocus
            />
            <button
              onClick={handleUpdateKeyName}
              className="px-2 py-0.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              保存
            </button>
            <button
              onClick={() => {
                setKeyName(tagKey.name);
                setEditingName(false);
              }}
              className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
            >
              取消
            </button>
          </div>
        ) : (
          <>
            <span
              className="flex-1 text-sm font-medium text-gray-700 cursor-pointer"
              onClick={() => setExpanded(!expanded)}
            >
              {tagKey.name}
              <span className="text-xs text-gray-400 ml-2">
                ({tagKey.values.length}個の値)
              </span>
            </span>
            <button
              onClick={() => setEditingName(true)}
              className="px-1.5 py-0.5 text-xs text-gray-400 hover:text-blue-600"
            >
              編集
            </button>
            <button
              onClick={() =>
                setConfirmDelete({
                  type: "key",
                  id: tagKey.id,
                  count: tagKey.values.length,
                })
              }
              className="px-1.5 py-0.5 text-xs text-gray-400 hover:text-red-600"
            >
              削除
            </button>
          </>
        )}
      </div>

      {expanded && (
        <div className="px-3 py-2 space-y-1.5 border-t border-gray-100">
          {tagKey.values.map((v) => (
            <TagValueRow
              key={v.id}
              value={v}
              onUpdate={handleUpdateValue}
              onDelete={(id) => setConfirmDelete({ type: "value", id })}
            />
          ))}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddValue();
              }}
              placeholder="新しい値を入力..."
              className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded placeholder:text-gray-300"
            />
            <button
              onClick={handleAddValue}
              disabled={!newValue.trim()}
              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300"
            >
              追加
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>
      )}

      {confirmDelete?.type === "key" && (
        <ConfirmDialog
          message={`キー「${tagKey.name}」を削除しますか？関連する${tagKey.values.length}個の値と、プロンプト・バンドルとの紐付けも全て削除されます。`}
          onConfirm={handleDeleteKey}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {confirmDelete?.type === "value" && (
        <ConfirmDialog
          message="この値を削除しますか？プロンプト・バンドルとの紐付けも削除されます。"
          onConfirm={handleDeleteValue}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

export function TagManagementSection() {
  const [tagKeys, setTagKeys] = useState<TagKeyWithValues[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [error, setError] = useState("");

  const loadTagKeys = useCallback(async () => {
    try {
      const keys = (await fetchTagKeys(true)) as TagKeyWithValues[];
      setTagKeys(keys);
    } catch (e) {
      setError(e instanceof Error ? e.message : "タグの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTagKeys();
  }, [loadTagKeys]);

  const handleAddKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      await createTagKey(newKeyName.trim());
      setNewKeyName("");
      setError("");
      loadTagKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "キーの作成に失敗しました");
    }
  };

  return (
    <div data-testid="tag-management-section">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">タグ管理</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : (
          <>
            {tagKeys.length === 0 && (
              <p className="text-sm text-gray-400">タグキーがありません</p>
            )}
            {tagKeys.map((key) => (
              <TagKeyAccordion
                key={key.id}
                tagKey={key}
                onRefresh={loadTagKeys}
              />
            ))}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddKey();
                }}
                placeholder="新しいキー名を入力..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded placeholder:text-gray-300"
              />
              <button
                onClick={handleAddKey}
                disabled={!newKeyName.trim()}
                className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                キーを追加
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
