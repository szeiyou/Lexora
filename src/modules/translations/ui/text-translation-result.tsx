import { ArrowRight } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { TextTranslationResultViewModel } from "@/modules/translations/model/text-translation-result-view-model";
import { cn } from "@/shared/lib/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

type TextTranslationResultProps = {
  result: TextTranslationResultViewModel;
};

const COLLAPSED_SOURCE_PREVIEW_HEIGHT = 72;

export function TextTranslationResult({ result }: TextTranslationResultProps) {
  const sourcePreviewRef = useRef<HTMLParagraphElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    setIsExpanded(false);

    const measureOverflow = () => {
      const preview = sourcePreviewRef.current;
      if (!preview) {
        return;
      }

      setIsOverflowing(preview.scrollHeight > COLLAPSED_SOURCE_PREVIEW_HEIGHT);
    };

    measureOverflow();
    window.addEventListener("resize", measureOverflow);

    return () => {
      window.removeEventListener("resize", measureOverflow);
    };
  }, [result]);

  return (
    <div className="space-y-4">
      <Card className="border-[hsl(var(--border))]/80 bg-[hsl(var(--surface))/0.55] shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">译文</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--muted-foreground))]">
              原文
            </p>
            <div className="relative">
              <p
                ref={sourcePreviewRef}
                data-testid="translation-source-preview"
                className={cn(
                  "whitespace-pre-wrap break-words text-sm leading-6 text-[hsl(var(--muted-foreground))] transition-[max-height] duration-200 ease-out",
                  isOverflowing && !isExpanded ? "overflow-hidden" : undefined,
                )}
                style={
                  isOverflowing && !isExpanded
                    ? { maxHeight: `${COLLAPSED_SOURCE_PREVIEW_HEIGHT}px` }
                    : undefined
                }
              >
                {result.text}
              </p>
              {isOverflowing && !isExpanded ? (
                <div
                  data-testid="translation-source-fade"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[hsl(var(--surface))] via-[hsl(var(--surface))/0.92] to-transparent"
                />
              ) : null}
            </div>
            {isOverflowing ? (
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => {
                  setIsExpanded((expanded) => !expanded);
                }}
                className="inline-flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
              >
                <ArrowRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                    isExpanded ? "-rotate-90" : undefined,
                  )}
                />
                {isExpanded ? "收起原文" : "查看完整原文"}
              </button>
            ) : null}
          </div>
          <p className="text-xl font-semibold text-[hsl(var(--foreground))]">{result.translatedText}</p>
        </CardContent>
      </Card>

      {result.segments.length > 0 ? (
        <Card className="border-[hsl(var(--border))]/80 bg-[hsl(var(--surface))/0.55] shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">分段对照</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.segments.map((segment, index) => (
              <div
                key={`${segment.text}-${segment.translatedText}-${index}`}
                className="rounded-[var(--radius-sm)] border border-[hsl(var(--border))]/70 bg-black/10 p-3"
              >
                <p className="text-sm text-[hsl(var(--foreground))]">{segment.text}</p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                  {segment.translatedText}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {result.keyPhrases.length > 0 ? (
        <Card className="border-[hsl(var(--border))]/80 bg-[hsl(var(--surface))/0.55] shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">关键词</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {result.keyPhrases.map((phrase, index) => (
              <div
                key={`${phrase.phrase}-${phrase.translation}-${index}`}
                className="rounded-[var(--radius-sm)] border border-[hsl(var(--border))]/70 bg-black/10 p-3"
              >
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">{phrase.phrase}</p>
                <p className="mt-1 text-sm text-[hsl(var(--foreground))]">{phrase.translation}</p>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{phrase.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {result.notes.length > 0 ? (
        <Card className="border-[hsl(var(--border))]/80 bg-[hsl(var(--surface))/0.55] shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">备注</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.notes.map((note, index) => (
                <li
                  key={`${note}-${index}`}
                  className="rounded-[var(--radius-sm)] border border-[hsl(var(--border))]/70 bg-black/10 px-3 py-2 text-sm text-[hsl(var(--muted-foreground))]"
                >
                  {note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
