import { ApiError } from "@/shared/api/api-error";

const REQUEST_TIMEOUT_CODES = new Set(["ECONNABORTED", "ETIMEDOUT"]);
const REQUEST_TIMEOUT_PATTERN = /\btimeout\b|\btimed out\b|signal timed out|\babort(?:ed)?\b/i;

function matchesTimeoutPattern(value: unknown) {
  return typeof value === "string" && REQUEST_TIMEOUT_PATTERN.test(value);
}

export function isRequestTimeoutError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code && REQUEST_TIMEOUT_CODES.has(error.code)) {
      return true;
    }

    return (
      matchesTimeoutPattern(error.message) ||
      matchesTimeoutPattern(error.details)
    );
  }

  if (error instanceof DOMException) {
    return error.name === "AbortError" || error.name === "TimeoutError";
  }

  if (error instanceof Error) {
    return matchesTimeoutPattern(error.name) || matchesTimeoutPattern(error.message);
  }

  return false;
}
