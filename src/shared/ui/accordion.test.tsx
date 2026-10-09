import { render, screen } from "@testing-library/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/ui/accordion";

it("renders pointer cursor affordance for accordion triggers", () => {
  render(
    <Accordion type="single" collapsible>
      <AccordionItem value="diagnostics">
        <AccordionTrigger>连接诊断</AccordionTrigger>
        <AccordionContent>最近一次连接结果</AccordionContent>
      </AccordionItem>
    </Accordion>,
  );

  expect(screen.getByRole("button", { name: "连接诊断" })).toHaveClass("cursor-pointer");
});
