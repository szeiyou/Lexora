import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/api-error";
import { clearHttpDiagnostics, recordHttpDiagnostic } from "@/shared/api/http-diagnostics";
import {
  createEntryQueryFailureLogRecord,
  recordEntryQueryFailure,
} from "@/modules/query/api/query-failure-log";

const tauriApiMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  isTauri: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: tauriApiMocks.invoke,
  isTauri: tauriApiMocks.isTauri,
}));

const failureInput = {
  query: {
    requestId: 7,
    q: "available",
    type: "ENGLISH_WORD" as const,
  },
  baseUrl: "http://127.0.0.1:8080",
  requestTimeoutMs: 60000,
  error: new ApiError("Request failed with status code 500", {
    status: 500,
    code: "ERR_BAD_RESPONSE",
    details: { message: "temporary failure" },
  }),
};

beforeEach(() => {
  clearHttpDiagnostics();
  tauriApiMocks.invoke.mockReset();
  tauriApiMocks.isTauri.mockReset();
  tauriApiMocks.isTauri.mockReturnValue(true);
});

it("creates a query failure log record with diagnostics and sanitized error metadata", () => {
  recordHttpDiagnostic({
    phase: "request.failed",
    transport: "browser-http",
    isDev: false,
    isBrowserRuntime: true,
    isTauriRuntime: false,
    configuredBaseUrl: "http://127.0.0.1:8080",
    resolvedBaseUrl: "http://127.0.0.1:8080",
    requestPath: "/api/v1/entries",
    method: "GET",
    requestTimeoutMs: 60000,
    status: 500,
    code: "ERR_BAD_RESPONSE",
    message: "Request failed with status code 500",
    details: "{\"message\":\"temporary failure\"}",
  });

  const record = createEntryQueryFailureLogRecord(failureInput);

  expect(record).toMatchObject({
    query: {
      requestId: 7,
      text: "available",
      type: "ENGLISH_WORD",
    },
    configuredBaseUrl: "http://127.0.0.1:8080",
    requestTimeoutMs: 60000,
    error: {
      status: 500,
      code: "ERR_BAD_RESPONSE",
      message: "Request failed with status code 500",
      details: "{\"message\":\"temporary failure\"}",
    },
    diagnostics: [
      expect.objectContaining({
        phase: "request.failed",
        requestPath: "/api/v1/entries",
        status: 500,
      }),
    ],
  });
  expect(record.loggedAt).toMatch(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  );
});

it("forwards the log payload to Tauri only when the desktop runtime is available", async () => {
  await recordEntryQueryFailure(failureInput);

  expect(tauriApiMocks.invoke).toHaveBeenCalledTimes(1);
  expect(tauriApiMocks.invoke).toHaveBeenCalledWith(
    "append_query_failure_log",
    {
      payload: expect.objectContaining({
        query: expect.objectContaining({
          text: "available",
        }),
        configuredBaseUrl: "http://127.0.0.1:8080",
      }),
    },
  );

  tauriApiMocks.invoke.mockClear();
  tauriApiMocks.isTauri.mockReturnValue(false);

  await recordEntryQueryFailure(failureInput);

  expect(tauriApiMocks.invoke).not.toHaveBeenCalled();
});
