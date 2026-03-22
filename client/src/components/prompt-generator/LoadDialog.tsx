import { useState, useEffect, useRef, useCallback } from "react";
import { fetchPrompts, getImageUrl, type Prompt } from "../../hooks/useApi";

interface LoadDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (prompt: Prompt) => void;
}

export function LoadDialog({ open, onClose, onSelect }: LoadDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const generationRef = useRef(0);

  const loadPrompts = useCallback(async (q: string) => {
    const gen = ++generationRef.current;
    setLoading(true);
    try {
      const res = await fetchPrompts(q, 20);
      if (gen === generationRef.current) {
        setResults(res.data);
      }
    } catch {
      if (gen === generationRef.current) {
        setResults([]);
      }
    } finally {
      if (gen === generationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      generationRef.current++;
      return;
    }
    loadPrompts("");
  }, [open, loadPrompts]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query === "") return; // 初回ロードはopen effectで処理済み
    debounceRef.current = setTimeout(() => {
      loadPrompts(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, loadPrompts]);

  if (!open) return null;

  const handleSelect = (prompt: Prompt) => {
    onSelect(prompt);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      data-testid="load-dialog-overlay"
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">プロンプトを呼び出し</h3>

        <div className="mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="検索..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="load-search-input"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading && (
            <p className="text-sm text-gray-500 text-center py-4">
              読み込み中...
            </p>
          )}
          {!loading && results.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              {query ? "見つかりませんでした" : "保存されたプロンプトはありません"}
            </p>
          )}
          {results.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => handleSelect(prompt)}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              data-testid={`load-item-${prompt.id}`}
            >
              <div className="flex gap-3">
                {prompt.image_path && (
                  <img
                    src={getImageUrl(prompt.image_path)}
                    alt=""
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {prompt.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {prompt.description}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-1">
                    {prompt.prompt}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
