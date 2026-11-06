import assert from 'node:assert/strict';
import test from 'node:test';
import { createNativeHostClient } from '../extension/native-host-client.mjs';

function event() {
  const listeners = [];
  return { addListener: (listener) => listeners.push(listener), emit: (value) => listeners.forEach((fn) => fn(value)) };
}

function harness(t) {
  const ports = [];
  const client = createNativeHostClient({
    connect: () => {
      const port = {
        sent: [],
        disconnected: false,
        onMessage: event(),
        onDisconnect: event(),
        postMessage(message) {
          this.sent.push(message);
        },
        disconnect() {
          this.disconnected = true;
          this.onDisconnect.emit();
        },
      };
      ports.push(port);
      return port;
    },
  });
  t.after(() => client.close());
  return { client, ports };
}

test('reuses one connection and routes concurrent replies to the correct request', async (t) => {
  const { client, ports } = harness(t);
  const session = client.request({ action: 'session' });
  const catalog = client.request({ action: 'catalog' });
  assert.equal(ports.length, 1);
  const port = ports[0];
  port.onMessage.emit({ id: port.sent[1].id, ok: true, data: ['haiku'] });
  port.onMessage.emit({ id: port.sent[0].id, ok: true, data: 'connected' });
  assert.equal(await session, 'connected');
  assert.deepEqual(await catalog, ['haiku']);
  assert.equal(port.disconnected, false);
});

test('cancels only the targeted analysis while unrelated replies remain usable', async (t) => {
  const { client, ports } = harness(t);
  const controller = new AbortController();
  const analysis = assert.rejects(client.request({ action: 'analyze' }, { signal: controller.signal }), /cancelled/);
  const port = ports[0];
  const analysisId = port.sent[0].id;
  controller.abort();
  assert.deepEqual(port.sent[1], { action: 'cancel-analysis', targetId: analysisId });
  const session = client.request({ action: 'session' });
  port.onMessage.emit({ id: port.sent[2].id, ok: true, data: 'connected' });
  port.onMessage.emit({ id: analysisId, ok: false, error: 'Analysis cancelled.' });
  assert.equal(await session, 'connected');
  await analysis;
  assert.equal(port.disconnected, false);
});

test('a cancelled request never exposes a late successful result', async (t) => {
  const { client, ports } = harness(t);
  const controller = new AbortController();
  const rejected = assert.rejects(client.request({ action: 'analyze' }, { signal: controller.signal }), /cancelled/);
  controller.abort();
  ports[0].onMessage.emit({ id: ports[0].sent[0].id, ok: true, data: 'late proposal' });
  await rejected;
});

test('does not connect for an analysis already cancelled', async (t) => {
  const { client, ports } = harness(t);
  await assert.rejects(client.request({ action: 'analyze' }, { signal: AbortSignal.abort() }), /cancelled/);
  assert.equal(ports.length, 0);
});

test('releases an idle host and reconnects for the next request', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, ports } = harness(t);
  const first = client.request({ action: 'session' });
  ports[0].onMessage.emit({ id: ports[0].sent[0].id, ok: true, data: 'connected' });
  await first;
  t.mock.timers.tick(59_999);
  assert.equal(ports[0].disconnected, false);
  t.mock.timers.tick(1);
  assert.equal(ports[0].disconnected, true);
  const second = client.request({ action: 'session' });
  assert.equal(ports.length, 2);
  ports[1].onMessage.emit({ id: ports[1].sent[0].id, ok: true, data: 'connected' });
  await second;
});

test('a timeout kills the host and rejects all waiting requests, then permits reconnection', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, ports } = harness(t);
  const first = assert.rejects(client.request({ action: 'analyze' }), /did not reply in time/);
  const second = assert.rejects(client.request({ action: 'session' }), /did not reply in time/);
  t.mock.timers.tick(120_000);
  await Promise.all([first, second]);
  assert.equal(ports[0].disconnected, true);
  const next = client.request({ action: 'session' });
  ports[1].onMessage.emit({ id: ports[1].sent[0].id, ok: true, data: 'connected' });
  await next;
});

test('the idle deadline is cleared while a request is still running', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, ports } = harness(t);
  const session = client.request({ action: 'session' });
  const port = ports[0];
  port.onMessage.emit({ id: port.sent[0].id, ok: true, data: 'connected' });
  await session;
  t.mock.timers.tick(50_000);
  const analysis = client.request({ action: 'analyze' });
  t.mock.timers.tick(60_000);
  assert.equal(port.disconnected, false);
  port.onMessage.emit({ id: port.sent[1].id, ok: true, data: 'proposal' });
  assert.equal(await analysis, 'proposal');
});

