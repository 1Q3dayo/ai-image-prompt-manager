import type { PromptSet } from "../../types";
import { InputSet } from "./InputSet";

interface InputColumnProps {
  sets: PromptSet[];
  onUpdate: (
    id: string,
    field: keyof Omit<PromptSet, "id">,
    value: string | boolean,
  ) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onAdd: () => void;
  onClear: () => void;
  onSave: (id: string) => void;
  onLoad: (id: string) => void;
}

export function InputColumn({
  sets,
  onUpdate,
  onRemove,
  onMove,
  onAdd,
  onClear,
  onSave,
  onLoad,
}: InputColumnProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">入力</h2>
        <div className="flex gap-2">
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            クリア
          </button>
          <button
            onClick={onAdd}
            className="px-3 py-1.5 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600"
          >
            + セット追加
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {sets.map((set, index) => (
          <InputSet
            key={set.id}
            set={set}
            index={index}
            total={sets.length}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onMove={onMove}
            onSave={onSave}
            onLoad={onLoad}
          />
        ))}
      </div>
    </div>
  );
}
