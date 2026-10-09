import { AudioButton } from "@/modules/audio/ui/audio-button";
import type { EnglishWordResultViewModel } from "@/modules/query/model/entry-result-view-model";
import { AddToWordbookDialog } from "@/modules/wordbooks/ui/add-to-wordbook-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";

export function EnglishWordCard({ result }: { result: EnglishWordResultViewModel }) {
  return (
    <Card className="overflow-hidden border-white/5 bg-[linear-gradient(180deg,hsl(var(--card))/0.96,hsl(var(--surface))/0.9)]">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">英文单词</p>
            <CardTitle className="text-3xl tracking-tight">{result.word}</CardTitle>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              英 / {result.pronunciation.uk} · 美 / {result.pronunciation.us}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <AudioButton audio={result.audio.headword} label="词头发音" />
            <AudioButton audio={result.audio.fullReading} label="完整朗读" allowManualStop />
            <AddToWordbookDialog word={result.word} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Separator />

        <section className="space-y-3" aria-label="释义">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">释义</h3>
          <div className="grid gap-3">
            {result.definitions.map((definition) => (
              <div
                key={`${definition.partOfSpeech}-${definition.meaning}`}
                className="rounded-[var(--radius-md)] border border-white/5 bg-white/5 px-4 py-3"
              >
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  {definition.partOfSpeech} {definition.meaning}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3" aria-label="例句">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">例句</h3>
          <div className="grid gap-3">
            {result.examples.map((example) => (
              <div
                key={example.sentence}
                className="rounded-[var(--radius-md)] border border-white/5 bg-black/10 px-4 py-3"
              >
                <p className="text-sm text-[hsl(var(--foreground))]">{example.sentence}</p>
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{example.translation}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2" aria-label="补充信息">
          <div className="rounded-[var(--radius-md)] border border-white/5 bg-white/5 px-4 py-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">词源</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{result.etymology}</p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-white/5 bg-white/5 px-4 py-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">延伸说明</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{result.extension}</p>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
