import { fetchAudio as defaultFetchAudio, type FetchAudio } from "@/modules/audio/api/fetch-audio";
import { useAudioStore } from "@/modules/audio/model/audio-store";
import { isRequestTimeoutError } from "@/shared/api/api-error-utils";

const POLL_MAX_ATTEMPTS = 12;
const POLL_DELAY_MS = 1500;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

type AudioPlaybackSession = {
  sessionId: number;
};

type PolledAudioResult =
  | { status: "ready"; blob: Blob }
  | { status: "missing" }
  | { status: "timeout" };

export type AudioPlaybackResult =
  | ({ status: "ready"; blob: Blob } & AudioPlaybackSession)
  | ({ status: "missing" } & AudioPlaybackSession)
  | ({ status: "timeout" } & AudioPlaybackSession)
  | ({ status: "error"; error: unknown } & AudioPlaybackSession);

export async function pollAudio(
  fetchAudio: FetchAudio,
  audioUrl: string,
  onGenerating?: () => void,
): Promise<PolledAudioResult> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
    const response = await fetchAudio(audioUrl);
    if (response.status === 200) {
      return { status: "ready", blob: response.blob };
    }
    if (response.status === 404) {
      return { status: "missing" };
    }

    if (attempt === POLL_MAX_ATTEMPTS - 1) {
      return { status: "timeout" };
    }

    onGenerating?.();
    await delay(POLL_DELAY_MS);
  }

  return { status: "timeout" };
}

export function createAudioController(fetchAudio: FetchAudio = defaultFetchAudio) {
  return {
    async play(audioUrl: string, audioKey = audioUrl): Promise<AudioPlaybackResult> {
      const { beginPlayback, setPlaybackState } = useAudioStore.getState();
      const sessionId = beginPlayback(audioKey);

      try {
        const result = await pollAudio(fetchAudio, audioUrl, () => {
          setPlaybackState(audioKey, "generating", sessionId);
        });

        if (result.status === "ready") {
          setPlaybackState(audioKey, "ready", sessionId);
          return { ...result, sessionId };
        }

        if (result.status === "missing") {
          setPlaybackState(audioKey, "missing", sessionId);
          return { ...result, sessionId };
        }

        setPlaybackState(audioKey, "timeout", sessionId);
        return { ...result, sessionId };
      } catch (error) {
        if (isRequestTimeoutError(error)) {
          setPlaybackState(audioKey, "timeout", sessionId);
          return { status: "timeout", sessionId };
        }

        setPlaybackState(audioKey, "error", sessionId);
        return { status: "error", error, sessionId };
      }
    },
  };
}
