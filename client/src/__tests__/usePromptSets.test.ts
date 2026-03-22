import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePromptSets } from "../hooks/usePromptSets";

describe("usePromptSets", () => {
  it("初期状態で空のセットが1つある", () => {
    const { result } = renderHook(() => usePromptSets());
    expect(result.current.sets).toHaveLength(1);
    expect(result.current.sets[0].title).toBe("");
    expect(result.current.sets[0].prompt).toBe("");
    expect(result.current.sets[0].hasBreak).toBe(false);
  });

  it("セットを追加できる", () => {
    const { result } = renderHook(() => usePromptSets());
    act(() => result.current.addSet());
    expect(result.current.sets).toHaveLength(2);
  });

  it("セットを削除できる", () => {
    const { result } = renderHook(() => usePromptSets());
    act(() => result.current.addSet());
    const id = result.current.sets[1].id;
    act(() => result.current.removeSet(id));
    expect(result.current.sets).toHaveLength(1);
  });

  it("最後の1つは削除できない", () => {
    const { result } = renderHook(() => usePromptSets());
    const id = result.current.sets[0].id;
    act(() => result.current.removeSet(id));
    expect(result.current.sets).toHaveLength(1);
  });

  it("セットのフィールドを更新できる", () => {
    const { result } = renderHook(() => usePromptSets());
    const id = result.current.sets[0].id;

    act(() => result.current.updateSet(id, "title", "背景"));
    expect(result.current.sets[0].title).toBe("背景");

    act(() => result.current.updateSet(id, "prompt", "landscape"));
    expect(result.current.sets[0].prompt).toBe("landscape");

    act(() => result.current.updateSet(id, "hasBreak", true));
    expect(result.current.sets[0].hasBreak).toBe(true);
  });

  it("セットを上に移動できる", () => {
    const { result } = renderHook(() => usePromptSets());
    act(() => result.current.addSet());
    act(() =>
      result.current.updateSet(result.current.sets[0].id, "title", "A"),
    );
    act(() =>
      result.current.updateSet(result.current.sets[1].id, "title", "B"),
    );

    const secondId = result.current.sets[1].id;
    act(() => result.current.moveSet(secondId, "up"));

    expect(result.current.sets[0].title).toBe("B");
    expect(result.current.sets[1].title).toBe("A");
  });

  it("セットを下に移動できる", () => {
    const { result } = renderHook(() => usePromptSets());
    act(() => result.current.addSet());
    act(() =>
      result.current.updateSet(result.current.sets[0].id, "title", "A"),
    );
    act(() =>
      result.current.updateSet(result.current.sets[1].id, "title", "B"),
    );

    const firstId = result.current.sets[0].id;
    act(() => result.current.moveSet(firstId, "down"));

    expect(result.current.sets[0].title).toBe("B");
    expect(result.current.sets[1].title).toBe("A");
  });

  it("先頭セットは上に移動できない", () => {
    const { result } = renderHook(() => usePromptSets());
    act(() => result.current.addSet());
    act(() =>
      result.current.updateSet(result.current.sets[0].id, "title", "A"),
    );

    const firstId = result.current.sets[0].id;
    act(() => result.current.moveSet(firstId, "up"));
    expect(result.current.sets[0].title).toBe("A");
  });

  it("末尾セットは下に移動できない", () => {
    const { result } = renderHook(() => usePromptSets());
    act(() => result.current.addSet());
    act(() =>
      result.current.updateSet(result.current.sets[1].id, "title", "B"),
    );

    const lastId = result.current.sets[1].id;
    act(() => result.current.moveSet(lastId, "down"));
    expect(result.current.sets[1].title).toBe("B");
  });

  it("loadSetsで外部データを読み込める", () => {
    const { result } = renderHook(() => usePromptSets());
    act(() =>
      result.current.loadSets([
        { id: "x", title: "A", prompt: "a", hasBreak: false },
        { id: "y", title: "B", prompt: "b", hasBreak: true },
      ]),
    );
    expect(result.current.sets).toHaveLength(2);
    expect(result.current.sets[0].title).toBe("A");
  });

  it("loadSetsに空配列を渡すとデフォルトセットになる", () => {
    const { result } = renderHook(() => usePromptSets());
    act(() => result.current.loadSets([]));
    expect(result.current.sets).toHaveLength(1);
    expect(result.current.sets[0].title).toBe("");
  });

  it("clearSetsで初期状態に戻る", () => {
    const { result } = renderHook(() => usePromptSets());
    act(() =>
      result.current.updateSet(result.current.sets[0].id, "title", "test"),
    );
    act(() => result.current.clearSets());
    expect(result.current.sets).toHaveLength(1);
    expect(result.current.sets[0].title).toBe("");
  });

  describe("humanReadableText", () => {
    it("タイトル+プロンプト+BREAKのフォーマット", () => {
      const { result } = renderHook(() => usePromptSets());
      const id = result.current.sets[0].id;
      act(() => result.current.updateSet(id, "title", "背景"));
      act(() => result.current.updateSet(id, "prompt", "landscape"));
      act(() => result.current.updateSet(id, "hasBreak", true));

      expect(result.current.humanReadableText).toBe(
        "# 背景\nlandscape\nBREAK",
      );
    });

    it("複数セットが空行で区切られる", () => {
      const { result } = renderHook(() => usePromptSets());
      act(() => result.current.addSet());
      act(() =>
        result.current.updateSet(result.current.sets[0].id, "title", "A"),
      );
      act(() =>
        result.current.updateSet(result.current.sets[0].id, "prompt", "a"),
      );
      act(() =>
        result.current.updateSet(result.current.sets[1].id, "title", "B"),
      );
      act(() =>
        result.current.updateSet(result.current.sets[1].id, "prompt", "b"),
      );

      expect(result.current.humanReadableText).toBe(
        "# A\na\n\n# B\nb",
      );
    });

    it("空のセットは出力に含まれない", () => {
      const { result } = renderHook(() => usePromptSets());
      expect(result.current.humanReadableText).toBe("");
    });

    it("タイトルのみのセットも出力に含まれる", () => {
      const { result } = renderHook(() => usePromptSets());
      act(() =>
        result.current.updateSet(
          result.current.sets[0].id,
          "title",
          "タイトルのみ",
        ),
      );
      expect(result.current.humanReadableText).toBe("# タイトルのみ");
    });
  });

  describe("aiReadyText", () => {
    it("プロンプトのみを連結する", () => {
      const { result } = renderHook(() => usePromptSets());
      act(() => result.current.addSet());
      act(() =>
        result.current.updateSet(result.current.sets[0].id, "prompt", "a"),
      );
      act(() =>
        result.current.updateSet(result.current.sets[1].id, "prompt", "b"),
      );

      expect(result.current.aiReadyText).toBe("a\nb");
    });

    it("BREAKありのプロンプトの後にBREAKが入る", () => {
      const { result } = renderHook(() => usePromptSets());
      act(() => result.current.addSet());
      act(() =>
        result.current.updateSet(result.current.sets[0].id, "prompt", "a"),
      );
      act(() =>
        result.current.updateSet(result.current.sets[0].id, "hasBreak", true),
      );
      act(() =>
        result.current.updateSet(result.current.sets[1].id, "prompt", "b"),
      );

      expect(result.current.aiReadyText).toBe("a\nBREAK\nb");
    });

    it("プロンプトが空のセットはスキップされる", () => {
      const { result } = renderHook(() => usePromptSets());
      act(() => result.current.addSet());
      act(() =>
        result.current.updateSet(result.current.sets[0].id, "title", "タイトルのみ"),
      );
      act(() =>
        result.current.updateSet(result.current.sets[1].id, "prompt", "b"),
      );

      expect(result.current.aiReadyText).toBe("b");
    });

    it("空のときは空文字列", () => {
      const { result } = renderHook(() => usePromptSets());
      expect(result.current.aiReadyText).toBe("");
    });
  });
});
