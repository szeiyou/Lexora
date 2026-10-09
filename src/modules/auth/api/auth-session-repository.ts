import { isTauri } from "@tauri-apps/api/core";
import { z } from "zod";
import type { PersistedAuthSession } from "../model/auth.types";

const STORE_FILE = "codict.auth.json";
const STORE_KEY = "auth";
const WEB_STORAGE_KEY = "codict.auth";

const authUserSchema = z.object({
  id: z.number().int(),
  username: z.string().min(1),
});

const persistedAuthSessionSchema = z.object({
  refreshToken: z.string().min(1),
  user: authUserSchema,
});

function isTauriRuntime() {
  return isTauri();
}

function parsePersistedAuthSession(value: unknown): PersistedAuthSession | null {
  const parsed = persistedAuthSessionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

async function readFromTauriStore(): Promise<PersistedAuthSession | null> {
  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(STORE_FILE);
  const value = await store.get(STORE_KEY);
  return parsePersistedAuthSession(value);
}

async function writeToTauriStore(value: PersistedAuthSession): Promise<void> {
  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(STORE_FILE);
  await store.set(STORE_KEY, value);
  await store.save();
}

async function clearTauriStore(): Promise<void> {
  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(STORE_FILE);
  await store.delete(STORE_KEY);
  await store.save();
}

function readFromWebStorage(): PersistedAuthSession | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(WEB_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return parsePersistedAuthSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeToWebStorage(value: PersistedAuthSession) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(value));
}

function clearWebStorage() {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(WEB_STORAGE_KEY);
}

export async function loadPersistedAuthSession(): Promise<PersistedAuthSession | null> {
  try {
    return isTauriRuntime() ? await readFromTauriStore() : readFromWebStorage();
  } catch {
    return null;
  }
}

export async function savePersistedAuthSession(value: PersistedAuthSession): Promise<void> {
  if (isTauriRuntime()) {
    await writeToTauriStore(value);
    return;
  }

  writeToWebStorage(value);
}

export async function clearPersistedAuthSession(): Promise<void> {
  if (isTauriRuntime()) {
    await clearTauriStore();
    return;
  }

  clearWebStorage();
}
