import { ApiError } from "@/shared/api/api-error";

export type HttpRuntimeDiagnostics = {
  isDev: boolean;
  isBrowserRuntime: boolean;
  isTauriRuntime: boolean;
};

export type HttpTransport = "browser-http" | "tauri-http";

export type HttpDiagnosticPhase =
  | "client.created"
  | "request.started"
  | "response.received"
  | "request.failed";

export type HttpDiagnosticEntry = {
  timestamp: string;
  phase: HttpDiagnosticPhase;
  transport: HttpTransport;
  isDev: boolean;
  isBrowserRuntime: boolean;
  isTauriRuntime: boolean;
  configuredBaseUrl?: string;
  resolvedBaseUrl?: string;
  requestPath?: string;
  method?: string;
  requestTimeoutMs?: number;
  status?: number;
  statusText?: string;
  code?: string;
  message?: string;
  details?: string;
};

const MAX_HTTP_DIAGNOSTICS = 20;

let httpDiagnostics: HttpDiagnosticEntry[] = [];

function pushHttpDiagnostic(entry: HttpDiagnosticEntry) {
  httpDiagnostics = [...httpDiagnostics, entry].slice(-MAX_HTTP_DIAGNOSTICS);
}

function stringifyDetails(details: unknown) {
  if (details === undefined) {
    return undefined;
  }

  if (typeof details === "string") {
    return details;
  }

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export function recordHttpDiagnostic(
  entry: Omit<HttpDiagnosticEntry, "timestamp">,
) {
  const stampedEntry: HttpDiagnosticEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  pushHttpDiagnostic(stampedEntry);

  const line = formatHttpDiagnosticEntry(stampedEntry);
  if (entry.phase === "request.failed") {
    console.error(`[CoDict][HTTP] ${line}`);
    return;
  }

  console.info(`[CoDict][HTTP] ${line}`);
}

export function clearHttpDiagnostics() {
  httpDiagnostics = [];
}

export function getHttpDiagnosticsSnapshot() {
  return [...httpDiagnostics];
}

export function formatHttpDiagnosticEntry(entry: HttpDiagnosticEntry) {
  const parts = [
    `time=${entry.timestamp}`,
    `phase=${entry.phase}`,
    `transport=${entry.transport}`,
    `runtime=${entry.isTauriRuntime ? "tauri" : entry.isBrowserRuntime ? "browser" : "non-browser"}`,
    `dev=${entry.isDev}`,
    entry.method ? `method=${entry.method}` : undefined,
    entry.configuredBaseUrl ? `configuredBaseUrl=${entry.configuredBaseUrl}` : undefined,
    entry.resolvedBaseUrl ? `resolvedBaseUrl=${entry.resolvedBaseUrl}` : undefined,
    entry.requestPath ? `requestPath=${entry.requestPath}` : undefined,
    entry.requestTimeoutMs !== undefined ? `timeoutMs=${entry.requestTimeoutMs}` : undefined,
    entry.status !== undefined ? `status=${entry.status}` : undefined,
    entry.statusText ? `statusText=${entry.statusText}` : undefined,
    entry.code ? `code=${entry.code}` : undefined,
    entry.message ? `message=${entry.message}` : undefined,
    entry.details ? `details=${entry.details}` : undefined,
  ];

  return parts.filter((part) => part !== undefined).join(" | ");
}

export function formatHttpDiagnostics(entries: HttpDiagnosticEntry[]) {
  return entries.map(formatHttpDiagnosticEntry).join("\n");
}

export function toHttpDiagnosticErrorMetadata(error: unknown) {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      details: stringifyDetails(error.details),
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}
