interface FullSetControlsProps {
  onSaveAll: () => void;
  onLoadAll: () => void;
  hasContent: boolean;
}

export function FullSetControls({
  onSaveAll,
  onLoadAll,
  hasContent,
}: FullSetControlsProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onSaveAll}
        disabled={!hasContent}
        className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-30"
      >
        全体保存
      </button>
      <button
        onClick={onLoadAll}
        className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
      >
        全体呼び出し
      </button>
    </div>
  );
}
