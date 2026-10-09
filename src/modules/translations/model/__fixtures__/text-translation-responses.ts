export const textTranslationApiResponse = {
  text: "今天天气真好!!! 适合出去走走。",
  normalizedText: "今天天气真好，适合出去走走。",
  sourceLanguage: "zh",
  targetLanguage: "en",
  translatedText: "The weather is great today, perfect for a walk.",
  segments: [
    {
      sourceText: "今天天气真好",
      translatedText: "The weather is great today",
    },
    {
      sourceText: "适合出去走走",
      translatedText: "perfect for a walk",
    },
  ],
  keyPhrases: [
    {
      sourceText: "天气真好",
      translatedText: "the weather is great",
      note: "用于描述当下天气状况。",
    },
  ],
  notes: "口语里可替换为“适合出门散步”。",
} as const;

export const textTranslationResult = {
  text: "今天天气真好!!! 适合出去走走。",
  normalizedText: "今天天气真好，适合出去走走。",
  sourceLanguage: "zh",
  targetLanguage: "en",
  translatedText: "The weather is great today, perfect for a walk.",
  segments: [
    {
      text: "今天天气真好",
      translatedText: "The weather is great today",
    },
    {
      text: "适合出去走走",
      translatedText: "perfect for a walk",
    },
  ],
  keyPhrases: [
    {
      phrase: "天气真好",
      translation: "the weather is great",
      note: "用于描述当下天气状况。",
    },
  ],
  notes: ["口语里可替换为“适合出门散步”。"],
} as const;
