import { chromium, type FullConfig } from "playwright/test";

const WARMUP_TIMEOUT_MS = 240_000;

function getBaseUrl(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;

  if (typeof baseURL !== "string" || !baseURL.trim()) {
    throw new Error("Playwright baseURL must be configured for e2e warmup.");
  }

  return baseURL;
}

export default async function globalSetup(config: FullConfig) {
  const projectUse = config.projects[0]?.use;
  const channel = typeof projectUse?.channel === "string" ? projectUse.channel : "chrome";
  const browser = await chromium.launch({ channel, headless: true });
  const page = await browser.newPage();

  page.setDefaultTimeout(WARMUP_TIMEOUT_MS);

  try {
    await page.goto(getBaseUrl(config), {
      waitUntil: "commit",
      timeout: WARMUP_TIMEOUT_MS,
    });
    await page.getByRole("link", { name: "查词" }).waitFor({
      state: "visible",
      timeout: WARMUP_TIMEOUT_MS,
    });
  } finally {
    await browser.close();
  }
}
