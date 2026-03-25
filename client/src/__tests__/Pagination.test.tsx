import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "../components/prompt-manager/Pagination";

describe("Pagination", () => {
  it("totalがlimit以下の場合は非表示", () => {
    const { container } = render(
      <Pagination total={10} offset={0} limit={20} onChange={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("totalがlimitを超える場合にページネーションが表示される", () => {
    render(
      <Pagination total={60} offset={0} limit={20} onChange={vi.fn()} />,
    );
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
    expect(screen.getByTestId("pagination-info")).toHaveTextContent("1 / 3");
  });

  it("最初のページでは前へボタンが無効", () => {
    render(
      <Pagination total={60} offset={0} limit={20} onChange={vi.fn()} />,
    );
    expect(screen.getByTestId("pagination-prev")).toBeDisabled();
    expect(screen.getByTestId("pagination-next")).not.toBeDisabled();
  });

  it("最後のページでは次へボタンが無効", () => {
    render(
      <Pagination total={60} offset={40} limit={20} onChange={vi.fn()} />,
    );
    expect(screen.getByTestId("pagination-prev")).not.toBeDisabled();
    expect(screen.getByTestId("pagination-next")).toBeDisabled();
  });

  it("次へボタンでoffsetが増加する", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Pagination total={60} offset={0} limit={20} onChange={onChange} />,
    );

    await user.click(screen.getByTestId("pagination-next"));
    expect(onChange).toHaveBeenCalledWith(20);
  });

  it("前へボタンでoffsetが減少する", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Pagination total={60} offset={20} limit={20} onChange={onChange} />,
    );

    await user.click(screen.getByTestId("pagination-prev"));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("中間ページの表示が正しい", () => {
    render(
      <Pagination total={60} offset={20} limit={20} onChange={vi.fn()} />,
    );
    expect(screen.getByTestId("pagination-info")).toHaveTextContent("2 / 3");
  });

  it("offsetがtotalを超えた場合に最終ページにクランプされる", () => {
    render(
      <Pagination total={25} offset={40} limit={20} onChange={vi.fn()} />,
    );
    expect(screen.getByTestId("pagination-info")).toHaveTextContent("2 / 2");
    expect(screen.getByTestId("pagination-next")).toBeDisabled();
  });

  it("offsetがtotalを超えた場合に前へボタンでクランプされたoffsetから戻る", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Pagination total={25} offset={40} limit={20} onChange={onChange} />,
    );

    await user.click(screen.getByTestId("pagination-prev"));
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
