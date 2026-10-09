import { render, screen } from "@testing-library/react";
import { Button } from "@/shared/ui/button";

it("renders pointer cursor affordance for enabled buttons and a blocked cursor for disabled buttons", () => {
  const { rerender } = render(<Button>立即查询</Button>);

  const enabledButton = screen.getByRole("button", { name: "立即查询" });
  expect(enabledButton.className).toContain("cursor-pointer");

  rerender(
    <Button disabled>
      稍后再试
    </Button>,
  );

  const disabledButton = screen.getByRole("button", { name: "稍后再试" });
  expect(disabledButton.className).toContain("disabled:cursor-not-allowed");
});
