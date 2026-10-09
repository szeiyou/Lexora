import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TextTranslationResultViewModel } from "@/modules/translations/model/text-translation-result-view-model";
import { textTranslationResult } from "@/modules/translations/model/__fixtures__/text-translation-responses";
import { TextTranslationResult } from "@/modules/translations/ui/text-translation-result";

function createTranslationResult(
  overrides: Partial<TextTranslationResultViewModel> = {},
): TextTranslationResultViewModel {
  return {
    kind: "text-translation",
    ...textTranslationResult,
    segments: textTranslationResult.segments.map((segment) => ({ ...segment })),
    keyPhrases: textTranslationResult.keyPhrases.map((phrase) => ({ ...phrase })),
    notes: [...textTranslationResult.notes],
    ...overrides,
  };
}

function renderTranslationResult(overrides: Partial<TextTranslationResultViewModel> = {}) {
  return render(<TextTranslationResult result={createTranslationResult(overrides)} />);
}

function setPreviewHeights({
  clientHeight,
  scrollHeight,
}: {
  clientHeight: number;
  scrollHeight: number;
}) {
  const preview = screen.getByTestId("translation-source-preview");

  Object.defineProperty(preview, "clientHeight", { configurable: true, value: clientHeight });
  Object.defineProperty(preview, "scrollHeight", { configurable: true, value: scrollHeight });

  act(() => {
    window.dispatchEvent(new Event("resize"));
  });

  return preview;
}

it("shows inline expand and collapse controls when source text overflows", async () => {
  renderTranslationResult({
    text: "这是一段很长的原文。".repeat(24),
  });

  const preview = setPreviewHeights({ clientHeight: 72, scrollHeight: 180 });
  const expandButton = await screen.findByRole("button", { name: "查看完整原文" });
  const expandIcon = expandButton.querySelector("svg");

  expect(expandButton).toHaveAttribute("aria-expanded", "false");
  expect(expandIcon).not.toHaveClass("rotate-90");
  expect(expandIcon).not.toHaveClass("-rotate-90");
  expect(preview.style.maxHeight).toBe("72px");
  expect(screen.getByTestId("translation-source-fade")).toBeInTheDocument();

  await userEvent.click(expandButton);

  const collapseButton = await screen.findByRole("button", { name: "收起原文" });
  const collapseIcon = collapseButton.querySelector("svg");

  expect(collapseButton).toHaveAttribute("aria-expanded", "true");
  expect(collapseIcon).toHaveClass("-rotate-90");
  expect(collapseIcon).not.toHaveClass("rotate-90");
  expect(preview.style.maxHeight).toBe("");
  expect(screen.queryByTestId("translation-source-fade")).not.toBeInTheDocument();

  await userEvent.click(collapseButton);

  const expandButtonAgain = await screen.findByRole("button", { name: "查看完整原文" });

  expect(expandButtonAgain).toHaveAttribute("aria-expanded", "false");
  expect(preview.style.maxHeight).toBe("72px");
  expect(screen.getByTestId("translation-source-fade")).toBeInTheDocument();
});

it("does not show expand controls when source text does not overflow", () => {
  renderTranslationResult({
    text: "短句原文。",
  });

  setPreviewHeights({ clientHeight: 72, scrollHeight: 72 });

  expect(screen.queryByRole("button", { name: "查看完整原文" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "收起原文" })).not.toBeInTheDocument();
  expect(screen.queryByTestId("translation-source-fade")).not.toBeInTheDocument();
});

it("resets to collapsed preview when a new source text result is rendered", async () => {
  const { rerender } = renderTranslationResult({
    text: "这是第一段很长的原文。".repeat(20),
  });
  const firstPreview = setPreviewHeights({ clientHeight: 72, scrollHeight: 168 });
  await userEvent.click(await screen.findByRole("button", { name: "查看完整原文" }));
  expect(await screen.findByRole("button", { name: "收起原文" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  expect(firstPreview.style.maxHeight).toBe("");

  const nextResult = createTranslationResult({
    text: "这是第二段不同内容的长原文。".repeat(20),
  });

  rerender(<TextTranslationResult result={nextResult} />);
  const secondPreview = setPreviewHeights({ clientHeight: 72, scrollHeight: 160 });
  const expandButton = await screen.findByRole("button", { name: "查看完整原文" });

  expect(expandButton).toHaveAttribute("aria-expanded", "false");
  expect(secondPreview.style.maxHeight).toBe("72px");
  expect(screen.getByTestId("translation-source-fade")).toBeInTheDocument();
});

it("resets to collapsed preview when a new result object arrives with the same source text", async () => {
  const sourceText = "这是同一段很长的原文。".repeat(20);
  const { rerender } = renderTranslationResult({
    text: sourceText,
  });
  const firstPreview = setPreviewHeights({ clientHeight: 72, scrollHeight: 168 });

  await userEvent.click(await screen.findByRole("button", { name: "查看完整原文" }));
  expect(await screen.findByRole("button", { name: "收起原文" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  expect(firstPreview.style.maxHeight).toBe("");

  rerender(
    <TextTranslationResult
      result={createTranslationResult({
        text: sourceText,
        translatedText: "A different translation for the same source text.",
      })}
    />,
  );
  const secondPreview = setPreviewHeights({ clientHeight: 72, scrollHeight: 168 });
  const expandButton = await screen.findByRole("button", { name: "查看完整原文" });

  expect(expandButton).toHaveAttribute("aria-expanded", "false");
  expect(secondPreview.style.maxHeight).toBe("72px");
  expect(screen.getByTestId("translation-source-fade")).toBeInTheDocument();
});
