import type { JacksonTimeArray } from "@/modules/history/model/history-types";

function pad(part: number) {
  return String(part).padStart(2, "0");
}

export function formatHistoryTime(parts?: JacksonTimeArray) {
  if (!parts || parts.length < 5) {
    return "";
  }

  const [year, month, day, hour, minute, second = 0] = parts;
  if (![year, month, day, hour, minute, second].every(Number.isFinite)) {
    return "";
  }

  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}
