import type { EntryResultViewModel } from "@/modules/query/model/entry-result-view-model";
import { EnglishWordCard } from "@/modules/query/ui/english-word-card";
import { SentenceTranslationCard } from "@/modules/query/ui/sentence-translation-card";
import { ZhToEnTermCard } from "@/modules/query/ui/zh-to-en-term-card";

export function ResultSwitch({ result }: { result: EntryResultViewModel }) {
  switch (result.kind) {
    case "english-word":
      return <EnglishWordCard result={result} />;
    case "zh-to-en-term":
      return <ZhToEnTermCard result={result} />;
    case "sentence-translation":
      return <SentenceTranslationCard result={result} />;
    default:
      return null;
  }
}
