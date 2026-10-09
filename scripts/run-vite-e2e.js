import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getViteCliArgs, resolveCliDevServerOptions } from "./dev-server-config.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const viteEntrypoint = resolve(rootDir, "node_modules", "vite", "bin", "vite.js");
const options = resolveCliDevServerOptions();

function run(commandArgs) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, commandArgs, {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", rejectRun);
    child.on("exit", (code) => {
      if ((code ?? 0) === 0) {
        resolveRun();
        return;
      }

      rejectRun(new Error(`vite command exited with code ${code ?? 0}`));
    });
  });
}

try {
  await run([viteEntrypoint, "optimize"]);
  await run([viteEntrypoint, ...getViteCliArgs(options), ...options.passthroughArgs]);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
