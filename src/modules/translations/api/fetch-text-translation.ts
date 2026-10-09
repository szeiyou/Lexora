import {
  createAuthenticatedHttpClient,
  type AuthenticatedConnectionConfig,
} from "@/modules/auth/api/authenticated-http-client";
import { mapTextTranslationResult } from "@/modules/translations/model/text-translation-result-mapper";
import type { TextTranslationResponse } from "@/modules/translations/model/text-translation-response";

export type FetchTextTranslationParams = {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
};

export async function fetchTextTranslation(
  params: FetchTextTranslationParams,
  settings: AuthenticatedConnectionConfig,
) {
  const client = createAuthenticatedHttpClient(settings);
  const { data } = await client.post<TextTranslationResponse>("/api/v1/text-translations", params);
  return mapTextTranslationResult(data);
}
