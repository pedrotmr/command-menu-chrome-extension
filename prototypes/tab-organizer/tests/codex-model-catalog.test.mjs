import assert from 'node:assert/strict';
import test from 'node:test';
import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import { syncBuiltinESMExports } from 'node:module';
import { PassThrough, Writable } from 'node:stream';
import { listCodexModels } from '../native/codex-model-catalog.mjs';

test('an asynchronous app-server stdin failure rejects the catalog request without crashing the host', async (t) => {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stdin = new Writable({
    write(_chunk, _encoding, callback) {
      queueMicrotask(() => callback(Object.assign(new Error('write EPIPE'), { code: 'EPIPE' })));
    },
  });
  child.exitCode = null;
  child.signalCode = null;
  child.kill = (signal) => {
    child.signalCode = signal;
    queueMicrotask(() => child.emit('exit', null, signal));
    return true;
  };
  const spawn = t.mock.method(childProcess, 'spawn', () => child);
  syncBuiltinESMExports();
  t.after(() => {
    spawn.mock.restore();
    syncBuiltinESMExports();
  });

  await assert.rejects(
    listCodexModels({ codexPath: '/mock/codex', accessToken: 'synthetic-token', signal: AbortSignal.timeout(1000) }),
    /Codex app-server could not receive the request/,
  );
  assert.equal(child.signalCode, 'SIGTERM');
});
