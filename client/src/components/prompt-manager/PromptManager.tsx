import { useState, useRef, useEffect, useCallback } from "react";
import { deletePrompt, deleteBundle } from "../../hooks/useApi";
import { PromptList } from "./PromptList";
import { BundleList } from "./BundleList";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { PromptEditDialog } from "./PromptEditDialog";
import { BundleEditDialog } from "./BundleEditDialog";
import { ViewModeToolbar } from "./ViewModeToolbar";
import type { ViewMode, ImageSize } from "./types";

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
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [imageSize, setImageSize] = useState<ImageSize>("sm");

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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-3">
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

          <ViewModeToolbar
            viewMode={viewMode}
            imageSize={imageSize}
            onViewModeChange={setViewMode}
            onImageSizeChange={setImageSize}
          />
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
          refreshKey={refreshKey}
          viewMode={viewMode}
          imageSize={imageSize}
          onEdit={(id) => setEditTarget({ type: "prompt", id })}
          onDelete={(id, title) => setDeleteTarget({ type: "prompt", id, title })}
        />
      ) : (
        <BundleList
          query={debouncedQuery}
          refreshKey={refreshKey}
          viewMode={viewMode}
          imageSize={imageSize}
          onEdit={(id) => setEditTarget({ type: "bundle", id })}
          onDelete={(id, title) => setDeleteTarget({ type: "bundle", id, title })}
        />
      )}

      {editTarget?.type === "prompt" && (
        <PromptEditDialog
          promptId={editTarget.id}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
      {editTarget?.type === "bundle" && (
        <BundleEditDialog
          bundleId={editTarget.id}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
      {deleteTarget !== null && (
        <DeleteConfirmDialog
          title="削除確認"
          message={`「${deleteTarget.title}」を削除しますか？この操作は取り消せません。`}
          onConfirm={async () => {
            if (deleteTarget.type === "prompt") {
              await deletePrompt(deleteTarget.id);
            } else {
              await deleteBundle(deleteTarget.id);
            }
            setDeleteTarget(null);
            setRefreshKey((k) => k + 1);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

