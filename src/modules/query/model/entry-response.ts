export type EntryResultType = "ENGLISH_WORD" | "ZH_TO_EN_TERM" | "SENTENCE_TRANSLATION";

export type AudioDescriptor = {
  audioKey: string;
  audioUrl: string;
};

export type Pronunciation = {
  uk: string;
  us: string;
};

export type EnglishWordDefinition = {
  partOfSpeech: string;
  meaning: string;
  synonyms: string[];
};

export type EnglishWordExample = {
  sentence: string;
  translation: string;
};

export type EnglishWordPayload = {
  word: string;
  pronunciation: Pronunciation;
  definitions: EnglishWordDefinition[];
  examples: EnglishWordExample[];
  etymology: string;
  extension: string;
  headwordAudio: AudioDescriptor | null;
  fullReadingAudio: AudioDescriptor | null;
};

export type ZhToEnCandidatePayload = {
  term: string;
  pronunciation: Pronunciation;
  partOfSpeech: string;
  coreMeaning: string;
  usageContext: string;
  difference: string;
  example: string;
  exampleTranslation: string;
  headwordAudio: AudioDescriptor | null;
};

export type ZhToEnTermPayload = {
  input: string;
  usageTip: string;
  candidates: ZhToEnCandidatePayload[];
};

export type SentenceKeyPhrasePayload = {
  phrase: string;
  explanation: string;
};

export type SentenceTranslationPayload = {
  sourceSentence: string;
  translatedSentence: string;
  literalTranslation: string;
  grammarBreakdown: string;
  keyPhrases: SentenceKeyPhrasePayload[];
  alternativeExpressions: string[];
  learningNotes: string;
};

export type EntryQueryResponse = {
  query: string;
  normalizedQuery: string;
  resultType: EntryResultType;
  sourceLanguage: string;
  targetLanguage: string;
  englishWord: EnglishWordPayload | null;
  zhToEnTerm: ZhToEnTermPayload | null;
  sentenceTranslation: SentenceTranslationPayload | null;
};
