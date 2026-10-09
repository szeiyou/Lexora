import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { VITE_CACHE_DIR } from "./scripts/vite-cache-dir.js";

describe("vite.config", () => {
  it("keeps Vite's shared cache outside the workspace but under node_modules for plugin exclusions", () => {
    const cacheDir = VITE_CACHE_DIR.replaceAll("\\", "/");
    const tmpRoot = tmpdir().replaceAll("\\", "/");

    expect(cacheDir.startsWith(`${tmpRoot}/`)).toBe(true);
    expect(cacheDir).toContain("/node_modules/");
    expect(cacheDir.endsWith("/.vite")).toBe(true);
  });
});
