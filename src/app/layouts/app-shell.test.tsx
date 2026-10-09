import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./app-shell";

it("keeps the responsive shell contract and accessible compact-sidebar navigation", () => {
  render(
    <MemoryRouter initialEntries={["/translations"]}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<h1>查词</h1>} />
          <Route path="translations" element={<h1>翻译</h1>} />
          <Route path="history" element={<h1>历史</h1>} />
          <Route path="wordbooks" element={<h1>单词本</h1>} />
          <Route path="settings" element={<h1>设置</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  const navigation = screen.getByRole("navigation", { name: "主导航" });
  expect(navigation).toBeInTheDocument();

  const sidebar = navigation.closest("aside");
  expect(sidebar).not.toBeNull();

  const shell = sidebar?.parentElement;
  expect(shell).not.toBeNull();
  expect(shell).toHaveClass("min-[560px]:flex-row");
  expect(shell).not.toHaveClass("md:flex-row");

  expect(sidebar).toHaveClass("min-[560px]:w-[var(--sidebar-rail-width)]");
  expect(sidebar).toHaveClass("min-[960px]:w-[var(--sidebar-compact-width)]");
  expect(sidebar).toHaveClass("min-[1200px]:w-[var(--sidebar-full-width)]");
  expect(sidebar).toHaveClass("min-[560px]:max-h-[calc(100svh-3rem)]");

  const brandText = screen.getByText("Lexora");
  expect(brandText).toHaveClass("min-[560px]:max-[959px]:sr-only");
  expect(brandText).not.toHaveClass("md:sr-only");
  const brandRow = brandText.closest("div")?.parentElement;
  expect(brandRow).not.toBeNull();
  expect(brandRow).toHaveClass("min-[560px]:max-[959px]:gap-0");
  expect(brandRow).toHaveClass("min-[960px]:gap-3");

  expect(navigation).toHaveClass("min-[560px]:overflow-y-auto");

  const translationLink = within(navigation).getByRole("link", { name: "翻译" });
  expect(translationLink).toHaveAttribute("title", "翻译");
  expect(translationLink).toHaveAttribute("aria-current", "page");

  const translationLabel = within(translationLink).getByText("翻译");
  expect(translationLabel).toHaveClass("min-[560px]:max-[959px]:sr-only");
  expect(translationLabel).not.toHaveClass("md:sr-only");

  expect(within(navigation).getByRole("link", { name: "设置" })).toBeInTheDocument();
});
