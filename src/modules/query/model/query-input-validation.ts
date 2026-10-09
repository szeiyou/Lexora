export const MAX_QUERY_LENGTH = 300;

export function getQueryCharacterCount(value: string) {
  return Array.from(value.trim()).length;
}

export function getQueryValidationMessage(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (getQueryCharacterCount(trimmed) > MAX_QUERY_LENGTH) {
    return `输入内容最多 ${MAX_QUERY_LENGTH} 个字符，请精简后再试。`;
  }

  return null;
}
