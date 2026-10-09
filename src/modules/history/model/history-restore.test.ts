import { expect, it } from "vitest";
import type { HistoryDetail } from "@/modules/history/api/fetch-history-detail";
import type { JacksonTimeArray } from "@/modules/history/model/history-types";

const textLatestSearchTime: JacksonTimeArray = [2026, 3, 22, 9, 10, 0];
const sentenceLatestSearchTime: JacksonTimeArray = [2026, 3, 21, 12, 0, 0];
const sentenceOlderSearchTime: JacksonTimeArray = [2026, 3, 20, 8, 30, 0];

it("parseHistoryDetail returns a TEXT_TRANSLATION restore payload for grouped history detail", async () => {
  const { parseHistoryDetail } = await import("./history-restore");
  const detail = {
    historyKey: "text::2026-03-22",
    query: "早上好",
    normalizedQuery: "早上好",
    resultType: "TEXT_TRANSLATION",
    summary: "Good morning",
    sourceApi: "TEXT_TRANSLATIONS_V1",
    latestSearchTime: textLatestSearchTime,
    searchCount: 1,
    searchTimes: [textLatestSearchTime],
    response: {
      text: "早上好",
      normalizedText: "早上好",
      sourceLanguage: "zh",
      targetLanguage: "en",
      translatedText: "Good morning",
      segments: [],
      keyPhrases: [],
      notes: ["常见问候语"],
    },
  } satisfies HistoryDetail;
  const result = parseHistoryDetail(detail);

  expect(result).toMatchObject({
    ok: true,
    value: {
      destination: "/translations",
      historyKey: "text::2026-03-22",
      resultType: "TEXT_TRANSLATION",
      restoredResult: {
        kind: "text-translation",
        translatedText: "Good morning",
      },
    },
  });
});

it("parseHistoryDetail keeps historyKey as identity for SENTENCE_TRANSLATION grouped detail with Jackson-array timestamps", async () => {
  const { parseHistoryDetail } = await import("./history-restore");
  const detail = {
    historyKey: "sentence::2026-03-21",
    query: "你今天怎么样？",
    normalizedQuery: "你今天怎么样？",
    resultType: "SENTENCE_TRANSLATION",
    summary: "How are you today?",
    sourceApi: "ENTRIES_V1",
    latestSearchTime: sentenceLatestSearchTime,
    searchCount: 2,
    searchTimes: [sentenceLatestSearchTime, sentenceOlderSearchTime],
    response: {
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
        literalTranslation: "How is your today?",
        grammarBreakdown: "问候句。",
        keyPhrases: [],
        alternativeExpressions: [],
        learningNotes: "可用于日常打招呼。",
      },
    },
  } satisfies HistoryDetail;
  const result = parseHistoryDetail(detail);

  expect(result).toMatchObject({
    ok: true,
    value: {
      destination: "/",
      historyKey: "sentence::2026-03-21",
      resultType: "SENTENCE_TRANSLATION",
      restoredResult: {
        kind: "sentence-translation",
        translatedSentence: "How are you today?",
      },
    },
  });
});

it("parseHistoryDetail accepts translation detail payloads from the live backend contract", async () => {
  const { parseHistoryDetail } = await import("./history-restore");
  const detail = {
    historyKey: "text::2026-03-22",
    query: "早上好",
    normalizedQuery: "早上好",
    resultType: "TEXT_TRANSLATION",
    summary: "Good morning",
    sourceApi: "TEXT_TRANSLATIONS_V1",
    latestSearchTime: textLatestSearchTime,
    searchCount: 1,
    searchTimes: [textLatestSearchTime],
    response: {
      text: "早上好",
      normalizedText: "早上好",
      sourceLanguage: "zh",
      targetLanguage: "en",
      translatedText: "Good morning",
      segments: [
        {
          sourceText: "早上好",
          translatedText: "Good morning",
        },
      ],
      keyPhrases: [
        {
          sourceText: "早上好",
          translatedText: "Good morning",
          note: "常见问候语",
        },
      ],
      notes: "常见问候语",
    },
  } as unknown as HistoryDetail;

  expect(parseHistoryDetail(detail)).toEqual({
    ok: true,
    value: {
      destination: "/translations",
      historyKey: "text::2026-03-22",
      resultType: "TEXT_TRANSLATION",
      restoredResult: {
        kind: "text-translation",
        text: "早上好",
        normalizedText: "早上好",
        sourceLanguage: "zh",
        targetLanguage: "en",
        translatedText: "Good morning",
        segments: [
          {
            text: "早上好",
            translatedText: "Good morning",
          },
        ],
        keyPhrases: [
          {
            phrase: "早上好",
            translation: "Good morning",
            note: "常见问候语",
          },
        ],
        notes: ["常见问候语"],
      },
    },
  });
});
