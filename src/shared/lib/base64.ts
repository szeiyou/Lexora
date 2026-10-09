const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function encodeBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

export function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function encodeUtf8ToBase64(value: string): string {
  return encodeBytesToBase64(textEncoder.encode(value));
}

export function decodeBase64ToUtf8(base64: string): string {
  return textDecoder.decode(decodeBase64ToBytes(base64));
}
