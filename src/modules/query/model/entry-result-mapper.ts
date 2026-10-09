import type {
  AudioDescriptor,
  EnglishWordPayload,
  EntryQueryResponse,
  SentenceTranslationPayload,
  ZhToEnTermPayload,
} from "./entry-response";
import type { EntryResultViewModel, TermCandidateViewModel } from "./entry-result-view-model";

function requirePayload<T>(
  payload: T | null,
  resultType: EntryQueryResponse["resultType"],
  fieldName: string,
): T {
  if (payload !== null) {
    return payload;
  }

  throw new Error(`Invalid /entries response: ${resultType} requires ${fieldName}.`);
}

function compactAudio(audio?: AudioDescriptor | null): AudioDescriptor | undefined {
  return audio ?? undefined;
}

function mapEnglishWord(response: EntryQueryResponse): EntryResultViewModel {
  const payload = requirePayload(response.englishWord, "ENGLISH_WORD", "englishWord");

  return {
    kind: "english-word",
    query: response.query,
    word: payload.word,
    pronunciation: payload.pronunciation,
    definitions: payload.definitions,
    examples: payload.examples,
    etymology: payload.etymology,
    extension: payload.extension,
    audio: {
      headword: compactAudio(payload.headwordAudio),
      fullReading: compactAudio(payload.fullReadingAudio),
    },
  };
}

function mapZhToEnCandidate(payload: ZhToEnTermPayload): TermCandidateViewModel[] {
  return payload.candidates.map((candidate) => ({
    term: candidate.term,
    pronunciation: candidate.pronunciation,
    partOfSpeech: candidate.partOfSpeech,
    coreMeaning: candidate.coreMeaning,
    usageContext: candidate.usageContext,
    difference: candidate.difference,
    example: candidate.example,
    exampleTranslation: candidate.exampleTranslation,
    headwordAudio: compactAudio(candidate.headwordAudio),
  }));
}

function findPrimaryCandidateAudio(payload: ZhToEnTermPayload): AudioDescriptor | undefined {
  return compactAudio(payload.candidates[0]?.headwordAudio);
}

function mapZhToEnTerm(response: EntryQueryResponse): EntryResultViewModel {
  const payload = requirePayload(response.zhToEnTerm, "ZH_TO_EN_TERM", "zhToEnTerm");

  return {
    kind: "zh-to-en-term",
    query: response.query,
    input: payload.input,
    usageTip: payload.usageTip,
    candidates: mapZhToEnCandidate(payload),
    audio: {
      headword: findPrimaryCandidateAudio(payload),
    },
  };
}

function mapSentenceTranslation(response: EntryQueryResponse): EntryResultViewModel {
  const payload = requirePayload(
    response.sentenceTranslation,
    "SENTENCE_TRANSLATION",
    "sentenceTranslation",
  );

  return {
    kind: "sentence-translation",
    query: response.query,
    sourceSentence: payload.sourceSentence,
    translatedSentence: payload.translatedSentence,
    literalTranslation: payload.literalTranslation,
    grammarBreakdown: payload.grammarBreakdown,
    keyPhrases: payload.keyPhrases,
    alternatives: payload.alternativeExpressions,
    learningNotes: payload.learningNotes,
    audio: {},
  };
}

export function mapEntryResponse(response: EntryQueryResponse): EntryResultViewModel {
  switch (response.resultType) {
    case "ENGLISH_WORD":
      return mapEnglishWord(response);
    case "ZH_TO_EN_TERM":
      return mapZhToEnTerm(response);
    case "SENTENCE_TRANSLATION":
      return mapSentenceTranslation(response);
    default:
      throw new Error(
        `Invalid /entries response: unsupported resultType ${String(response.resultType)}.`,
      );
  }
}
