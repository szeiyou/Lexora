import type {
  AudioDescriptor,
  EnglishWordDefinition,
  EnglishWordExample,
  Pronunciation,
  SentenceKeyPhrasePayload,
} from "./entry-response";

export type EntryAudioViewModel = {
  headword?: AudioDescriptor;
  fullReading?: AudioDescriptor;
};

export type TermCandidateViewModel = {
  term: string;
  pronunciation: Pronunciation;
  partOfSpeech: string;
  coreMeaning: string;
  usageContext: string;
  difference: string;
  example: string;
  exampleTranslation: string;
  headwordAudio?: AudioDescriptor;
};

export type EnglishWordResultViewModel = {
  kind: "english-word";
  query: string;
  word: string;
  pronunciation: Pronunciation;
  definitions: EnglishWordDefinition[];
  examples: EnglishWordExample[];
  etymology: string;
  extension: string;
  audio: EntryAudioViewModel;
};

export type ZhToEnTermResultViewModel = {
  kind: "zh-to-en-term";
  query: string;
  input: string;
  usageTip: string;
  candidates: TermCandidateViewModel[];
  audio: {
    headword?: AudioDescriptor;
  };
};

export type SentenceTranslationResultViewModel = {
  kind: "sentence-translation";
  query: string;
  sourceSentence: string;
  translatedSentence: string;
  literalTranslation: string;
  grammarBreakdown: string;
  keyPhrases: SentenceKeyPhrasePayload[];
  alternatives: string[];
  learningNotes: string;
  audio: {};
};

export type EntryResultViewModel =
  | EnglishWordResultViewModel
  | ZhToEnTermResultViewModel
  | SentenceTranslationResultViewModel;
