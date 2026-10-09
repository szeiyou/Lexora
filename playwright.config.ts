import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "playwright/test";
import {
  getDevServerUrl,
  getPlaywrightDevServerOptions,
  getViteE2eCommand,
} from "./scripts/dev-server-config.js";

const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url));
const devServer = getPlaywrightDevServerOptions();
const devServerUrl = getDevServerUrl(devServer);

function shouldReuseExistingServer(env = process.env) {
  return env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1" || env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "true";
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  globalSetup: "./tests/e2e/global-setup.ts",
  outputDir: "/tmp/codict-playwright-results",
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: devServerUrl,
    channel: "chrome",
    trace: "on-first-retry",
  },
  webServer: {
    command: getViteE2eCommand(devServer),
    cwd: PROJECT_ROOT,
    url: devServerUrl,
    reuseExistingServer: shouldReuseExistingServer(),
  },
});
