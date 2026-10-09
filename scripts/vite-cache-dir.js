import { tmpdir } from "node:os";
import { join } from "node:path";

export const VITE_CACHE_DIR = join(tmpdir(), "codict-vite-cache", "node_modules", ".vite");
