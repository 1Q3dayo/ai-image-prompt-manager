import { useState, useRef, useEffect, useCallback } from "react";
import { PromptList } from "./PromptList";
import { BundleList } from "./BundleList";

type Segment = "prompts" | "bundles";

interface EditTarget {
  type: "prompt" | "bundle";
  id: number;
}

interface DeleteTarget {
  type: "prompt" | "bundle";
  id: number;
  title: string;
}

export function PromptManager() {
  const [segment, setSegment] = useState<Segment>("prompts");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value === "") {
      setDebouncedQuery("");
      return;
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSegmentChange = (seg: Segment) => {
    setSegment(seg);
    setQuery("");
    setDebouncedQuery("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div
          className="inline-flex rounded-lg border border-gray-300 p-0.5"
          data-testid="segment-control"
        >
          <button
            onClick={() => handleSegmentChange("prompts")}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              segment === "prompts"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
            data-testid="segment-prompts"
          >
            プロンプト
          </button>
          <button
            onClick={() => handleSegmentChange("bundles")}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              segment === "bundles"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
            data-testid="segment-bundles"
          >
            バンドル
          </button>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="検索..."
          className="w-64 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="manager-search-input"
        />
      </div>

      {segment === "prompts" ? (
        <PromptList
          query={debouncedQuery}
          onEdit={(id) => setEditTarget({ type: "prompt", id })}
          onDelete={(id, title) => setDeleteTarget({ type: "prompt", id, title })}
        />
      ) : (
        <BundleList
          query={debouncedQuery}
          onEdit={(id) => setEditTarget({ type: "bundle", id })}
          onDelete={(id, title) => setDeleteTarget({ type: "bundle", id, title })}
        />
      )}

      {/* 編集・削除ダイアログ（後のステップで実装） */}
      {editTarget !== null && (
        <div data-testid="edit-dialog-placeholder" />
      )}
      {deleteTarget !== null && (
        <div data-testid="delete-dialog-placeholder" />
      )}
    </div>
  );
}

export type { Segment };
