import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AudioButton } from "@/modules/audio/ui/audio-button";
import { useAudioStore } from "@/modules/audio/model/audio-store";

const audioApiMocks = vi.hoisted(() => ({
  fetchAudio: vi.fn(),
}));

vi.mock("@/modules/audio/api/fetch-audio", () => ({
  fetchAudio: audioApiMocks.fetchAudio,
}));

type MockAudioInstance = {
  src: string;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

const mockAudioInstances: MockAudioInstance[] = [];

class MockAudio {
  src: string;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();

  constructor(src = "") {
    this.src = src;
    mockAudioInstances.push(this);
  }
}

beforeEach(() => {
  useAudioStore.setState({
    activeAudioKey: null,
    status: "idle",
    sessionId: 0,
  });
  audioApiMocks.fetchAudio.mockResolvedValue({
    status: 200,
    blob: new Blob(["audio"]),
  });
  mockAudioInstances.length = 0;
  vi.stubGlobal("Audio", MockAudio as unknown as typeof Audio);
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:mock-audio"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("disables other audio buttons while one clip is playing", () => {
  useAudioStore.setState({
    activeAudioKey: "english_word:headword:phenomenon",
    status: "playing",
    sessionId: 1,
  });

  render(
    <>
      <AudioButton
        audio={{
          audioKey: "english_word:headword:phenomenon",
          audioUrl: "/api/v1/audio/by-key/english_word%3Aheadword%3Aphenomenon",
        }}
        label="词头发音"
      />
      <AudioButton
        audio={{
          audioKey: "english_word:full_reading:phenomenon",
          audioUrl: "/api/v1/audio/by-key/english_word%3Afull_reading%3Aphenomenon",
        }}
        label="完整朗读"
      />
    </>,
  );

  expect(screen.getByRole("button", { name: "播放中..." })).toBeDisabled();
  expect(screen.getByRole("button", { name: "完整朗读" })).toBeDisabled();
});

it("clears active playback state when the owning button unmounts", () => {
  useAudioStore.setState({
    activeAudioKey: "english_word:headword:visible",
    status: "generating",
    sessionId: 3,
  });

  const { unmount } = render(
    <AudioButton
      audio={{
        audioKey: "english_word:headword:visible",
        audioUrl: "/api/v1/audio/by-key/english_word%3Aheadword%3Avisible",
      }}
      label="词头发音"
    />,
  );

  unmount();

  expect(useAudioStore.getState()).toMatchObject({
    activeAudioKey: null,
    status: "idle",
  });
  expect(useAudioStore.getState().sessionId).toBe(4);
});

it("stops active playback when the owning button unmounts after playback starts", async () => {
  const user = userEvent.setup();
  const { unmount } = render(
    <AudioButton
      audio={{
        audioKey: "english_word:full_reading:visible",
        audioUrl: "/api/v1/audio/by-key/english_word%3Afull_reading%3Avisible",
      }}
      label="完整朗读"
    />,
  );

  await user.click(screen.getByRole("button", { name: "完整朗读" }));

  await waitFor(() => {
    expect(useAudioStore.getState()).toMatchObject({
      activeAudioKey: "english_word:full_reading:visible",
      status: "playing",
    });
  });

  expect(mockAudioInstances).toHaveLength(1);

  unmount();

  expect(mockAudioInstances[0].pause).toHaveBeenCalledTimes(1);
});

it("stops active playback when the button switches to another audio key", async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <AudioButton
      audio={{
        audioKey: "english_word:full_reading:first",
        audioUrl: "/api/v1/audio/by-key/english_word%3Afull_reading%3Afirst",
      }}
      label="完整朗读"
    />,
  );

  await user.click(screen.getByRole("button", { name: "完整朗读" }));

  await waitFor(() => {
    expect(useAudioStore.getState()).toMatchObject({
      activeAudioKey: "english_word:full_reading:first",
      status: "playing",
    });
  });

  expect(mockAudioInstances).toHaveLength(1);

  rerender(
    <AudioButton
      audio={{
        audioKey: "english_word:full_reading:second",
        audioUrl: "/api/v1/audio/by-key/english_word%3Afull_reading%3Asecond",
      }}
      label="完整朗读"
    />,
  );

  expect(mockAudioInstances[0].pause).toHaveBeenCalledTimes(1);
});

it("keeps full-reading playback clickable so a second click stops it", async () => {
  const user = userEvent.setup();

  render(
    <AudioButton
      audio={{
        audioKey: "english_word:full_reading:visible",
        audioUrl: "/api/v1/audio/by-key/english_word%3Afull_reading%3Avisible",
      }}
      label="完整朗读"
      allowManualStop
    />,
  );

  await user.click(screen.getByRole("button", { name: "完整朗读" }));

  const stopButton = await screen.findByRole("button", { name: "停止朗读" });
  expect(stopButton).toBeEnabled();
  expect(stopButton).toHaveAttribute("data-audio-state", "manual-stop");
  expect(stopButton.className).toContain("border-red-300/30");

  await user.click(stopButton);

  expect(mockAudioInstances[0].pause).toHaveBeenCalledTimes(1);
  expect(useAudioStore.getState()).toMatchObject({
    activeAudioKey: null,
    status: "idle",
  });
});
