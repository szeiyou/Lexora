import { beforeEach, expect, it, vi } from "vitest";

const tauriCoreMocks = vi.hoisted(() => ({
  isTauri: vi.fn(),
}));

const storeMocks = vi.hoisted(() => {
  const store = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    save: vi.fn(),
  };

  return {
    load: vi.fn(),
    store,
  };
});

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: tauriCoreMocks.isTauri,
}));

vi.mock("@tauri-apps/plugin-store", () => ({
  Store: {
    load: storeMocks.load,
  },
}));

import {
  clearPersistedAuthSession,
  loadPersistedAuthSession,
  savePersistedAuthSession,
} from "./auth-session-repository";

const WEB_STORAGE_KEY = "codict.auth";

beforeEach(() => {
  localStorage.clear();
  tauriCoreMocks.isTauri.mockReset();
  tauriCoreMocks.isTauri.mockReturnValue(false);
  storeMocks.load.mockReset();
  storeMocks.load.mockResolvedValue(storeMocks.store);
  storeMocks.store.get.mockReset();
  storeMocks.store.set.mockReset();
  storeMocks.store.delete.mockReset();
  storeMocks.store.save.mockReset();
  storeMocks.store.set.mockResolvedValue(undefined);
  storeMocks.store.delete.mockResolvedValue(true);
  storeMocks.store.save.mockResolvedValue(undefined);
});

it("round-trips the persisted refresh token and user", async () => {
  await savePersistedAuthSession({
    refreshToken: "refresh-token-1",
    user: {
      id: 7,
      username: "alice",
    },
  });

  await expect(loadPersistedAuthSession()).resolves.toEqual({
    refreshToken: "refresh-token-1",
    user: {
      id: 7,
      username: "alice",
    },
  });
});

it("clears the persisted auth session", async () => {
  localStorage.setItem(
    WEB_STORAGE_KEY,
    JSON.stringify({
      refreshToken: "refresh-token-2",
      user: { id: 8, username: "bob" },
    }),
  );

  await clearPersistedAuthSession();

  expect(localStorage.getItem(WEB_STORAGE_KEY)).toBeNull();
  await expect(loadPersistedAuthSession()).resolves.toBeNull();
});

it("ignores malformed auth payloads", async () => {
  localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify({ refreshToken: 123 }));

  await expect(loadPersistedAuthSession()).resolves.toBeNull();
});

it("loads the persisted auth session from the Tauri store", async () => {
  tauriCoreMocks.isTauri.mockReturnValue(true);
  storeMocks.store.get.mockResolvedValue({
    refreshToken: "refresh-token-3",
    user: { id: 9, username: "carol" },
  });

  await expect(loadPersistedAuthSession()).resolves.toEqual({
    refreshToken: "refresh-token-3",
    user: { id: 9, username: "carol" },
  });

  expect(storeMocks.load).toHaveBeenCalledWith("codict.auth.json");
  expect(storeMocks.store.get).toHaveBeenCalledWith("auth");
});

it("saves the persisted auth session to the Tauri store", async () => {
  tauriCoreMocks.isTauri.mockReturnValue(true);

  await savePersistedAuthSession({
    refreshToken: "refresh-token-4",
    user: { id: 10, username: "dora" },
  });

  expect(storeMocks.load).toHaveBeenCalledWith("codict.auth.json");
  expect(storeMocks.store.set).toHaveBeenCalledWith("auth", {
    refreshToken: "refresh-token-4",
    user: { id: 10, username: "dora" },
  });
  expect(storeMocks.store.save).toHaveBeenCalledTimes(1);
});

it("clears the persisted auth session from the Tauri store", async () => {
  tauriCoreMocks.isTauri.mockReturnValue(true);

  await clearPersistedAuthSession();

  expect(storeMocks.load).toHaveBeenCalledWith("codict.auth.json");
  expect(storeMocks.store.delete).toHaveBeenCalledWith("auth");
  expect(storeMocks.store.save).toHaveBeenCalledTimes(1);
});
