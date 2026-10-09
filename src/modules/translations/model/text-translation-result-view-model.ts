import type {
  TextTranslationKeyPhrase,
  TextTranslationSegment,
} from "./text-translation-response";

export type TextTranslationResultViewModel = {
  kind: "text-translation";
  text: string;
  normalizedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
  segments: TextTranslationSegment[];
  keyPhrases: TextTranslationKeyPhrase[];
  notes: string[];
};
