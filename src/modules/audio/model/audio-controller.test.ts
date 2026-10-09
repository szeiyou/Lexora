import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/api-error";
import { useAudioStore } from "@/modules/audio/model/audio-store";
import { createAudioController } from "./audio-controller";

describe("audio-controller", () => {
  beforeEach(() => {
    useAudioStore.setState({
      activeAudioKey: null,
      status: "idle",
      sessionId: 0,
    });
  });

  it("keeps polling when the backend reports audio is still generating", async () => {
    vi.useFakeTimers();
    const fetchAudio = vi
      .fn()
      .mockResolvedValueOnce({ status: 202 })
      .mockResolvedValueOnce({ status: 202 })
      .mockResolvedValueOnce({ status: 200, blob: new Blob(["audio"]) });

    const controller = createAudioController(fetchAudio);
    const playback = controller.play("/api/v1/audio/by-key/english_word%3Aheadword%3Avisible");

    await vi.runAllTimersAsync();
    await expect(playback).resolves.toMatchObject({ status: "ready" });
    expect(fetchAudio).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("stops polling when audio is missing", async () => {
    vi.useFakeTimers();
    const fetchAudio = vi.fn().mockResolvedValueOnce({ status: 404 });
    const controller = createAudioController(fetchAudio);
    const playback = controller.play("/api/v1/audio/by-key/english_word%3Aheadword%3Amissing");

    await vi.runAllTimersAsync();
    await expect(playback).resolves.toMatchObject({ status: "missing" });
    expect(fetchAudio).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("returns timeout when audio does not become ready in time", async () => {
    vi.useFakeTimers();
    const fetchAudio = vi.fn().mockResolvedValue({ status: 202 });
    const controller = createAudioController(fetchAudio);
    const playback = controller.play("/api/v1/audio/by-key/english_word%3Aheadword%3Aslow");

    await vi.runAllTimersAsync();
    await expect(playback).resolves.toMatchObject({ status: "timeout" });
    expect(fetchAudio).toHaveBeenCalledTimes(12);
    vi.useRealTimers();
  });

  it("returns timeout immediately after the last allowed generating response", async () => {
    vi.useFakeTimers();
    const fetchAudio = vi.fn().mockResolvedValue({ status: 202 });
    const controller = createAudioController(fetchAudio);
    const playback = controller.play("/api/v1/audio/by-key/english_word%3Aheadword%3Aslow");

    let settled = false;
    void playback.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(11 * 1500);

    expect(settled).toBe(true);
    vi.useRealTimers();
  });

  it("maps request-level timeouts to the timeout state", async () => {
    const fetchAudio = vi
      .fn()
      .mockRejectedValue(new ApiError("timeout", { code: "ECONNABORTED" }));
    const controller = createAudioController(fetchAudio);

    await expect(
      controller.play("/api/v1/audio/by-key/english_word%3Aheadword%3Atimeout"),
    ).resolves.toMatchObject({ status: "timeout" });
    expect(useAudioStore.getState().status).toBe("timeout");
  });

  it("ignores stale controller updates after playback state is cleared", async () => {
    vi.useFakeTimers();
    const fetchAudio = vi
      .fn()
      .mockResolvedValueOnce({ status: 202 })
      .mockResolvedValue({ status: 202 });
    const controller = createAudioController(fetchAudio);
    const playback = controller.play("/api/v1/audio/by-key/english_word%3Aheadword%3Astale");

    await vi.advanceTimersByTimeAsync(1);
    useAudioStore.getState().clearPlaybackState();
    await vi.runAllTimersAsync();
    await playback;

    expect(useAudioStore.getState()).toMatchObject({
      activeAudioKey: null,
      status: "idle",
    });
    vi.useRealTimers();
  });
});
