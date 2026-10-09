export const TRANSLATION_DIRECTION_OPTIONS = [
  { value: "ZH_TO_EN", label: "中译英" },
  { value: "EN_TO_ZH", label: "英译中" },
  { value: "AUTO", label: "自动检测" },
] as const;

export type TranslationDirection = (typeof TRANSLATION_DIRECTION_OPTIONS)[number]["value"];

type TranslationLanguage = "auto" | "zh" | "en";
type ExplicitTargetLanguage = Exclude<TranslationLanguage, "auto">;

export type TranslationLanguagePair = {
  sourceLanguage: TranslationLanguage;
  targetLanguage: ExplicitTargetLanguage;
};

const HAN_CHARACTER_PATTERN = /\p{Script=Han}/u;
const LATIN_LETTER_PATTERN = /[A-Za-z]/;

function detectAutoDirection(text: string): TranslationDirection | null {
  let hanCharacterCount = 0;
  let latinLetterCount = 0;
  let firstMeaningfulDirection: Exclude<TranslationDirection, "AUTO"> | null = null;

  for (const char of text) {
    if (HAN_CHARACTER_PATTERN.test(char)) {
      hanCharacterCount += 1;
      firstMeaningfulDirection ??= "ZH_TO_EN";
      continue;
    }

    if (LATIN_LETTER_PATTERN.test(char)) {
      latinLetterCount += 1;
      firstMeaningfulDirection ??= "EN_TO_ZH";
    }
  }

  if (hanCharacterCount > latinLetterCount) {
    return "ZH_TO_EN";
  }

  if (latinLetterCount > hanCharacterCount) {
    return "EN_TO_ZH";
  }

  return firstMeaningfulDirection;
}

export function resolveTranslationLanguages(input: {
  direction: TranslationDirection;
  text: string;
}): TranslationLanguagePair {
  if (input.direction === "ZH_TO_EN") {
    return {
      sourceLanguage: "zh",
      targetLanguage: "en",
    };
  }

  if (input.direction === "EN_TO_ZH") {
    return {
      sourceLanguage: "en",
      targetLanguage: "zh",
    };
  }

  const detectedDirection = detectAutoDirection(input.text.trim());

  if (detectedDirection === "EN_TO_ZH") {
    return {
      sourceLanguage: "en",
      targetLanguage: "zh",
    };
  }

  if (detectedDirection === "ZH_TO_EN") {
    return {
      sourceLanguage: "zh",
      targetLanguage: "en",
    };
  }

  return {
    sourceLanguage: "auto",
    targetLanguage: "en",
  };
}

export function getTranslationDirectionFromLanguages(
  sourceLanguage: string,
  targetLanguage: string,
): TranslationDirection {
  if (sourceLanguage === "zh" && targetLanguage === "en") {
    return "ZH_TO_EN";
  }

  if (sourceLanguage === "en" && targetLanguage === "zh") {
    return "EN_TO_ZH";
  }

  return "AUTO";
}
