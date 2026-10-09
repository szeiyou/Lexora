import { describe, expect, it } from "vitest";
import {
  textTranslationApiResponse,
  textTranslationResult,
} from "./__fixtures__/text-translation-responses";

async function loadMapperModule() {
  const modulePath = "./text-translation-result-mapper";
  return import(modulePath);
}

describe("mapTextTranslationResult", () => {
  it("maps the text-translations API payload into a text-translation view model", async () => {
    const { mapTextTranslationResult } = await loadMapperModule();
    const result = mapTextTranslationResult(textTranslationApiResponse);

    expect(result).toEqual({
      kind: "text-translation",
      ...textTranslationResult,
    });
  });

  it("rejects payloads missing normalizedText", async () => {
    const { mapTextTranslationResult } = await loadMapperModule();
    const invalidResponse = {
      ...textTranslationApiResponse,
      normalizedText: undefined,
    };

    expect(() => mapTextTranslationResult(invalidResponse)).toThrow(
      "Invalid /text-translations response: missing normalizedText.",
    );
  });
});
