import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchBundles,
  fetchBundle,
  getImageUrl,
  type Bundle,
  type BundleSummary,
} from "../../hooks/useApi";

interface BundleLoadDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (bundle: Bundle) => void;
}

export function BundleLoadDialog({
  open,
  onClose,
  onSelect,
}: BundleLoadDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BundleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const generationRef = useRef(0);
  const closedRef = useRef(false);

  const loadBundles = useCallback(async (q: string) => {
    const gen = ++generationRef.current;
    setLoading(true);
    setError("");
    try {
      const res = await fetchBundles(q, 20);
      if (gen === generationRef.current) {
        setResults(res.data);
      }
    } catch {
      if (gen === generationRef.current) {
        setResults([]);
        setError("読み込みに失敗しました");
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
      setError("");
      closedRef.current = true;
      generationRef.current++;
      return;
    }
    closedRef.current = false;
    loadBundles("");
  }, [open, loadBundles]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query === "") {
      loadBundles("");
      return;
    }
    debounceRef.current = setTimeout(() => {
      loadBundles(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, loadBundles]);

  if (!open) return null;

  const handleSelect = async (bundlePreview: BundleSummary) => {
    setError("");
    try {
      const full = await fetchBundle(bundlePreview.id);
      if (closedRef.current) return;
      onSelect(full);
      onClose();
    } catch {
      if (closedRef.current) return;
      setError("バンドルの読み込みに失敗しました");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      data-testid="bundle-load-dialog-overlay"
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">全体を呼び出し</h3>

        <div className="mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="検索..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="bundle-load-search-input"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading && (
            <p className="text-sm text-gray-500 text-center py-4">
              読み込み中...
            </p>
          )}
          {!loading && error && (
            <p className="text-sm text-red-500 text-center py-4">{error}</p>
          )}
          {!loading && !error && results.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              {query
                ? "見つかりませんでした"
                : "保存されたバンドルはありません"}
            </p>
          )}
          {results.map((bundle) => (
            <button
              key={bundle.id}
              onClick={() => handleSelect(bundle)}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              data-testid={`bundle-load-item-${bundle.id}`}
            >
              <div className="flex gap-3">
                {bundle.image_path && (
                  <img
                    src={getImageUrl(bundle.image_path)}
                    alt=""
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {bundle.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {bundle.description}
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
