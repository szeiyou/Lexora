import { test, expect, type Page } from "playwright/test";
import { englishWordResponse } from "../../src/modules/query/model/__fixtures__/entry-responses";

const API_ORIGIN = "http://127.0.0.1:8080";
const API_PROXY_PATH = `/__api_proxy__/${encodeURIComponent(API_ORIGIN)}`;
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};

function toBasicAuth(username: string, password: string) {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  return `Basic ${bytesToBase64(bytes)}`;
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

async function mockApi(page: Page, options: { allowAuth?: string } = {}) {
  await page.route(`**${API_PROXY_PATH}/api/v1/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.slice(API_PROXY_PATH.length) || "/";

    if (pathname === "/api/v1/history" && request.method() === "GET") {
      const auth = request.headers()["authorization"];
      if (options.allowAuth && auth !== options.allowAuth) {
        await route.fulfill(fulfillJson({ message: "unauthorized" }, 401));
        return;
      }

      await route.fulfill(fulfillJson({ content: [] }));
      return;
    }

    if (pathname === "/api/v1/entries" && request.method() === "GET") {
      await route.fulfill(fulfillJson(englishWordResponse));
      return;
    }

    await route.fulfill(
      fulfillJson({ message: `Unhandled route: ${request.method()} ${pathname}` }, 404),
    );
  });
}

test("saves settings and runs a successful query", async ({ page }) => {
  await mockApi(page, {
    allowAuth: toBasicAuth("tester", "secret-123"),
  });

  await page.goto("/", { waitUntil: "commit" });
  await page.getByRole("link", { name: "设置" }).click();
  await page.getByLabel("服务地址").fill("http://127.0.0.1:8080");
  await page.getByLabel("用户名").fill("tester");
  await page.getByLabel("密码").fill("secret-123");
  await page.getByRole("button", { name: "测试连接" }).click();
  await expect(page.getByRole("status")).toContainText("连接成功");
  await page.reload();
  await expect(page.getByLabel("服务地址")).toHaveValue("http://127.0.0.1:8080");
  await expect(page.getByLabel("用户名")).toHaveValue("tester");

  await page.getByRole("link", { name: "查词" }).click();
  await page.getByLabel("输入内容").fill("phenomenon");
  await page.getByRole("button", { name: "查看结果" }).click();
  await expect(page.getByText("The northern lights are a natural phenomenon.")).toBeVisible();
});

test("shows an actionable error for bad credentials", async ({ page }) => {
  await mockApi(page, {
    allowAuth: toBasicAuth("tester", "secret-123"),
  });

  await page.goto("/", { waitUntil: "commit" });
  await page.getByRole("link", { name: "设置" }).click();
  await page.getByLabel("服务地址").fill("http://127.0.0.1:8080");
  await page.getByLabel("用户名").fill("tester");
  await page.getByLabel("密码").fill("wrong-password");
  await page.getByRole("button", { name: "测试连接" }).click();
  await expect(page.getByText("认证失败，请检查用户名和密码")).toBeVisible();
});
