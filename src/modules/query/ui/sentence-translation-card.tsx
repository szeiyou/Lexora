import type { SentenceTranslationResultViewModel } from "@/modules/query/model/entry-result-view-model";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";

export function SentenceTranslationCard({ result }: { result: SentenceTranslationResultViewModel }) {
  return (
    <Card className="overflow-hidden border-white/5 bg-[linear-gradient(180deg,hsl(var(--card))/0.96,hsl(var(--surface))/0.9)]">
      <CardHeader className="gap-4">
        <div className="space-y-2">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">句子翻译</p>
          <CardTitle className="text-2xl leading-tight tracking-tight">{result.sourceSentence}</CardTitle>
          <p className="text-base text-[hsl(var(--foreground))]">{result.translatedSentence}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Separator />

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[var(--radius-md)] border border-white/5 bg-white/5 px-4 py-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">直译</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{result.literalTranslation}</p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-white/5 bg-white/5 px-4 py-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">语法拆解</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{result.grammarBreakdown}</p>
          </div>
        </section>

        <section className="space-y-3" aria-label="关键短语">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">关键短语</h3>
          <div className="grid gap-3">
            {result.keyPhrases.map((item) => (
              <div
                key={item.phrase}
                className="rounded-[var(--radius-md)] border border-white/5 bg-black/10 px-4 py-3"
              >
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">{item.phrase}</p>
                <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{item.explanation}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-[var(--radius-md)] border border-white/5 bg-white/5 px-4 py-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">替代表达</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[hsl(var(--muted-foreground))]">
              {result.alternatives.map((alternative) => (
                <li key={alternative}>{alternative}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[var(--radius-md)] border border-white/5 bg-white/5 px-4 py-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">学习提示</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{result.learningNotes}</p>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
