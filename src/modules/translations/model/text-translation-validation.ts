const MAX_TEXT_TRANSLATION_LENGTH = 3000;

export type TextTranslationValidationInput = {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
};

function countCodePoints(value: string) {
  return [...value].length;
}

function isExplicitSameLanguage(sourceLanguage: string, targetLanguage: string) {
  return sourceLanguage !== "auto" && targetLanguage !== "auto" && sourceLanguage === targetLanguage;
}

export function getTextTranslationValidationMessage(
  input: TextTranslationValidationInput,
): string | null {
  const trimmedText = input.text.trim();

  if (!trimmedText) {
    return "请输入要翻译的文本。";
  }

  if (countCodePoints(trimmedText) > MAX_TEXT_TRANSLATION_LENGTH) {
    return "输入内容最多 3000 个字符，请精简后再试。";
  }

  if (isExplicitSameLanguage(input.sourceLanguage, input.targetLanguage)) {
    return "源语言和目标语言不能相同，请选择不同语言。";
  }

  return null;
}
