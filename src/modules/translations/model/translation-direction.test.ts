import { describe, expect, it } from "vitest";
import {
  getTranslationDirectionFromLanguages,
  resolveTranslationLanguages,
} from "./translation-direction";

describe("resolveTranslationLanguages", () => {
  it("maps 中译英 to zh -> en", () => {
    expect(resolveTranslationLanguages({ direction: "ZH_TO_EN", text: "你好" })).toEqual({
      sourceLanguage: "zh",
      targetLanguage: "en",
    });
  });

  it("maps 英译中 to en -> zh", () => {
    expect(resolveTranslationLanguages({ direction: "EN_TO_ZH", text: "hello" })).toEqual({
      sourceLanguage: "en",
      targetLanguage: "zh",
    });
  });

  it("maps 自动检测 Chinese text to zh -> en", () => {
    expect(resolveTranslationLanguages({ direction: "AUTO", text: "今天天气真好" })).toEqual({
      sourceLanguage: "zh",
      targetLanguage: "en",
    });
  });

  it("maps 自动检测 English text to en -> zh", () => {
    expect(resolveTranslationLanguages({ direction: "AUTO", text: "The weather is great today." })).toEqual({
      sourceLanguage: "en",
      targetLanguage: "zh",
    });
  });
});

describe("getTranslationDirectionFromLanguages", () => {
  it("maps zh -> en to 中译英", () => {
    expect(getTranslationDirectionFromLanguages("zh", "en")).toBe("ZH_TO_EN");
  });

  it("maps en -> zh to 英译中", () => {
    expect(getTranslationDirectionFromLanguages("en", "zh")).toBe("EN_TO_ZH");
  });

  it("falls back to 自动检测 for non-explicit pairs", () => {
    expect(getTranslationDirectionFromLanguages("auto", "en")).toBe("AUTO");
  });
});
