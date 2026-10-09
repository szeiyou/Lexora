import { invoke, isTauri } from "@tauri-apps/api/core";
import type { EntryResultType } from "@/modules/query/model/entry-response";
import {
  getHttpDiagnosticsSnapshot,
  toHttpDiagnosticErrorMetadata,
} from "@/shared/api/http-diagnostics";

export type EntryQueryFailureLogInput = {
  query: {
    requestId: number;
    q: string;
    type?: EntryResultType;
  };
  baseUrl: string;
  requestTimeoutMs: number;
  error: unknown;
};

export type EntryQueryFailureLogRecord = {
  loggedAt: string;
  query: {
    requestId: number;
    text: string;
    type?: EntryResultType;
  };
  configuredBaseUrl: string;
  requestTimeoutMs: number;
  error: ReturnType<typeof toHttpDiagnosticErrorMetadata>;
  diagnostics: ReturnType<typeof getHttpDiagnosticsSnapshot>;
};

function createEntryQueryFailureLogRecord(
  input: EntryQueryFailureLogInput,
): EntryQueryFailureLogRecord {
  return {
    loggedAt: new Date().toISOString(),
    query: {
      requestId: input.query.requestId,
      text: input.query.q,
      type: input.query.type,
    },
    configuredBaseUrl: input.baseUrl,
    requestTimeoutMs: input.requestTimeoutMs,
    error: toHttpDiagnosticErrorMetadata(input.error),
    diagnostics: getHttpDiagnosticsSnapshot(),
  };
}

export async function recordEntryQueryFailure(input: EntryQueryFailureLogInput) {
  if (!isTauri()) {
    return;
  }

  const payload = createEntryQueryFailureLogRecord(input);

  try {
    await invoke<string>("append_query_failure_log", { payload });
  } catch (error) {
    console.error("[CoDict][QueryFailureLog] failed to append query failure log", error);
  }
}

export { createEntryQueryFailureLogRecord };
