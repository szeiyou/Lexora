export type TextTranslationSegment = {
  text: string;
  translatedText: string;
};

export type TextTranslationKeyPhrase = {
  phrase: string;
  translation: string;
  note: string;
};

export type TextTranslationResponse = {
  text: string;
  normalizedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
  segments: TextTranslationSegment[];
  keyPhrases: TextTranslationKeyPhrase[];
  notes: string[];
};

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireJsonRecord(value: unknown, fieldName: string): JsonRecord {
  if (isJsonRecord(value)) {
    return value;
  }

  throw new Error(`Invalid /text-translations response: ${fieldName} must be an object.`);
}

function requireStringField(record: JsonRecord, fieldName: string): string {
  const value = record[fieldName];

  if (typeof value === "string") {
    return value;
  }

  if (value === undefined) {
    throw new Error(`Invalid /text-translations response: missing ${fieldName}.`);
  }

  throw new Error(`Invalid /text-translations response: ${fieldName} must be a string.`);
}

function requireOneOfStringFields(
  record: JsonRecord,
  fieldNames: readonly string[],
  errorLabel: string,
) {
  for (const fieldName of fieldNames) {
    const value = record[fieldName];
    if (typeof value === "string") {
      return value;
    }
  }

  if (fieldNames.some((fieldName) => record[fieldName] !== undefined)) {
    throw new Error(`Invalid /text-translations response: ${errorLabel} must be a string.`);
  }

  throw new Error(`Invalid /text-translations response: missing ${errorLabel}.`);
}

function parseSegments(value: unknown): TextTranslationSegment[] {
  if (!Array.isArray(value)) {
    throw new Error("Invalid /text-translations response: segments must be an array.");
  }

  return value.map((item, index) => {
    const record = requireJsonRecord(item, `segments[${index}]`);

    return {
      text: requireOneOfStringFields(record, ["text", "sourceText"], "text"),
      translatedText: requireStringField(record, "translatedText"),
    };
  });
}

function parseKeyPhrases(value: unknown): TextTranslationKeyPhrase[] {
  if (!Array.isArray(value)) {
    throw new Error("Invalid /text-translations response: keyPhrases must be an array.");
  }

  return value.map((item, index) => {
    const record = requireJsonRecord(item, `keyPhrases[${index}]`);

    return {
      phrase: requireOneOfStringFields(record, ["phrase", "sourceText"], "phrase"),
      translation: requireOneOfStringFields(
        record,
        ["translation", "translatedText"],
        "translation",
      ),
      note: requireStringField(record, "note"),
    };
  });
}

function parseNotes(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() ? [value] : [];
  }

  if (!Array.isArray(value)) {
    throw new Error("Invalid /text-translations response: notes must be an array.");
  }

  return value.map((item, index) => {
    if (typeof item === "string") {
      return item;
    }

    throw new Error(`Invalid /text-translations response: notes[${index}] must be a string.`);
  });
}

export function parseTextTranslationResponse(response: unknown): TextTranslationResponse {
  const record = requireJsonRecord(response, "response");

  return {
    text: requireStringField(record, "text"),
    normalizedText: requireStringField(record, "normalizedText"),
    sourceLanguage: requireStringField(record, "sourceLanguage"),
    targetLanguage: requireStringField(record, "targetLanguage"),
    translatedText: requireStringField(record, "translatedText"),
    segments: parseSegments(record.segments),
    keyPhrases: parseKeyPhrases(record.keyPhrases),
    notes: parseNotes(record.notes),
  };
}
