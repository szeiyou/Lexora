import { settingsSchema, type SettingsValues } from "@/modules/settings/model/settings.schema";

const STORE_FILE = "codict.settings.json";
const STORE_KEY = "settings";
const WEB_STORAGE_KEY = "codict.settings";

function normalizeRequestTimeoutMs(requestTimeoutMs: number | undefined) {
  if (requestTimeoutMs === 30000) {
    return 60000;
  }

  return requestTimeoutMs;
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function fromPersistedSettings(value: unknown): SettingsValues | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  // Legacy payloads may include username/password; ignore them entirely.
  const parsed = settingsSchema.safeParse({
    baseUrl: typeof record.baseUrl === "string" ? record.baseUrl : undefined,
    requestTimeoutMs:
      typeof record.requestTimeoutMs === "number"
        ? normalizeRequestTimeoutMs(record.requestTimeoutMs)
        : undefined,
    closeBehavior: record.closeBehavior,
  });
  return parsed.success ? parsed.data : null;
}

async function readFromTauriStore(): Promise<unknown | null> {
  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(STORE_FILE);
  const value = await store.get<unknown>(STORE_KEY);
  return value ?? null;
}

async function writeToTauriStore(value: SettingsValues): Promise<void> {
  const { Store } = await import("@tauri-apps/plugin-store");
  const store = await Store.load(STORE_FILE);
  await store.set(STORE_KEY, value);
  await store.save();
}

function readFromWebStorage(): unknown | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(WEB_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function writeToWebStorage(value: SettingsValues) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(value));
}

export async function loadSettings(): Promise<SettingsValues | null> {
  try {
    const persisted = isTauriRuntime() ? await readFromTauriStore() : readFromWebStorage();
    if (!persisted) {
      return null;
    }

    return fromPersistedSettings(persisted);
  } catch {
    return null;
  }
}

export async function saveSettings(values: SettingsValues): Promise<void> {
  if (isTauriRuntime()) {
    await writeToTauriStore(values);
    return;
  }

  writeToWebStorage(values);
}
