import { expect, it } from "vitest";
import { resolveCloseBehavior } from "@/modules/desktop-shell/model/close-behavior";

it("defaults to asking on first close and stores later selections", () => {
  expect(resolveCloseBehavior(undefined)).toBe("ask");
  expect(resolveCloseBehavior("tray")).toBe("tray");
  expect(resolveCloseBehavior("exit")).toBe("exit");
});
