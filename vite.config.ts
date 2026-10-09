import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

import { VITE_CACHE_DIR } from "./scripts/vite-cache-dir.js";

const DEV_API_PROXY_PREFIX = "/__api_proxy__/";

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

function toForwardHeaders(headers: IncomingHttpHeaders) {
  const forwarded: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (!value || key === "host" || key === "connection" || key === "content-length") {
      continue;
    }

    forwarded[key] = Array.isArray(value) ? value.join(", ") : value;
  }

  return forwarded;
}

function createDevApiProxyPlugin(): Plugin {
  return {
    name: "codict-dev-api-proxy",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith(DEV_API_PROXY_PREFIX)) {
          return next();
        }

        const requestedUrl = new URL(request.url, "http://127.0.0.1");
        const prefixlessPath = requestedUrl.pathname.slice(DEV_API_PROXY_PREFIX.length);
        const separatorIndex = prefixlessPath.indexOf("/");
        const encodedBaseUrl =
          separatorIndex === -1 ? prefixlessPath : prefixlessPath.slice(0, separatorIndex);
        const forwardedPath = separatorIndex === -1 ? "/" : prefixlessPath.slice(separatorIndex);

        if (!encodedBaseUrl) {
          response.statusCode = 400;
          response.end("Missing proxy target.");
          return;
        }

        try {
          const targetUrl = new URL(`${forwardedPath}${requestedUrl.search}`, decodeURIComponent(encodedBaseUrl));
          const body = await readRequestBody(request);
          const upstreamResponse = await fetch(targetUrl, {
            method: request.method,
            headers: toForwardHeaders(request.headers),
            body: body && request.method !== "GET" && request.method !== "HEAD" ? body : undefined,
            redirect: "manual",
          });

          response.statusCode = upstreamResponse.status;
          upstreamResponse.headers.forEach((value, key) => {
            const normalizedKey = key.toLowerCase();
            if (
              normalizedKey === "content-length" ||
              normalizedKey === "content-encoding" ||
              normalizedKey === "transfer-encoding" ||
              normalizedKey === "connection"
            ) {
              return;
            }

            response.setHeader(key, value);
          });
          response.end(Buffer.from(await upstreamResponse.arrayBuffer()));
        } catch (error) {
          response.statusCode = 502;
          response.setHeader("content-type", "application/json");
          response.end(
            JSON.stringify({
              message: error instanceof Error ? error.message : "Proxy request failed",
            }),
          );
        }
      });
    },
  };
}

export default defineConfig({
  cacheDir: VITE_CACHE_DIR,
  plugins: [react(), tailwindcss(), createDevApiProxyPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
