import { act, render, screen, within } from "@testing-library/react";
import App from "./app";
import { router } from "./router";

it("renders Lexora navigation links and the lookup workspace by default", async () => {
  await act(async () => {
    render(<App />);
  });

  expect(screen.getByText("Lexora")).toBeInTheDocument();
  const navigation = screen.getByRole("navigation", { name: "主导航" });
  expect(navigation).toBeInTheDocument();
  expect(within(navigation).getByRole("link", { name: "查词" })).toHaveClass("cursor-pointer");
  expect(within(navigation).getByRole("link", { name: "翻译" })).toBeInTheDocument();
  expect(within(navigation).getByRole("link", { name: "历史" })).toBeInTheDocument();
  expect(within(navigation).getByRole("link", { name: "单词本" })).toBeInTheDocument();
  expect(within(navigation).getByRole("link", { name: "设置" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "查词" })).toBeInTheDocument();
});

it("renders the translation page at /translations", async () => {
  render(<App />);

  await act(async () => {
    await router.navigate("/translations");
  });

  expect(await screen.findByRole("heading", { name: "翻译" })).toBeInTheDocument();
});
