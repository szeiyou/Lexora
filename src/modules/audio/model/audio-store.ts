import { create } from "zustand";

export type AudioPlaybackStatus =
  | "idle"
  | "loading"
  | "generating"
  | "ready"
  | "playing"
  | "missing"
  | "timeout"
  | "error";

type AudioStore = {
  activeAudioKey: string | null;
  status: AudioPlaybackStatus;
  sessionId: number;
  beginPlayback: (audioKey: string) => number;
  setPlaybackState: (
    audioKey: string,
    status: AudioPlaybackStatus,
    sessionId?: number,
  ) => void;
  clearPlaybackState: (audioKey?: string, sessionId?: number) => void;
};

export const useAudioStore = create<AudioStore>((set, get) => ({
  activeAudioKey: null,
  status: "idle",
  sessionId: 0,
  beginPlayback: (audioKey) => {
    const nextSessionId = get().sessionId + 1;
    set({
      activeAudioKey: audioKey,
      status: "loading",
      sessionId: nextSessionId,
    });
    return nextSessionId;
  },
  setPlaybackState: (audioKey, status, sessionId) => {
    set((state) => {
      if (
        sessionId !== undefined &&
        (state.sessionId !== sessionId || state.activeAudioKey !== audioKey)
      ) {
        return state;
      }

      if (
        sessionId === undefined &&
        state.activeAudioKey !== null &&
        state.activeAudioKey !== audioKey
      ) {
        return state;
      }

      return {
        activeAudioKey: audioKey,
        status,
      };
    });
  },
  clearPlaybackState: (audioKey, sessionId) => {
    set((state) => {
      if (audioKey && state.activeAudioKey !== audioKey) {
        return state;
      }

      if (sessionId !== undefined && state.sessionId !== sessionId) {
        return state;
      }

      return {
        activeAudioKey: null,
        status: "idle",
        sessionId: state.sessionId + 1,
      };
    });
  },
}));
