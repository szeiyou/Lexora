import { afterEach, describe, expect, it, vi } from "vitest";

const REPO_ROOT = process.cwd();
const CONFIG_MODULE_PATH = `${REPO_ROOT}/playwright.config.ts`;

function restoreEnvironment(snapshot: NodeJS.ProcessEnv) {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, snapshot);
}

async function loadPlaywrightConfig(env: Record<string, string | undefined> = {}) {
  const snapshot = { ...process.env };
  vi.resetModules();
  vi.doMock("playwright/test", () => ({
    defineConfig: <T>(config: T) => config,
  }));

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  try {
    const imported = await import(CONFIG_MODULE_PATH);
    return imported.default;
  } finally {
    restoreEnvironment(snapshot);
  }
}

afterEach(() => {
  vi.doUnmock("playwright/test");
  vi.resetModules();
});

describe("playwright.config", () => {
  it("uses the real repository root as the web server cwd", async () => {
    const config = await loadPlaywrightConfig();

    expect(config.webServer).toMatchObject({
      cwd: REPO_ROOT,
    });
  });

  it("does not reuse an existing dev server unless explicitly enabled", async () => {
    const defaultConfig = await loadPlaywrightConfig({
      PLAYWRIGHT_REUSE_EXISTING_SERVER: undefined,
    });
    const optInConfig = await loadPlaywrightConfig({
      PLAYWRIGHT_REUSE_EXISTING_SERVER: "1",
    });

    expect(defaultConfig.webServer).toMatchObject({
      reuseExistingServer: false,
    });
    expect(optInConfig.webServer).toMatchObject({
      reuseExistingServer: true,
    });
  });

  it("uses the app root as the browser base URL and starts the dedicated e2e dev server wrapper", async () => {
    const config = await loadPlaywrightConfig();

    expect(config.use).toMatchObject({
      baseURL: "http://127.0.0.1:4173",
    });
    expect(config.webServer).toMatchObject({
      command: "node ./scripts/run-vite-e2e.js --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
    });
  });

  it("warms the Vite-served app before running browser tests", async () => {
    const config = await loadPlaywrightConfig();

    expect(config).toMatchObject({
      globalSetup: "./tests/e2e/global-setup.ts",
    });
  });
});
