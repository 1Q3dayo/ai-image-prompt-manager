import { useState, useMemo, useCallback } from "react";
import type { PromptSet } from "../types";

function generateId(): string {
  return crypto.randomUUID();
}

function createEmptySet(): PromptSet {
  return { id: generateId(), title: "", prompt: "", hasBreak: false };
}

export function usePromptSets() {
  const [sets, setSets] = useState<PromptSet[]>([createEmptySet()]);

  const addSet = useCallback(() => {
    setSets((prev) => [...prev, createEmptySet()]);
  }, []);

  const removeSet = useCallback((id: string) => {
    setSets((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const updateSet = useCallback(
    (id: string, field: keyof Omit<PromptSet, "id">, value: string | boolean) => {
      setSets((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
      );
    },
    [],
  );

  const moveSet = useCallback((id: string, direction: "up" | "down") => {
    setSets((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }, []);

  const loadSets = useCallback((newSets: PromptSet[]) => {
    setSets(newSets.length > 0 ? newSets : [createEmptySet()]);
  }, []);

  const clearSets = useCallback(() => {
    setSets([createEmptySet()]);
  }, []);

  const humanReadableText = useMemo(() => {
    return sets
      .map((s) => {
        const parts: string[] = [];
        if (s.title) parts.push(`# ${s.title}`);
        if (s.prompt) parts.push(s.prompt);
        if (s.hasBreak) parts.push("BREAK");
        return parts.join("\n");
      })
      .filter((text) => text.length > 0)
      .join("\n\n");
  }, [sets]);

  const aiReadyText = useMemo(() => {
    return sets
      .map((s) => {
        if (!s.prompt) return null;
        return s.hasBreak ? `${s.prompt}\nBREAK` : s.prompt;
      })
      .filter(Boolean)
      .join("\n");
  }, [sets]);

  return {
    sets,
    addSet,
    removeSet,
    updateSet,
    moveSet,
    loadSets,
    clearSets,
    humanReadableText,
    aiReadyText,
  };
}
