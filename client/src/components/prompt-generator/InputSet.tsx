import type { PromptSet } from "../../types";

interface InputSetProps {
  set: PromptSet;
  index: number;
  total: number;
  onUpdate: (
    id: string,
    field: keyof Omit<PromptSet, "id">,
    value: string | boolean,
  ) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onSave: (id: string) => void;
  onLoad: (id: string) => void;
}

export function InputSet({
  set,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  onSave,
  onLoad,
}: InputSetProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white" data-testid={`input-set-${index}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">
          セット {index + 1}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onMove(set.id, "up")}
            disabled={index === 0}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
            aria-label={`セット${index + 1}を上に移動`}
          >
            ↑
          </button>
          <button
            onClick={() => onMove(set.id, "down")}
            disabled={index === total - 1}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
            aria-label={`セット${index + 1}を下に移動`}
          >
            ↓
          </button>
          <button
            onClick={() => onRemove(set.id)}
            disabled={total <= 1}
            className="px-2 py-1 text-xs text-red-400 hover:text-red-600 disabled:opacity-30"
            aria-label={`セット${index + 1}を削除`}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label
            htmlFor={`title-${set.id}`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            タイトル
          </label>
          <input
            id={`title-${set.id}`}
            type="text"
            value={set.title}
            onChange={(e) => onUpdate(set.id, "title", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例: 背景"
          />
        </div>

        <div>
          <label
            htmlFor={`prompt-${set.id}`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            プロンプト
          </label>
          <textarea
            id={`prompt-${set.id}`}
            value={set.prompt}
            onChange={(e) => onUpdate(set.id, "prompt", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            placeholder="例: beautiful landscape, mountains"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={set.hasBreak}
            onChange={(e) => onUpdate(set.id, "hasBreak", e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">BREAK</span>
        </label>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => onSave(set.id)}
            disabled={!set.title || !set.prompt}
            className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-30"
            aria-label={`セット${index + 1}を保存`}
          >
            保存
          </button>
          <button
            onClick={() => onLoad(set.id)}
            className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            aria-label={`セット${index + 1}に呼び出し`}
          >
            呼び出し
          </button>
        </div>
      </div>
    </div>
  );
}
