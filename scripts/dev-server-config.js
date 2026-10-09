const DEFAULT_DEV_HOST = "127.0.0.1";
const DEFAULT_DEV_PORT = 3000;
const DEFAULT_E2E_DEV_PORT = 4173;

function parsePort(value, source) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${source} must be an integer between 1 and 65535.`);
  }

  return parsed;
}

function normalizeHost(value) {
  return value && value.trim() ? value.trim() : DEFAULT_DEV_HOST;
}

export function getBaseDevServerOptions(env = process.env) {
  return {
    host: normalizeHost(env.CODICT_DEV_HOST),
    port: env.CODICT_DEV_PORT ? parsePort(env.CODICT_DEV_PORT, "CODICT_DEV_PORT") : DEFAULT_DEV_PORT,
  };
}

export function getPlaywrightDevServerOptions(env = process.env) {
  return {
    host: normalizeHost(env.CODICT_E2E_HOST ?? env.CODICT_DEV_HOST),
    port: env.CODICT_E2E_PORT ? parsePort(env.CODICT_E2E_PORT, "CODICT_E2E_PORT") : DEFAULT_E2E_DEV_PORT,
  };
}

export function resolveCliDevServerOptions(argv = process.argv.slice(2), env = process.env) {
  const base = getBaseDevServerOptions(env);
  const passthroughArgs = [];
  let host = base.host;
  let port = base.port;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--host") {
      index += 1;
      host = normalizeHost(argv[index]);
      continue;
    }

    if (argument?.startsWith("--host=")) {
      host = normalizeHost(argument.slice("--host=".length));
      continue;
    }

    if (argument === "--port") {
      index += 1;
      port = parsePort(argv[index], "--port");
      continue;
    }

    if (argument?.startsWith("--port=")) {
      port = parsePort(argument.slice("--port=".length), "--port");
      continue;
    }

    passthroughArgs.push(argument);
  }

  return { host, port, passthroughArgs };
}

export function getDevServerUrl({ host, port }) {
  return `http://${host}:${port}`;
}

export function getViteCliArgs({ host, port }) {
  return ["--host", host, "--port", String(port)];
}

export function getViteDevCommand({ host, port }) {
  return `node ./scripts/run-vite-dev.js --host ${host} --port ${port}`;
}

export function getViteE2eCommand({ host, port }) {
  return `node ./scripts/run-vite-e2e.js --host ${host} --port ${port}`;
}
