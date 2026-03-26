import { useState, useCallback } from "react";
import { useGeneratorContext } from "../../contexts/GeneratorContext";
import { InputColumn } from "./InputColumn";
import { HumanReadableColumn } from "./HumanReadableColumn";
import { AiReadyColumn } from "./AiReadyColumn";
import { SaveDialog } from "./SaveDialog";
import { LoadDialog } from "./LoadDialog";
import { BundleSaveDialog } from "./BundleSaveDialog";
import { BundleLoadDialog } from "./BundleLoadDialog";
import { FullSetControls } from "./FullSetControls";
import type { Prompt, Bundle } from "../../hooks/useApi";

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
    sourceBundleId,
    updateSetSource,
    replaceSetsFromBundle,
  } = useGeneratorContext();

  const [saveTargetId, setSaveTargetId] = useState<string | null>(null);
  const [loadTargetId, setLoadTargetId] = useState<string | null>(null);
  const [bundleSaveOpen, setBundleSaveOpen] = useState(false);
  const [bundleLoadOpen, setBundleLoadOpen] = useState(false);

  const saveTarget = sets.find((s) => s.id === saveTargetId);

  const handleSave = useCallback((id: string) => {
    setSaveTargetId(id);
  }, []);

  const handleLoad = useCallback((id: string) => {
    setLoadTargetId(id);
  }, []);

  const handleLoadSelect = useCallback(
    (prompt: Prompt) => {
      const target = sets.find((s) => s.id === loadTargetId);
      if (!target) return;
      updateSet(target.id, "title", prompt.title);
      updateSet(target.id, "prompt", prompt.prompt);
      updateSet(target.id, "hasBreak", prompt.has_break === 1);
      updateSetSource(target.id, prompt.id);
    },
    [loadTargetId, sets, updateSet, updateSetSource],
  );

  const handleBundleLoadSelect = useCallback(
    (bundle: Bundle) => {
      replaceSetsFromBundle(bundle);
    },
    [replaceSetsFromBundle],
  );

  const hasContent = sets.some((s) => s.prompt);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <FullSetControls
          onSaveAll={() => setBundleSaveOpen(true)}
          onLoadAll={() => setBundleLoadOpen(true)}
          hasContent={hasContent}
        />
      </div>

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
        sourcePromptId={saveTarget?.sourcePromptId}
      />

      <LoadDialog
        open={loadTargetId !== null}
        onClose={() => setLoadTargetId(null)}
        onSelect={handleLoadSelect}
      />

      <BundleSaveDialog
        open={bundleSaveOpen}
        onClose={() => setBundleSaveOpen(false)}
        sets={sets}
        sourceBundleId={sourceBundleId}
      />

      <BundleLoadDialog
        open={bundleLoadOpen}
        onClose={() => setBundleLoadOpen(false)}
        onSelect={handleBundleLoadSelect}
      />
    </>
  );
}
