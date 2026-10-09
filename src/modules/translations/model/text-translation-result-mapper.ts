import { parseTextTranslationResponse } from "./text-translation-response";
import type { TextTranslationResultViewModel } from "./text-translation-result-view-model";

export function mapTextTranslationResult(response: unknown): TextTranslationResultViewModel {
  const parsedResponse = parseTextTranslationResponse(response);

  return {
    kind: "text-translation",
    text: parsedResponse.text,
    normalizedText: parsedResponse.normalizedText,
    sourceLanguage: parsedResponse.sourceLanguage,
    targetLanguage: parsedResponse.targetLanguage,
    translatedText: parsedResponse.translatedText,
    segments: parsedResponse.segments.map((segment) => ({
      text: segment.text,
      translatedText: segment.translatedText,
    })),
    keyPhrases: parsedResponse.keyPhrases.map((phrase) => ({
      phrase: phrase.phrase,
      translation: phrase.translation,
      note: phrase.note,
    })),
    notes: [...parsedResponse.notes],
  };
}
