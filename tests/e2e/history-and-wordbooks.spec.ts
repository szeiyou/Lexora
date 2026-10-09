import { test, expect, type Page } from "playwright/test";
import {
  englishWordResponse,
  sentenceTranslationResponse,
} from "../../src/modules/query/model/__fixtures__/entry-responses";

const API_ORIGIN = "http://127.0.0.1:8080";
const API_PROXY_PATH = `/__api_proxy__/${encodeURIComponent(API_ORIGIN)}`;
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};

function obfuscatePassword(raw: string) {
  const key = new TextEncoder().encode("CoDict:v1");
  const source = new TextEncoder().encode(raw);
  const encoded = source.map((value, index) => value ^ key[index % key.length]);
  return bytesToBase64(encoded);
}

function bytesToBase64(bytes: Uint8Array) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const chunk = (a << 16) | (b << 8) | c;

    output += alphabet[(chunk >> 18) & 63];
    output += alphabet[(chunk >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(chunk >> 6) & 63] : "=";
    output += index + 2 < bytes.length ? alphabet[chunk & 63] : "=";
  }

  return output;
}

function fulfillJson(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

async function seedSettings(page: Page) {
  await page.addInitScript((persisted) => {
    localStorage.setItem("codict.settings", JSON.stringify(persisted));
  }, {
    baseUrl: API_ORIGIN,
    username: "tester",
    password: obfuscatePassword("secret-123"),
    requestTimeoutMs: 8000,
    closeBehavior: "ask",
  });
}

async function seedAuthenticatedSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "codict.auth",
      JSON.stringify({
        refreshToken: "refresh-1",
        user: { id: 1, username: "tester" },
      }),
    );
  });
}

function fulfillAuthTokenEnvelope() {
  return fulfillJson({
    accessToken: "access-1",
    refreshToken: "refresh-2",
    expiresIn: 3600,
    user: { id: 1, username: "tester" },
  });
}

test("reopens a deduplicated history summary in the workspace", async ({ page }) => {
  await seedSettings(page);
  await seedAuthenticatedSession(page);
  await page.route(`**${API_PROXY_PATH}/api/v1/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.slice(API_PROXY_PATH.length) || "/";

    if (pathname === "/api/v1/auth/refresh" && request.method() === "POST") {
      await route.fulfill(fulfillAuthTokenEnvelope());
      return;
    }

    if (pathname === "/api/v1/auth/me" && request.method() === "GET") {
      await route.fulfill(fulfillJson({ id: 1, username: "tester" }));
      return;
    }

    if (pathname === "/api/v1/history" && request.method() === "GET") {
      if (url.searchParams.get("size") === "5") {
        await route.fulfill(
          fulfillJson({
            content: [
              {
                historyKey: "sentence::2026-03-21",
                query: "你今天怎么样？",
                resultType: "SENTENCE_TRANSLATION",
                summary: "How are you today?",
                latestSearchTime: "2026-03-21T12:00:00",
              },
            ],
          }),
        );
        return;
      }

      await route.fulfill(
        fulfillJson({
          content: [
            {
              historyKey: "sentence::2026-03-21",
              query: "你今天怎么样？",
              normalizedQuery: "你今天怎么样？",
              resultType: "SENTENCE_TRANSLATION",
              summary: "How are you today?",
              sourceApi: "ENTRIES_V1",
              latestSearchTime: "2026-03-21T12:00:00",
              searchCount: 2,
              searchTimes: ["2026-03-21T12:00:00", "2026-03-20T08:30:00"],
            },
          ],
        }),
      );
      return;
    }

    if (
      decodeURIComponent(pathname) === "/api/v1/history/sentence::2026-03-21" &&
      request.method() === "GET"
    ) {
      await route.fulfill(
        fulfillJson({
          historyKey: "sentence::2026-03-21",
          query: "你今天怎么样？",
          resultType: "SENTENCE_TRANSLATION",
          response: sentenceTranslationResponse,
        }),
      );
      return;
    }

    if (pathname === "/api/v1/entries" && request.method() === "GET") {
      await route.fulfill(fulfillJson(sentenceTranslationResponse));
      return;
    }

    await route.fulfill(
      fulfillJson({ message: `Unhandled route: ${request.method()} ${pathname}` }, 404),
    );
  });

  await page.goto("/", { waitUntil: "commit" });
  await page.getByRole("link", { name: "历史" }).click();
  await page.getByRole("button", { name: "打开历史记录 你今天怎么样？" }).click();

  await expect(page.getByRole("heading", { name: "查词" })).toBeVisible();
  await expect(page.getByLabel("输入内容")).toHaveValue("你今天怎么样？");
  await expect(page.getByText("How are you today?")).toHaveCount(2);
});

test("creates a wordbook and adds a queried word into it", async ({ page }) => {
  let wordbooks = [
    {
      id: 1,
      name: "重要单词",
      createTime: "2026-03-21T10:00:00",
    },
  ];

  await seedSettings(page);
  await seedAuthenticatedSession(page);
  await page.route(`**${API_PROXY_PATH}/api/v1/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.slice(API_PROXY_PATH.length) || "/";

    if (pathname === "/api/v1/auth/refresh" && request.method() === "POST") {
      await route.fulfill(fulfillAuthTokenEnvelope());
      return;
    }

    if (pathname === "/api/v1/auth/me" && request.method() === "GET") {
      await route.fulfill(fulfillJson({ id: 1, username: "tester" }));
      return;
    }

    if (pathname === "/api/v1/history" && request.method() === "GET") {
      await route.fulfill(fulfillJson({ content: [] }));
      return;
    }

    if (pathname === "/api/v1/wordbooks" && request.method() === "GET") {
      await route.fulfill(fulfillJson(wordbooks));
      return;
    }

    if (pathname === "/api/v1/wordbooks" && request.method() === "POST") {
      const name = url.searchParams.get("name") ?? "未命名单词本";
      const created = {
        id: 2,
        name,
        createTime: "2026-03-21T10:05:00",
      };
      wordbooks = [...wordbooks, created];
      await route.fulfill(fulfillJson(created));
      return;
    }

    if (pathname === "/api/v1/wordbooks/2/words" && request.method() === "GET") {
      await route.fulfill(fulfillJson([]));
      return;
    }

    if (pathname === "/api/v1/wordbooks/1/words" && request.method() === "GET") {
      await route.fulfill(fulfillJson([]));
      return;
    }

    if (pathname === "/api/v1/entries" && request.method() === "GET") {
      await route.fulfill(fulfillJson(englishWordResponse));
      return;
    }

    if (pathname === "/api/v1/wordbooks/2/words" && request.method() === "POST") {
      const body = request.postDataJSON();
      await route.fulfill(
        body && JSON.stringify(body) === JSON.stringify(["phenomenon"])
          ? { status: 200, headers: CORS_HEADERS, body: "" }
          : fulfillJson({ message: "unexpected word payload" }, 400),
      );
      return;
    }

    await route.fulfill(
      fulfillJson({ message: `Unhandled route: ${request.method()} ${pathname}` }, 404),
    );
  });

  await page.goto("/", { waitUntil: "commit" });
  await page.getByRole("link", { name: "单词本" }).click();
  await page.getByRole("button", { name: "新建单词本" }).click();
  await page.getByLabel("单词本名称").fill("考试词汇");
  await page.getByRole("button", { name: "保存单词本" }).click();
  await expect(page.getByRole("heading", { name: "考试词汇" })).toBeVisible();

  await page.getByRole("link", { name: "查词" }).click();
  await page.getByLabel("输入内容").fill("phenomenon");
  await page.getByRole("button", { name: "查看结果" }).click();
  await page.getByRole("button", { name: "加入单词本" }).click();
  await page.getByRole("combobox", { name: "目标单词本" }).click();
  await page.getByRole("option", { name: "考试词汇" }).click();
  await page.getByRole("button", { name: "确认加入" }).click();

  await expect(page.getByRole("status")).toContainText("已加入 考试词汇");
});

