import type { EntryQueryResponse } from "../entry-response";

export const englishWordResponse: EntryQueryResponse = {
  query: "phenomenon",
  normalizedQuery: "phenomenon",
  resultType: "ENGLISH_WORD",
  sourceLanguage: "en",
  targetLanguage: "zh",
  englishWord: {
    word: "phenomenon",
    pronunciation: {
      uk: "/fəˈnɒm.ɪ.nən/",
      us: "/fəˈnɑː.mə.nɑːn/",
    },
    definitions: [
      {
        partOfSpeech: "n.",
        meaning: "现象",
        synonyms: ["occurrence"],
      },
    ],
    examples: [
      {
        sentence: "The northern lights are a natural phenomenon.",
        translation: "北极光是一种自然现象。",
      },
    ],
    etymology: "From Greek.",
    extension: "常用于描述自然或社会现象。",
    headwordAudio: {
      audioKey: "english_word:headword:phenomenon",
      audioUrl: "/api/v1/audio/by-key/english_word%3Aheadword%3Aphenomenon",
    },
    fullReadingAudio: {
      audioKey: "english_word:full_reading:phenomenon",
      audioUrl: "/api/v1/audio/by-key/english_word%3Afull_reading%3Aphenomenon",
    },
  },
  zhToEnTerm: null,
  sentenceTranslation: null,
};

export const zhToEnTermResponse: EntryQueryResponse = {
  query: "苹果",
  normalizedQuery: "苹果",
  resultType: "ZH_TO_EN_TERM",
  sourceLanguage: "zh",
  targetLanguage: "en",
  englishWord: null,
  zhToEnTerm: {
    input: "苹果",
    usageTip: "水果通常用 apple；公司名称用 Apple。",
    candidates: [
      {
        term: "apple",
        pronunciation: {
          uk: "/ˈæp.əl/",
          us: "/ˈæp.əl/",
        },
        partOfSpeech: "n.",
        coreMeaning: "苹果",
        usageContext: "日常指水果时使用",
        difference: "最常见、最自然的表达。",
        example: "I eat an apple every morning.",
        exampleTranslation: "我每天早上吃一个苹果。",
        headwordAudio: {
          audioKey: "zh_to_en_term:headword:apple",
          audioUrl: "/api/v1/audio/by-key/zh_to_en_term%3Aheadword%3Aapple",
        },
      },
    ],
  },
  sentenceTranslation: null,
};

export const sentenceTranslationResponse: EntryQueryResponse = {
  query: "你今天怎么样？",
  normalizedQuery: "你今天怎么样？",
  resultType: "SENTENCE_TRANSLATION",
  sourceLanguage: "zh",
  targetLanguage: "en",
  englishWord: null,
  zhToEnTerm: null,
  sentenceTranslation: {
    sourceSentence: "你今天怎么样？",
    translatedSentence: "How are you today?",
    literalTranslation: "How are you today?",
    grammarBreakdown: "How are you today 是常见问候语。",
    keyPhrases: [
      {
        phrase: "How are you",
        explanation: "用于询问对方近况。",
      },
    ],
    alternativeExpressions: ["How have you been today?"],
    learningNotes: "可用于日常打招呼。",
  },
};
