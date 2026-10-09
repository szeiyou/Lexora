export type CloseBehavior = "ask" | "tray" | "exit";
export type RememberedCloseBehavior = Exclude<CloseBehavior, "ask">;

export function resolveCloseBehavior(value: string | null | undefined): CloseBehavior {
  if (value === "tray" || value === "exit") {
    return value;
  }

  return "ask";
}
