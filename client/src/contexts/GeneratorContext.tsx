import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { usePromptSets } from "../hooks/usePromptSets";
import type { PromptSet } from "../types";
import type { Prompt, Bundle } from "../hooks/useApi";

interface GeneratorContextValue {
  sets: PromptSet[];
  addSet: () => void;
  removeSet: (id: string) => void;
  updateSet: (id: string, field: keyof Omit<PromptSet, "id">, value: string | boolean) => void;
  moveSet: (id: string, direction: "up" | "down") => void;
  loadSets: (newSets: PromptSet[]) => void;
  clearSets: () => void;
  humanReadableText: string;
  aiReadyText: string;
  sourceBundleId: number | null;
  setSourceBundleId: (id: number | null) => void;
  appendPromptToSets: (prompt: Prompt) => void;
  replaceSetsFromBundle: (bundle: Bundle) => void;
  updateSetSource: (id: string, sourcePromptId: number) => void;
}

const GeneratorContext = createContext<GeneratorContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useGeneratorContext() {
  const ctx = useContext(GeneratorContext);
  if (!ctx) throw new Error("useGeneratorContext must be used within GeneratorProvider");
  return ctx;
}

export function GeneratorProvider({ children }: { children: ReactNode }) {
  const promptSets = usePromptSets();
  const [sourceBundleId, setSourceBundleId] = useState<number | null>(null);

  const appendPromptToSets = useCallback(
    (prompt: Prompt) => {
      promptSets.appendSet({
        id: crypto.randomUUID(),
        title: prompt.title,
        prompt: prompt.prompt,
        hasBreak: prompt.has_break === 1,
        sourcePromptId: prompt.id,
      });
    },
    [promptSets.appendSet],
  );

  const replaceSetsFromBundle = useCallback(
    (bundle: Bundle) => {
      const newSets: PromptSet[] = (bundle.items ?? []).map((item) => ({
        id: crypto.randomUUID(),
        title: item.title,
        prompt: item.prompt,
        hasBreak: item.has_break === 1,
      }));
      promptSets.loadSets(newSets);
      setSourceBundleId(bundle.id);
    },
    [promptSets.loadSets],
  );

  const updateSetSource = useCallback(
    (id: string, sourcePromptId: number) => {
      promptSets.patchSet(id, { sourcePromptId });
    },
    [promptSets.patchSet],
  );

  const clearSets = useCallback(() => {
    promptSets.clearSets();
    setSourceBundleId(null);
  }, [promptSets.clearSets]);

  return (
    <GeneratorContext.Provider
      value={{
        sets: promptSets.sets,
        addSet: promptSets.addSet,
        removeSet: promptSets.removeSet,
        updateSet: promptSets.updateSet,
        moveSet: promptSets.moveSet,
        loadSets: promptSets.loadSets,
        clearSets,
        humanReadableText: promptSets.humanReadableText,
        aiReadyText: promptSets.aiReadyText,
        sourceBundleId,
        setSourceBundleId,
        appendPromptToSets,
        replaceSetsFromBundle,
        updateSetSource,
      }}
    >
      {children}
    </GeneratorContext.Provider>
  );
}
