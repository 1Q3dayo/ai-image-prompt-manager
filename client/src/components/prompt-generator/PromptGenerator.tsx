import { usePromptSets } from "../../hooks/usePromptSets";
import { InputColumn } from "./InputColumn";
import { HumanReadableColumn } from "./HumanReadableColumn";
import { AiReadyColumn } from "./AiReadyColumn";

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.5fr_1.5fr] gap-6">
      <InputColumn
        sets={sets}
        onUpdate={updateSet}
        onRemove={removeSet}
        onMove={moveSet}
        onAdd={addSet}
        onClear={clearSets}
      />
      <HumanReadableColumn text={humanReadableText} />
      <AiReadyColumn text={aiReadyText} />
    </div>
  );
}
