import { useState, useEffect, useRef } from "react";
import { fetchTagSuggestions, type TagSuggestion } from "../../hooks/useApi";

interface TagFilterProps {
  type: "prompts" | "bundles";
  query?: string;
  refreshKey?: number;
  selectedTags: TagSuggestion[];
  onChange: (tags: TagSuggestion[]) => void;
}

export function TagFilter({ type, query = "", refreshKey, selectedTags, onChange }: TagFilterProps) {
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedIds = selectedTags.map((t) => t.value_id);

  useEffect(() => {
    let cancelled = false;
    fetchTagSuggestions(type, selectedIds, query)
      .then((data) => { if (!cancelled) setSuggestions(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, selectedIds.join(","), query, refreshKey]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const removeTag = (valueId: number) => {
    onChange(selectedTags.filter((t) => t.value_id !== valueId));
  };

  const addTag = (tag: TagSuggestion) => {
    if (selectedIds.includes(tag.value_id)) return;
    onChange([...selectedTags, tag]);
    setOpen(false);
  };

  const available = suggestions.filter((s) => !selectedIds.includes(s.value_id));

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="tag-filter">
      {selectedTags.map((tag) => (
        <span
          key={tag.value_id}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-200"
        >
          {tag.key_name}:{tag.value}
          <button
            type="button"
            onClick={() => removeTag(tag.value_id)}
            className="text-blue-400 hover:text-blue-600"
          >
            x
          </button>
        </span>
      ))}

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={available.length === 0 && !open}
          className="px-2 py-0.5 text-xs text-gray-500 border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50"
          data-testid="tag-filter-add"
        >
          + タグ
        </button>

        {open && available.length > 0 && (
          <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto min-w-[160px]">
            {available.map((s) => (
              <button
                key={s.value_id}
                type="button"
                onClick={() => addTag(s)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 text-gray-700"
              >
                {s.key_name}:{s.value}
                <span className="text-gray-400 ml-1">({s.count})</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
