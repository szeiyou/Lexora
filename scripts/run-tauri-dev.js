import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getDevServerUrl, getViteDevCommand, resolveCliDevServerOptions } from "./dev-server-config.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tauriEntrypoint = resolve(rootDir, "node_modules", "@tauri-apps", "cli", "tauri.js");
const options = resolveCliDevServerOptions();
const configOverride = JSON.stringify({
  build: {
    beforeDevCommand: getViteDevCommand(options),
    devUrl: getDevServerUrl(options),
  },
});

const child = spawn(
  process.execPath,
  [tauriEntrypoint, "dev", "--config", configOverride, ...options.passthroughArgs],
  {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  },
);

child.on("error", (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
