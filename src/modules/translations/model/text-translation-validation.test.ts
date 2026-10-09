import { describe, expect, it } from "vitest";

async function loadValidationModule() {
  const modulePath = "./text-translation-validation";
  return import(modulePath);
}

describe("getTextTranslationValidationMessage", () => {
  it("returns an error when trimmed input is empty", async () => {
    const { getTextTranslationValidationMessage } = await loadValidationModule();

    expect(
      getTextTranslationValidationMessage({
        text: "   ",
        sourceLanguage: "zh",
        targetLanguage: "en",
      }),
    ).toBe("请输入要翻译的文本。");
  });

  it("accepts trimmed input at exactly 3000 characters", async () => {
    const { getTextTranslationValidationMessage } = await loadValidationModule();
    const maxLengthText = "你".repeat(3000);

    expect(
      getTextTranslationValidationMessage({
        text: `  ${maxLengthText}  `,
        sourceLanguage: "zh",
        targetLanguage: "en",
      }),
    ).toBeNull();
  });

  it("accepts exactly 3000 non-BMP code points", async () => {
    const { getTextTranslationValidationMessage } = await loadValidationModule();
    const maxLengthEmojiText = "😀".repeat(3000);

    expect(
      getTextTranslationValidationMessage({
        text: `  ${maxLengthEmojiText}  `,
        sourceLanguage: "zh",
        targetLanguage: "en",
      }),
    ).toBeNull();
  });

  it("rejects trimmed input above 3000 characters", async () => {
    const { getTextTranslationValidationMessage } = await loadValidationModule();
    const overLimitText = `${"你".repeat(3000)}好`;

    expect(
      getTextTranslationValidationMessage({
        text: `  ${overLimitText}  `,
        sourceLanguage: "zh",
        targetLanguage: "en",
      }),
    ).toBe("输入内容最多 3000 个字符，请精简后再试。");
  });

  it("blocks explicit same-language translation requests", async () => {
    const { getTextTranslationValidationMessage } = await loadValidationModule();

    expect(
      getTextTranslationValidationMessage({
        text: "你好",
        sourceLanguage: "zh",
        targetLanguage: "zh",
      }),
    ).toBe("源语言和目标语言不能相同，请选择不同语言。");
  });
});
