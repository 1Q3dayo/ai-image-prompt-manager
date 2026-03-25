import { useState, useEffect, useRef, useCallback } from "react";
import { fetchBundles, type BundleSummary } from "../../hooks/useApi";
import { BundleCard } from "./BundleCard";
import { Pagination } from "./Pagination";
import type { ViewMode, ImageSize } from "./types";

const PAGE_SIZE = 20;

interface BundleListProps {
  query: string;
  refreshKey?: number;
  viewMode?: ViewMode;
  imageSize?: ImageSize;
  onEdit: (id: number) => void;
  onDelete: (id: number, title: string) => void;
}

export function BundleList({ query, refreshKey, viewMode = "list", imageSize = "sm", onEdit, onDelete }: BundleListProps) {
  const [results, setResults] = useState<BundleSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generationRef = useRef(0);

  const load = useCallback(async (q: string, off: number) => {
    const gen = ++generationRef.current;
    setLoading(true);
    setError("");
    try {
      const res = await fetchBundles(q, PAGE_SIZE, off);
      if (gen === generationRef.current) {
        setResults(res.data);
        setTotal(res.total);
      }
    } catch {
      if (gen === generationRef.current) {
        setResults([]);
        setTotal(0);
        setError("読み込みに失敗しました");
      }
    } finally {
      if (gen === generationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setOffset(0);
    load(query, 0);
  }, [query, refreshKey, load]);

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    load(query, newOffset);
  };

  return (
    <div data-testid="bundle-list">
      {loading && (
        <p className="text-sm text-gray-500 text-center py-8">
          読み込み中...
        </p>
      )}
      {!loading && error && (
        <p className="text-sm text-red-600 text-center py-8">{error}</p>
      )}
      {!loading && !error && results.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">
          {query ? "見つかりませんでした" : "保存されたバンドルはありません"}
        </p>
      )}
      {!loading && !error && results.length > 0 && (
        <div className="space-y-2">
          {results.map((bundle) => (
            <BundleCard
              key={bundle.id}
              bundle={bundle}
              imageSize={imageSize}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
      <Pagination
        total={total}
        offset={offset}
        limit={PAGE_SIZE}
        onChange={handlePageChange}
      />
    </div>
  );
}
