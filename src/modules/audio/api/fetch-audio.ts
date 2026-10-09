import { createAuthenticatedHttpClient } from "@/modules/auth/api/authenticated-http-client";
import { useSettingsStore } from "@/modules/settings/model/settings.store";

export type FetchAudioReady = {
  status: 200;
  blob: Blob;
};

export type FetchAudioResponse = FetchAudioReady | { status: 202 } | { status: 404 };
export type FetchAudio = (audioUrl: string) => Promise<FetchAudioResponse>;

export const fetchAudio: FetchAudio = async (audioUrl) => {
  const settings = useSettingsStore.getState().values;
  const client = createAuthenticatedHttpClient(settings);
  const response = await client.get(audioUrl, {
    responseType: "blob",
    validateStatus: (status) => status === 200 || status === 202 || status === 404,
  });

  if (response.status === 200) {
    return {
      status: 200,
      blob: response.data as Blob,
    };
  }

  if (response.status === 404) {
    return { status: 404 };
  }

  return { status: 202 };
};
