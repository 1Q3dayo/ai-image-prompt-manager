import { useCallback } from "react";

interface HumanReadableColumnProps {
  text: string;
}

export function HumanReadableColumn({ text }: HumanReadableColumnProps) {
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard APIが利用できない環境では無視
    }
  }, [text]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">人間用表示</h2>
        <button
          onClick={handleCopy}
          disabled={!text}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-30"
        >
          コピー
        </button>
      </div>
      <div
        className="bg-white border border-gray-200 rounded-lg p-4 min-h-[200px] whitespace-pre-wrap text-sm text-gray-800 font-mono"
        data-testid="human-readable-output"
      >
        {text || (
          <span className="text-gray-400">
            左のカラムで入力すると、ここに表示されます
          </span>
        )}
      </div>
    </div>
  );
}
