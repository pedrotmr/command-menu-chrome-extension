import assert from 'node:assert/strict';
import test from 'node:test';
import { streamResponse } from '../vendor/sign-in-with-chatgpt-devkit/packages/local/dist/responses.js';

test('sends GPT-6 Luna non-reasoning effort to the Responses API', async (t) => {
  let sentBody;
  const completed = { type: 'response.completed', response: { status: 'completed' } };
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    sentBody = JSON.parse(init.body);
    return new Response(`data: ${JSON.stringify(completed)}\n\n`, {
      headers: { 'content-type': 'text/event-stream' },
    });
  });

  await streamResponse(
    'synthetic-oauth-token',
    { model: 'gpt-6-luna', input: 'Organize these tabs.', reasoningEffort: 'none' },
    new AbortController().signal,
  );

  assert.equal(sentBody.model, 'gpt-6-luna');
  assert.deepEqual(sentBody.reasoning, { effort: 'none' });
  assert.equal(sentBody.store, false);
  assert.equal(sentBody.stream, true);
});
