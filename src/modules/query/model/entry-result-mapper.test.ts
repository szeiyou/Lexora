import {
  englishWordResponse,
  sentenceTranslationResponse,
  zhToEnTermResponse,
} from "./__fixtures__/entry-responses";
import { mapEntryResponse } from "./entry-result-mapper";

it("maps ENGLISH_WORD payloads into a shared view model", () => {
  const result = mapEntryResponse(englishWordResponse);

  expect(result.kind).toBe("english-word");
  if (result.kind !== "english-word") {
    throw new Error("Expected english-word result");
  }

  expect(result.audio.headword?.audioKey).toBe("english_word:headword:phenomenon");
});

it("compacts null audio fields to undefined for ENGLISH_WORD", () => {
  const result = mapEntryResponse({
    ...englishWordResponse,
    englishWord: {
      ...englishWordResponse.englishWord!,
      headwordAudio: null,
      fullReadingAudio: null,
    },
  });

  expect(result.kind).toBe("english-word");
  if (result.kind !== "english-word") {
    throw new Error("Expected english-word result");
  }

  expect(result.audio.headword).toBeUndefined();
  expect(result.audio.fullReading).toBeUndefined();
});

it("maps ZH_TO_EN_TERM payloads into a shared view model", () => {
  const result = mapEntryResponse(zhToEnTermResponse);

  expect(result.kind).toBe("zh-to-en-term");
  if (result.kind !== "zh-to-en-term") {
    throw new Error("Expected zh-to-en-term result");
  }

  expect(result.candidates[0]?.term).toBe("apple");
  expect(result.audio.headword?.audioKey).toBe("zh_to_en_term:headword:apple");
});

it("maps SENTENCE_TRANSLATION payloads into a shared view model", () => {
  const result = mapEntryResponse(sentenceTranslationResponse);

  expect(result.kind).toBe("sentence-translation");
  if (result.kind !== "sentence-translation") {
    throw new Error("Expected sentence-translation result");
  }

  expect(result.translatedSentence).toBe("How are you today?");
  expect(result.alternatives).toEqual(["How have you been today?"]);
});

it("throws for selected ENGLISH_WORD result type when englishWord payload is missing", () => {
  expect(() =>
    mapEntryResponse({
      ...englishWordResponse,
      englishWord: null,
    }),
  ).toThrowError("Invalid /entries response: ENGLISH_WORD requires englishWord.");
});

it("throws for unknown resultType values", () => {
  expect(() =>
    mapEntryResponse({
      ...englishWordResponse,
      resultType: "UNRECOGNIZED_RESULT" as never,
    }),
  ).toThrowError("Invalid /entries response: unsupported resultType UNRECOGNIZED_RESULT.");
});
