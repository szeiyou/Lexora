import { Volume2 } from "lucide-react";
import { useEffect } from "react";
import type { AudioDescriptor } from "@/modules/query/model/entry-response";
import { createAudioController } from "@/modules/audio/model/audio-controller";
import { useAudioStore } from "@/modules/audio/model/audio-store";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

const audioController = createAudioController();

type ActivePlayback = {
  audioKey: string;
  stop: () => void;
};

let activePlayback: ActivePlayback | null = null;

function stopActivePlayback(audioKey?: string) {
  if (!activePlayback) {
    return;
  }

  if (audioKey && activePlayback.audioKey !== audioKey) {
    return;
  }

  activePlayback.stop();
  activePlayback = null;
}

function setActivePlayback(audioKey: string, stop: () => void) {
  stopActivePlayback();
  activePlayback = { audioKey, stop };
}

type AudioButtonProps = {
  audio?: AudioDescriptor;
  label?: string;
  allowManualStop?: boolean;
};

function toButtonLabel(
  status: ReturnType<typeof useAudioStore.getState>["status"],
  fallbackLabel: string,
  allowManualStop: boolean,
) {
  if (status === "loading" || status === "generating") {
    return "生成中...";
  }
  if (status === "playing") {
    if (allowManualStop) {
      return "停止朗读";
    }

    return "播放中...";
  }
  if (status === "missing") {
    return "无音频";
  }
  if (status === "timeout") {
    return "已超时";
  }
  if (status === "error") {
    return "重试播放";
  }
  return fallbackLabel;
}

export function AudioButton({
  audio,
  label = "播放发音",
  allowManualStop = false,
}: AudioButtonProps) {
  const activeAudioKey = useAudioStore((state) => state.activeAudioKey);
  const status = useAudioStore((state) => state.status);
  const setPlaybackState = useAudioStore((state) => state.setPlaybackState);
  const clearPlaybackState = useAudioStore((state) => state.clearPlaybackState);
  const audioKey = audio?.audioKey ?? null;

  const isCurrentAudio = audioKey !== null && activeAudioKey === audioKey;
  const effectiveStatus = isCurrentAudio ? status : "idle";
  const isManualStopState = allowManualStop && isCurrentAudio && status === "playing";
  const buttonLabel = audio ? toButtonLabel(effectiveStatus, label, isManualStopState) : "无音频";
  const isBusy =
    status === "loading" || status === "generating" || status === "playing";
  const isUnavailable = effectiveStatus === "missing";
  const isDisabled = !audio || isUnavailable || (isBusy && !isManualStopState);

  useEffect(() => {
    if (!audioKey) {
      return undefined;
    }

    return () => {
      stopActivePlayback(audioKey);
      clearPlaybackState(audioKey);
    };
  }, [audioKey, clearPlaybackState]);

  const handlePlay = async () => {
    if (!audio) {
      return;
    }

    if (isManualStopState) {
      stopActivePlayback(audio.audioKey);
      clearPlaybackState(audio.audioKey);
      return;
    }

    if (isBusy) {
      return;
    }

    stopActivePlayback();
    const playback = await audioController.play(audio.audioUrl, audio.audioKey);
    if (playback.status !== "ready") {
      return;
    }

    const objectUrl = URL.createObjectURL(playback.blob);
    const audioElement = new Audio(objectUrl);

    setPlaybackState(audio.audioKey, "playing", playback.sessionId);

    let isReleased = false;
    const releasePlaybackResources = () => {
      if (isReleased) {
        return;
      }

      isReleased = true;
      audioElement.removeEventListener("ended", release);
      audioElement.removeEventListener("error", release);
      URL.revokeObjectURL(objectUrl);

      if (activePlayback?.audioKey === audio.audioKey) {
        activePlayback = null;
      }
    };

    const stopPlayback = () => {
      audioElement.pause();
      releasePlaybackResources();
    };

    const release = () => {
      releasePlaybackResources();
      clearPlaybackState(audio.audioKey, playback.sessionId);
    };

    setActivePlayback(audio.audioKey, stopPlayback);
    audioElement.addEventListener("ended", release, { once: true });
    audioElement.addEventListener("error", release, { once: true });

    try {
      await audioElement.play();
    } catch {
      stopPlayback();
      setPlaybackState(audio.audioKey, "error", playback.sessionId);
    }
  };

  return (
    <Button
      onClick={() => void handlePlay()}
      disabled={isDisabled}
      aria-label={buttonLabel}
      data-audio-state={isManualStopState ? "manual-stop" : effectiveStatus}
      variant="secondary"
      size="sm"
      className={cn(
        "rounded-full border border-white/5 bg-white/5",
        isManualStopState &&
          "border-red-300/30 bg-[linear-gradient(135deg,rgba(248,113,113,0.18),rgba(251,146,60,0.08))] text-red-50 shadow-[0_10px_30px_-18px_rgba(248,113,113,0.7)] hover:bg-[linear-gradient(135deg,rgba(248,113,113,0.24),rgba(251,146,60,0.12))]",
      )}
    >
      {isManualStopState ? (
        <span
          aria-hidden="true"
          className="size-3 rounded-[4px] bg-[rgb(248_113_113)] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
        />
      ) : (
        <Volume2 className="size-4" aria-hidden="true" />
      )}
      {buttonLabel}
    </Button>
  );
}