test('a synchronous send failure clears the dead connection before retry', async (t) => {
  const { client, ports } = harness(t);
  const session = client.request({ action: 'session' });
  ports[0].onMessage.emit({ id: ports[0].sent[0].id, ok: true, data: 'connected' });
  await session;
  ports[0].postMessage = () => {
    throw new Error('closed port');
  };
  await assert.rejects(client.request({ action: 'analyze' }), /could not receive/);
  assert.equal(ports[0].disconnected, true);
  const next = client.request({ action: 'session' });
  ports[1].onMessage.emit({ id: ports[1].sent[0].id, ok: true, data: 'connected' });
  await next;
});

test('host crashes reject waiting requests without silently retrying an analysis', async (t) => {
  const { client, ports } = harness(t);
  const rejected = assert.rejects(client.request({ action: 'analyze' }), /disconnected/);
  ports[0].onDisconnect.emit();
  await rejected;
  assert.equal(ports.length, 1);
});

test('provider errors preserve the host, while uncorrelated replies fail safely', async (t) => {
  const { client, ports } = harness(t);
  const failed = assert.rejects(client.request({ action: 'analyze' }), /usage limit/);
  const port = ports[0];
  port.onMessage.emit({ id: port.sent[0].id, ok: false, error: 'usage limit' });
  await failed;
  assert.equal(port.disconnected, false);
  const incompatible = assert.rejects(client.request({ action: 'session' }), /incompatible reply/);
  port.onMessage.emit({ ok: true, data: 'old host reply' });
  await incompatible;
  assert.equal(port.disconnected, true);
});

test('progress belongs to its request and never settles the final response or releases the host', async (t) => {
  const { client, ports } = harness(t);
  const previews = [];
  let settled = false;
  const analysis = client.request({ action: 'analyze' }, { onProgress: (data) => previews.push(data) });
  void analysis.then(() => {
    settled = true;
  });
  const session = client.request({ action: 'session' });
  const port = ports[0];
  port.onMessage.emit({ id: port.sent[0].id, event: 'progress', data: { groups: ['Docs'] } });
  await Promise.resolve();
  assert.equal(settled, false);
  assert.deepEqual(previews, [{ groups: ['Docs'] }]);
  port.onMessage.emit({ id: port.sent[1].id, ok: true, data: 'connected' });
  assert.equal(await session, 'connected');
  port.onMessage.emit({ id: port.sent[0].id, ok: true, data: 'full proposal' });
  assert.equal(await analysis, 'full proposal');
  port.onMessage.emit({ id: port.sent[0].id, event: 'progress', data: 'late preview' });
  assert.equal(previews.length, 1);
  assert.equal(port.disconnected, false);
});

test('cancelled requests suppress subsequent progress and preview errors cannot replace the final response', async (t) => {
  const { client, ports } = harness(t);
  const controller = new AbortController();
  let previews = 0;
  const rejected = assert.rejects(
    client.request(
      { action: 'analyze' },
      {
        signal: controller.signal,
        onProgress: () => {
          previews++;
        },
      },
    ),
    /cancelled/,
  );
  const port = ports[0];
  controller.abort();
  port.onMessage.emit({ id: port.sent[0].id, event: 'progress', data: 'late' });
  port.onMessage.emit({ id: port.sent[0].id, ok: false, error: 'cancelled' });
  await rejected;
  assert.equal(previews, 0);
  const final = client.request(
    { action: 'analyze' },
    {
      onProgress: () => {
        throw new Error('preview display failed');
      },
    },
  );
  const id = port.sent.at(-1).id;
  port.onMessage.emit({ id, event: 'progress', data: 'partial' });
  port.onMessage.emit({ id, ok: true, data: 'full proposal' });
  assert.equal(await final, 'full proposal');
});

test('progress does not postpone a request deadline', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, ports } = harness(t);
  const rejected = assert.rejects(client.request({ action: 'analyze' }), /did not reply in time/);
  t.mock.timers.tick(119_999);
  ports[0].onMessage.emit({ id: ports[0].sent[0].id, event: 'progress', data: 'still generating' });
  t.mock.timers.tick(1);
  await rejected;
});