test("opens a saved wordbook word as a fresh lookup", async ({ page }) => {
  const latestWordResponse = {
    ...englishWordResponse,
    englishWord: {
      ...englishWordResponse.englishWord!,
      examples: [
        {
          sentence: "Fresh lookup detail for phenomenon is rendered.",
          translation: "phenomenon 的最新查询详情已渲染。",
        },
      ],
    },
  };

  await seedSettings(page);
  await seedAuthenticatedSession(page);
  await page.route(`**${API_PROXY_PATH}/api/v1/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.slice(API_PROXY_PATH.length) || "/";

    if (pathname === "/api/v1/auth/refresh" && request.method() === "POST") {
      await route.fulfill(fulfillAuthTokenEnvelope());
      return;
    }

    if (pathname === "/api/v1/auth/me" && request.method() === "GET") {
      await route.fulfill(fulfillJson({ id: 1, username: "tester" }));
      return;
    }

    if (pathname === "/api/v1/history" && request.method() === "GET") {
      await route.fulfill(fulfillJson({ content: [] }));
      return;
    }

    if (pathname === "/api/v1/wordbooks" && request.method() === "GET") {
      await route.fulfill(
        fulfillJson([
          {
            id: 1,
            name: "重要单词",
            createTime: "2026-03-21T10:00:00",
          },
        ]),
      );
      return;
    }

    if (pathname === "/api/v1/wordbooks/1/words" && request.method() === "GET") {
      await route.fulfill(
        fulfillJson([
          {
            word: "phenomenon",
            partOfSpeech: "n.",
            meaning: "保存在单词本里的旧释义",
            createTime: "2026-03-21T10:10:00",
          },
        ]),
      );
      return;
    }

    if (pathname === "/api/v1/entries" && request.method() === "GET") {
      expect(url.searchParams.get("q")).toBe("phenomenon");
      expect(url.searchParams.get("type")).toBe("ENGLISH_WORD");
      await route.fulfill(fulfillJson(latestWordResponse));
      return;
    }

    await route.fulfill(
      fulfillJson({ message: `Unhandled route: ${request.method()} ${pathname}` }, 404),
    );
  });

  await page.goto("/", { waitUntil: "commit" });
  await page.getByRole("link", { name: "单词本" }).click();
  await page.getByRole("button", { name: "打开单词本 重要单词" }).click();
  await page.getByRole("button", { name: "打开单词 phenomenon 的详情" }).click();

  await expect(page.getByRole("heading", { name: "查词" })).toBeVisible();
  await expect(page.getByLabel("输入内容")).toHaveValue("phenomenon");
  await expect(page.getByText("Fresh lookup detail for phenomenon is rendered.")).toBeVisible();
  await expect(page.getByText("保存在单词本里的旧释义")).not.toBeVisible();
});
