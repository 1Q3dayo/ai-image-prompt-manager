import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

describe("App", () => {
  it("アプリタイトルが表示される", () => {
    render(<App />);
    expect(
      screen.getByText("AI Image Prompt Manager"),
    ).toBeInTheDocument();
  });

  it("初期表示でプロンプトジェネレータータブがアクティブ", () => {
    render(<App />);
    const tab = screen.getByRole("tab", {
      name: "プロンプトジェネレーター",
    });
    expect(tab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("generator-panel")).toBeVisible();
  });

  it("3つのタブが表示される", () => {
    render(<App />);
    expect(
      screen.getByRole("tab", { name: "プロンプトジェネレーター" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "プロンプトマネージャ" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "管理" }),
    ).toBeInTheDocument();
  });

  it("tablistロールが存在する", () => {
    render(<App />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("タブクリックでパネルが切り替わる", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("tab", { name: "プロンプトマネージャ" }),
    );

    expect(screen.getByTestId("manager-panel")).toBeVisible();
    expect(screen.getByTestId("generator-panel")).not.toBeVisible();
  });

  it("非アクティブパネルはDOMに存在しない（遅延レンダリング）、keepMountedタブは非表示で残る", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("tab", { name: "プロンプトマネージャ" }),
    );

    expect(screen.getByTestId("generator-panel")).not.toBeVisible();
    expect(screen.getByTestId("manager-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-panel")).not.toBeInTheDocument();
  });

  it("タブを切り替えてもaria-selectedが正しく更新される", async () => {
    const user = userEvent.setup();
    render(<App />);

    const generatorTab = screen.getByRole("tab", {
      name: "プロンプトジェネレーター",
    });
    const managerTab = screen.getByRole("tab", {
      name: "プロンプトマネージャ",
    });

    expect(generatorTab).toHaveAttribute("aria-selected", "true");
    expect(managerTab).toHaveAttribute("aria-selected", "false");

    await user.click(managerTab);

    expect(generatorTab).toHaveAttribute("aria-selected", "false");
    expect(managerTab).toHaveAttribute("aria-selected", "true");
  });

  it("アクティブタブのパネルのみ表示され、keepMountedタブはDOMに残るが非表示", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: "管理" }));

    const panels = screen.getAllByRole("tabpanel");
    expect(panels).toHaveLength(1);
    expect(panels[0]).toHaveAttribute("id", "tabpanel-admin");

    const generatorPanel = document.getElementById("tabpanel-generator");
    expect(generatorPanel).toBeInTheDocument();
    expect(generatorPanel).not.toBeVisible();
  });

  it("aria-controlsとaria-labelledbyが正しく紐づく", () => {
    render(<App />);

    const generatorTab = screen.getByRole("tab", {
      name: "プロンプトジェネレーター",
    });
    expect(generatorTab).toHaveAttribute("id", "tab-generator");
    expect(generatorTab).toHaveAttribute(
      "aria-controls",
      "tabpanel-generator",
    );

    const panel = document.getElementById("tabpanel-generator");
    expect(panel).toHaveAttribute("aria-labelledby", "tab-generator");
  });

  it("roving tabIndexが正しく設定される", async () => {
    const user = userEvent.setup();
    render(<App />);

    const generatorTab = screen.getByRole("tab", {
      name: "プロンプトジェネレーター",
    });
    const managerTab = screen.getByRole("tab", {
      name: "プロンプトマネージャ",
    });

    expect(generatorTab).toHaveAttribute("tabindex", "0");
    expect(managerTab).toHaveAttribute("tabindex", "-1");

    await user.click(managerTab);

    expect(generatorTab).toHaveAttribute("tabindex", "-1");
    expect(managerTab).toHaveAttribute("tabindex", "0");
  });

  it("右矢印キーで次のタブに移動する", async () => {
    const user = userEvent.setup();
    render(<App />);

    const generatorTab = screen.getByRole("tab", {
      name: "プロンプトジェネレーター",
    });
    generatorTab.focus();

    await user.keyboard("{ArrowRight}");

    const managerTab = screen.getByRole("tab", {
      name: "プロンプトマネージャ",
    });
    expect(managerTab).toHaveAttribute("aria-selected", "true");
    expect(managerTab).toHaveFocus();
  });

  it("左矢印キーで前のタブに移動する（末尾にラップ）", async () => {
    const user = userEvent.setup();
    render(<App />);

    const generatorTab = screen.getByRole("tab", {
      name: "プロンプトジェネレーター",
    });
    generatorTab.focus();

    await user.keyboard("{ArrowLeft}");

    const adminTab = screen.getByRole("tab", { name: "管理" });
    expect(adminTab).toHaveAttribute("aria-selected", "true");
    expect(adminTab).toHaveFocus();
  });

  it("HomeキーとEndキーで先頭/末尾に移動する", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: "プロンプトマネージャ" }));

    const managerTab = screen.getByRole("tab", { name: "プロンプトマネージャ" });
    managerTab.focus();

    await user.keyboard("{Home}");
    const generatorTab = screen.getByRole("tab", {
      name: "プロンプトジェネレーター",
    });
    expect(generatorTab).toHaveAttribute("aria-selected", "true");
    expect(generatorTab).toHaveFocus();

    await user.keyboard("{End}");
    const adminTab = screen.getByRole("tab", { name: "管理" });
    expect(adminTab).toHaveAttribute("aria-selected", "true");
    expect(adminTab).toHaveFocus();
  });
});
