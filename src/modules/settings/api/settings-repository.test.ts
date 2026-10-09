import { expect, it } from "vitest";
import { loadSettings } from "@/modules/settings/api/settings-repository";

const WEB_STORAGE_KEY = "codict.settings";

it("ignores legacy persisted credentials while upgrading a previously maxed 30000ms timeout to 60000ms", async () => {
  localStorage.setItem(
    WEB_STORAGE_KEY,
    JSON.stringify({
      baseUrl: "http://localhost:8080",
      username: "tester",
      password: "obfuscated-or-plain-does-not-matter",
      requestTimeoutMs: 30000,
      closeBehavior: "ask",
    }),
  );

  await expect(loadSettings()).resolves.toEqual({
    baseUrl: "http://localhost:8080",
    requestTimeoutMs: 60000,
    closeBehavior: "ask",
  });
});
