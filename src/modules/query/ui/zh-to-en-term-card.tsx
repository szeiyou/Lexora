import { AudioButton } from "@/modules/audio/ui/audio-button";
import type { ZhToEnTermResultViewModel } from "@/modules/query/model/entry-result-view-model";
import { AddToWordbookDialog } from "@/modules/wordbooks/ui/add-to-wordbook-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";

export function ZhToEnTermCard({ result }: { result: ZhToEnTermResultViewModel }) {
  return (
    <Card className="overflow-hidden border-white/5 bg-[linear-gradient(180deg,hsl(var(--card))/0.96,hsl(var(--surface))/0.9)]">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">中译英词条</p>
            <CardTitle className="text-3xl tracking-tight">{result.input}</CardTitle>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{result.usageTip}</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <AudioButton audio={result.audio.headword} label="术语发音" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Separator />
        <section className="space-y-3" aria-label="候选词条">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">候选词条</h3>
          <div className="grid gap-4">
            {result.candidates.map((candidate) => (
              <article
                key={candidate.term}
                className="rounded-[var(--radius-md)] border border-white/5 bg-white/5 px-4 py-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-[hsl(var(--foreground))]">{candidate.term}</h4>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                      {candidate.partOfSpeech} · 英 {candidate.pronunciation.uk} · 美 {candidate.pronunciation.us}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <AudioButton audio={candidate.headwordAudio} label="词条发音" />
                    <AddToWordbookDialog word={candidate.term} triggerLabel="加入单词本" />
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <dt className="font-medium text-[hsl(var(--foreground))]">核心释义</dt>
                    <dd className="mt-1 text-[hsl(var(--muted-foreground))]">{candidate.coreMeaning}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[hsl(var(--foreground))]">使用语境</dt>
                    <dd className="mt-1 text-[hsl(var(--muted-foreground))]">{candidate.usageContext}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[hsl(var(--foreground))]">表达差异</dt>
                    <dd className="mt-1 text-[hsl(var(--muted-foreground))]">{candidate.difference}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[hsl(var(--foreground))]">例句</dt>
                    <dd className="mt-1 text-[hsl(var(--muted-foreground))]">{candidate.example}</dd>
                    <dd className="mt-1 text-[hsl(var(--muted-foreground))]">{candidate.exampleTranslation}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
