import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

describe("App", () => {
  it("アプリタイトルが表示される", () => {
    render(<App />);
    expect(
      screen.getByText("AI Image Prompt Manager"),
    ).toBeInTheDocument();
  });
});
