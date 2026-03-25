import { useState } from "react";

interface DangerConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DangerConfirmDialog({
  title,
  message,
  confirmText,
  confirmLabel = "実行",
  onConfirm,
  onCancel,
}: DangerConfirmDialogProps) {
  const [input, setInput] = useState("");
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");

  const canConfirm = confirmText ? input === confirmText : true;

  const handleConfirm = async () => {
    setExecuting(true);
    setError("");
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "処理に失敗しました");
      setExecuting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={executing ? undefined : onCancel}
      data-testid="danger-dialog-overlay"
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>

        {confirmText && (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">
              確認のため「<span className="font-mono font-bold">{confirmText}</span>」と入力してください
            </p>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              data-testid="danger-dialog-input"
              disabled={executing}
            />
          </div>
        )}

        {error && (
          <p
            className="text-sm text-red-600 mb-4"
            data-testid="danger-dialog-error"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={executing}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            data-testid="danger-dialog-cancel"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={executing || !canConfirm}
            className="px-4 py-2 text-sm text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50"
            data-testid="danger-dialog-confirm"
          >
            {executing ? "実行中..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
