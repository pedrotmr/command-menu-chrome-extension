import assert from 'node:assert/strict';
import test from 'node:test';
import { filterGroupTabIds } from '../native/proposal-members.mjs';
import { buildStreamRequest } from '../native/stream-request.mjs';
import { streamResponse } from '../vendor/sign-in-with-chatgpt-devkit/packages/local/dist/responses.js';

test('sends GPT-6 Luna non-reasoning effort to the Responses API', async (t) => {
  let sentBody;
  const { requestOptions, reasoningEffort } = buildStreamRequest(
    { slug: 'gpt-6-luna' },
    { input: 'Organize these tabs.' },
  );
  assert.equal(reasoningEffort, 'none');
  assert.deepEqual(requestOptions, {
    input: 'Organize these tabs.',
    model: 'gpt-6-luna',
    reasoningEffort: 'none',
  });

  const completed = { type: 'response.completed', response: { status: 'completed' } };
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    sentBody = JSON.parse(init.body);
    return new Response(`data: ${JSON.stringify(completed)}\n\n`, {
      headers: { 'content-type': 'text/event-stream' },
    });
  });

  await streamResponse('synthetic-oauth-token', requestOptions, new AbortController().signal);

  assert.equal(sentBody.model, 'gpt-6-luna');
  assert.deepEqual(sentBody.reasoning, { effort: 'none' });
  assert.equal(sentBody.store, false);
  assert.equal(sentBody.stream, true);
});

test('leaves other models at their default reasoning effort', () => {
  const { requestOptions, reasoningEffort } = buildStreamRequest(
    { slug: 'gpt-6.1-sol' },
    { input: 'Organize these tabs.' },
  );
  assert.equal(reasoningEffort, undefined);
  assert.deepEqual(requestOptions, { input: 'Organize these tabs.', model: 'gpt-6.1-sol' });
});

test('excludes pinned, unknown, invalid, and already assigned tabs from proposed groups', () => {
  const tabByModelId = new Map([
    [1, { pinned: false }],
    [2, { pinned: true }],
    [3, { pinned: false }],
  ]);
  assert.deepEqual(filterGroupTabIds([1, 2, 3, 1, 9, '4'], tabByModelId, new Set([3])), [1]);
});
