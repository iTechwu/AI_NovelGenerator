#!/usr/bin/env node

const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const runtimeSecret = process.env.NOVEL_RUNTIME_SHARED_SECRET || 'hanlin_runtime_dev_only';
const localDefaults = {
  DATABASE_URL:
    'postgresql://dofe:dofe_dev_2024@127.0.0.1:5432/ai_client?schema=public&timezone=Asia/Shanghai',
  READ_DATABASE_URL:
    'postgresql://dofe:dofe_dev_2024@127.0.0.1:5432/ai_client?schema=public&timezone=Asia/Shanghai',
  REDIS_URL: 'redis://:dofe_dev_2024@127.0.0.1:6379/2',
  RABBITMQ_URL: 'amqp://dofe:dofe_dev_2024@127.0.0.1:5672/nestjs_xica',
  SSO_API_URL: 'https://sso.dofe.ai',
  SSO_INTERNAL_API_URL: 'https://sso.dofe.ai',
  SSO_ISSUER: 'https://sso.dofe.ai',
  SSO_CLIENT_ID: 'hanlin-ai',
  SSO_CLIENT_SECRET: 'local-dev-placeholder',
  SSO_SERVICE_NAME: 'hanlin.ai',
  INTERNAL_API_SECRET: 'local-dev-placeholder',
  JWT_SECRET: 'local-dev-jwt-secret-change-before-production',
  CRYPTO_KEY: 'local-dev-crypto-key-change-before-production',
  CRYPTO_IV: 'local-dev-crypto-iv',
  ENCRYPTION_KEY: 'local-dev-encryption-key-change-before-production',
};

/**
 * Minimal .env parser (no external dependency). Reads KEY=VALUE lines,
 * ignoring blank lines / comments and stripping surrounding quotes.
 * Returns {} when the file is missing or unreadable.
 */
function loadEnvFile(filePath) {
  const env = {};
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return env;
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) env[key] = value;
  }
  return env;
}

// Forward runtime-relevant vars from backend/.env to the Python runtime, and
// make NOVEL_RUNTIME_* visible to the API as well. Placed BEFORE ...process.env
// so a real shell/exported env var still takes precedence over the file.
const RUNTIME_ENV_KEY = /^(LLM_|NOVEL_RUNTIME_)/;
const runtimeEnvFromDotenv = {};
for (const [key, value] of Object.entries(loadEnvFile(path.join(root, 'backend', '.env')))) {
  if (RUNTIME_ENV_KEY.test(key) || key === 'PROJECT_STORAGE_ROOT') {
    runtimeEnvFromDotenv[key] = value;
  }
}

const commonEnv = {
  ...localDefaults,
  ...runtimeEnvFromDotenv,
  ...process.env,
  NOVEL_RUNTIME_BASE_URL: process.env.NOVEL_RUNTIME_BASE_URL || 'http://127.0.0.1:18080',
  NOVEL_RUNTIME_SHARED_SECRET: runtimeSecret,
};

const services = [
  {
    name: 'runtime',
    port: 18080,
    command: 'uv',
    args: ['run', 'uvicorn', 'runtime.api:app', '--host', '127.0.0.1', '--port', '18080'],
    cwd: path.join(root, 'backend'),
    env: {
      ...commonEnv,
      PROJECT_STORAGE_ROOT:
        process.env.PROJECT_STORAGE_ROOT || path.join(root, '.local', 'novel-runtime', 'projects'),
    },
  },
  {
    name: 'api',
    port: 3108,
    command: 'pnpm',
    args: ['--filter', '@repo/api', 'dev'],
    cwd: root,
    env: commonEnv,
  },
  {
    name: 'web',
    port: 3008,
    command: 'pnpm',
    args: ['--filter', '@repo/web', 'dev'],
    cwd: root,
    env: commonEnv,
  },
];

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function pipeOutput(stream, name) {
  let remaining = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    remaining += chunk;
    const lines = remaining.split(/\r?\n/);
    remaining = lines.pop();
    for (const line of lines) console.log(`[${name}] ${line}`);
  });
  stream.on('end', () => {
    if (remaining) console.log(`[${name}] ${remaining}`);
  });
}

async function main() {
  const children = [];
  let stopping = false;

  const stopChildren = (signal) => {
    if (stopping) return;
    stopping = true;
    for (const child of children) child.kill(signal);
  };

  process.on('SIGINT', () => stopChildren('SIGINT'));
  process.on('SIGTERM', () => stopChildren('SIGTERM'));

  for (const service of services) {
    if (await isPortInUse(service.port)) {
      console.log(`[${service.name}] already listening on http://127.0.0.1:${service.port}`);
      continue;
    }

    const child = spawn(service.command, service.args, {
      cwd: service.cwd,
      env: service.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    children.push(child);
    pipeOutput(child.stdout, service.name);
    pipeOutput(child.stderr, service.name);

    child.on('error', (error) => {
      console.error(`[${service.name}] failed to start: ${error.message}`);
      stopChildren('SIGTERM');
      process.exitCode = 1;
    });
    child.on('exit', (code, signal) => {
      if (!stopping && (code !== 0 || signal)) {
        console.error(`[${service.name}] exited unexpectedly (${signal || code})`);
        stopChildren('SIGTERM');
        process.exitCode = 1;
      }
    });
  }

  if (children.length === 0) {
    console.log('All local services are already running.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
