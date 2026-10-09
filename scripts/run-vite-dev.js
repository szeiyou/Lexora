import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getViteCliArgs, resolveCliDevServerOptions } from "./dev-server-config.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const viteEntrypoint = resolve(rootDir, "node_modules", "vite", "bin", "vite.js");
const options = resolveCliDevServerOptions();

const child = spawn(process.execPath, [viteEntrypoint, ...getViteCliArgs(options), ...options.passthroughArgs], {
  cwd: rootDir,
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
