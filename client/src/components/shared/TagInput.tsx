import { useState, useEffect, useRef } from "react";
import { fetchTagKeys, fetchTagValues } from "../../hooks/useApi";
import type { TagKey, TagValue, Tag } from "../../hooks/useApi";

const MAX_TAGS = 10;

interface TagInputProps {
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [tagKeys, setTagKeys] = useState<TagKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);
  const [valueInput, setValueInput] = useState("");
  const [suggestions, setSuggestions] = useState<TagValue[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTagKeys().then((keys) => setTagKeys(keys as TagKey[])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedKeyId) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    fetchTagValues(selectedKeyId, valueInput)
      .then((values) => { if (!cancelled) setSuggestions(values); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedKeyId, valueInput]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const removeTag = (valueId: number) => {
    onChange(tags.filter((t) => t.value_id !== valueId));
  };

  const addTag = (keyId: number, keyName: string, valueId: number, value: string) => {
    if (tags.some((t) => t.value_id === valueId)) return;
    if (tags.length >= MAX_TAGS) return;
    onChange([...tags, { key_id: keyId, key_name: keyName, value_id: valueId, value }]);
    setValueInput("");
    setSelectedKeyId(null);
    setShowDropdown(false);
  };

  const addNewValue = () => {
    if (!selectedKeyId || !valueInput.trim()) return;
    const key = tagKeys.find((k) => k.id === selectedKeyId);
    if (!key) return;
    const tempId = -(Date.now());
    onChange([...tags, {
      key_id: selectedKeyId,
      key_name: key.name,
      value_id: tempId,
      value: valueInput.trim(),
    }]);
    setValueInput("");
    setSelectedKeyId(null);
    setShowDropdown(false);
  };

  const atLimit = tags.length >= MAX_TAGS;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        タグ
        <span className="text-xs text-gray-400 ml-1">({tags.length}/{MAX_TAGS})</span>
      </label>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span
              key={`${tag.key_id}-${tag.value_id}`}
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
        </div>
      )}

      {!atLimit && (
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-2">
            <select
              value={selectedKeyId ?? ""}
              onChange={(e) => {
                const id = e.target.value ? parseInt(e.target.value) : null;
                setSelectedKeyId(id);
                setValueInput("");
                if (id) setShowDropdown(true);
              }}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
            >
              <option value="">キーを選択</option>
              {tagKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.name}
                </option>
              ))}
            </select>

            {selectedKeyId && (
              <input
                type="text"
                value={valueInput}
                onChange={(e) => {
                  setValueInput(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const match = suggestions.find(
                      (s) => s.value === valueInput.trim(),
                    );
                    if (match) {
                      const key = tagKeys.find((k) => k.id === selectedKeyId);
                      if (key) addTag(selectedKeyId, key.name, match.id, match.value);
                    } else if (valueInput.trim()) {
                      addNewValue();
                    }
                  }
                }}
                placeholder="値を入力..."
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md placeholder:text-gray-300"
              />
            )}
          </div>

          {showDropdown && selectedKeyId && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
              {suggestions
                .filter((s) => !tags.some((t) => t.value_id === s.id))
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const key = tagKeys.find((k) => k.id === selectedKeyId);
                      if (key) addTag(selectedKeyId, key.name, s.id, s.value);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 text-gray-700"
                  >
                    {s.value}
                  </button>
                ))}
              {valueInput.trim() &&
                !suggestions.some((s) => s.value === valueInput.trim()) && (
                  <button
                    type="button"
                    onClick={addNewValue}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-green-50 text-green-700"
                  >
                    新規作成: {valueInput.trim()}
                  </button>
                )}
            </div>
          )}

          {showDropdown &&
            selectedKeyId &&
            suggestions.length === 0 &&
            valueInput.trim() && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <button
                  type="button"
                  onClick={addNewValue}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-green-50 text-green-700"
                >
                  新規作成: {valueInput.trim()}
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
