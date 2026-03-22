import { useState, useCallback } from "react";
import { usePromptSets } from "../../hooks/usePromptSets";
import { InputColumn } from "./InputColumn";
import { HumanReadableColumn } from "./HumanReadableColumn";
import { AiReadyColumn } from "./AiReadyColumn";
import { SaveDialog } from "./SaveDialog";
import { LoadDialog } from "./LoadDialog";
import type { Prompt } from "../../hooks/useApi";

export function PromptGenerator() {
  const {
    sets,
    addSet,
    removeSet,
    updateSet,
    moveSet,
    clearSets,
    humanReadableText,
    aiReadyText,
  } = usePromptSets();

  const [saveTargetId, setSaveTargetId] = useState<string | null>(null);
  const [loadTargetId, setLoadTargetId] = useState<string | null>(null);

  const saveTarget = sets.find((s) => s.id === saveTargetId);
  const loadTarget = sets.find((s) => s.id === loadTargetId);

  const handleSave = useCallback((id: string) => {
    setSaveTargetId(id);
  }, []);

  const handleLoad = useCallback((id: string) => {
    setLoadTargetId(id);
  }, []);

  const handleLoadSelect = useCallback(
    (prompt: Prompt) => {
      if (!loadTarget) return;
      updateSet(loadTarget.id, "title", prompt.title);
      updateSet(loadTarget.id, "prompt", prompt.prompt);
      updateSet(loadTarget.id, "hasBreak", prompt.has_break === 1);
    },
    [loadTarget, updateSet],
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.5fr_1.5fr] gap-6">
        <InputColumn
          sets={sets}
          onUpdate={updateSet}
          onRemove={removeSet}
          onMove={moveSet}
          onAdd={addSet}
          onClear={clearSets}
          onSave={handleSave}
          onLoad={handleLoad}
        />
        <HumanReadableColumn text={humanReadableText} />
        <AiReadyColumn text={aiReadyText} />
      </div>

      <SaveDialog
        open={saveTargetId !== null}
        onClose={() => setSaveTargetId(null)}
        title={saveTarget?.title ?? ""}
        prompt={saveTarget?.prompt ?? ""}
        hasBreak={saveTarget?.hasBreak ?? false}
      />

      <LoadDialog
        open={loadTargetId !== null}
        onClose={() => setLoadTargetId(null)}
        onSelect={handleLoadSelect}
      />
    </>
  );
}
