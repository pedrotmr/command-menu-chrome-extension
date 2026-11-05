import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chmod, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const STARTUP_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_LINE_BYTES = 8 * 1024 * 1024;

export async function listCodexModels({ codexPath, accessToken, signal }) {
  if (!codexPath || !accessToken) throw new Error('Connect Codex before loading its model catalog.');
  signal?.throwIfAborted();

  const scratch = await mkdtemp(join(tmpdir(), 'keybar-tab-organizer-codex-'));
  await chmod(scratch, 0o700);
  const codexHome = join(scratch, 'codex-home');
  const cwd = join(scratch, 'workspace');
  await Promise.all([mkdir(codexHome, { mode: 0o700 }), mkdir(cwd, { mode: 0o700 })]);

  let child;
  try {
    child = spawn(
      codexPath,
      [
        'app-server',
        '--listen',
        'stdio://',
        '--strict-config',
        '-c',
        'model_provider="openai_chatgpt_plan"',
        '-c',
        'model_providers.openai_chatgpt_plan.name="ChatGPT plan"',
        '-c',
        'model_providers.openai_chatgpt_plan.base_url="https://api.openai.com/v1"',
        '-c',
        'model_providers.openai_chatgpt_plan.env_key="ACCESS_TOKEN"',
        '-c',
        'model_providers.openai_chatgpt_plan.wire_api="responses"',
        '-c',
        'model_providers.openai_chatgpt_plan.requires_openai_auth=false',
        '-c',
        'model_providers.openai_chatgpt_plan.supports_websockets=false',
      ],
      {
        cwd,
        env: {
          HOME: scratch,
          CODEX_HOME: codexHome,
          TMPDIR: scratch,
          PATH: `${dirname(process.execPath)}:${dirname(codexPath)}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
          ACCESS_TOKEN: accessToken,
        },
        stdio: ['pipe', 'pipe', 'ignore'],
      },
    );

    const client = createAppServerClient(child);
    const abort = () => child.kill('SIGTERM');
    signal?.addEventListener('abort', abort, { once: true });
    try {
      await withTimeout(
        client.request('initialize', {
          clientInfo: {
            name: 'Keybar Tab Organizer Prototype',
            title: 'Keybar Tab Organizer Prototype',
            version: '0.1.0',
          },
        }),
        STARTUP_TIMEOUT_MS,
        'Codex app-server did not initialize in time.',
        signal,
      );
      client.notify('initialized');
      const response = await withTimeout(
        client.request('model/list', {}),
        REQUEST_TIMEOUT_MS,
        'Codex app-server did not return its model catalog in time.',
        signal,
      );
      if (!Array.isArray(response?.data)) throw new Error('Codex returned an invalid model catalog.');
      return response.data;
    } finally {
      signal?.removeEventListener('abort', abort);
      await stopChild(child);
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  let timer;
  await Promise.race([
    exited,
    new Promise((resolve) => {
      timer = setTimeout(resolve, 1_000);
      timer.unref();
    }),
  ]);
  clearTimeout(timer);
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
}

function createAppServerClient(child) {
  let buffer = '';
  let nextId = 1;
  const pending = new Map();

  const failPending = (error) => {
    for (const request of pending.values()) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
    pending.clear();
  };

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    if (Buffer.byteLength(buffer, 'utf8') > MAX_LINE_BYTES && !buffer.includes('\n')) {
      failPending(new Error('Codex returned an oversized protocol message.'));
      child.kill('SIGTERM');
      return;
    }
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (!line.trim()) continue;
      if (Buffer.byteLength(line, 'utf8') > MAX_LINE_BYTES) {
        failPending(new Error('Codex returned an oversized protocol message.'));
        child.kill('SIGTERM');
        return;
      }
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        failPending(new Error('Codex returned an invalid protocol message.'));
        child.kill('SIGTERM');
        return;
      }
      if (message && Object.hasOwn(message, 'id')) {
        const request = pending.get(message.id);
        if (!request) continue;
        pending.delete(message.id);
        clearTimeout(request.timeout);
        if (message.error) request.reject(new Error('Codex could not load its model catalog.'));
        else request.resolve(message.result);
      }
    }
  });

  child.on('error', () => failPending(new Error('Codex CLI could not start. Check its installation and try again.')));
  child.on('exit', () => failPending(new Error('Codex app-server exited before returning its model catalog.')));
  child.stdin.on('error', () => failPending(new Error('Codex app-server could not receive the request.')));

  return {
    request(method, params) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error('Codex app-server did not respond in time.'));
        }, REQUEST_TIMEOUT_MS);
        pending.set(id, { resolve, reject, timeout });
        try {
          child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
        } catch {
          clearTimeout(timeout);
          pending.delete(id);
          reject(new Error('Codex app-server could not receive the request.'));
        }
      });
    },
    notify(method) {
      child.stdin.write(`${JSON.stringify({ method })}\n`);
    },
  };
}

function withTimeout(promise, timeoutMs, message, signal) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    const abort = () => reject(signal.reason instanceof Error ? signal.reason : new Error('Request cancelled.'));
    signal?.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    });
  });
}
