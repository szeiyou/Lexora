import { expect, it } from "vitest";
import { sentenceTranslationResponse } from "@/modules/query/model/__fixtures__/entry-responses";
import { parseHistoryResponseJson } from "@/modules/history/model/history-response.parser";

it("parses stored history JSON into the shared entry result model", () => {
  const result = parseHistoryResponseJson(JSON.stringify(sentenceTranslationResponse));

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.kind).toBe("sentence-translation");
    if (result.value.kind !== "sentence-translation") {
      throw new Error("Expected a sentence translation result.");
    }

    expect(result.value.translatedSentence).toBe("How are you today?");
  }
});

it("returns a recoverable error result for invalid history JSON", () => {
  const result = parseHistoryResponseJson("{bad json");

  expect(result).toEqual({
    ok: false,
    reason: "history-parse-failed",
  });
});
