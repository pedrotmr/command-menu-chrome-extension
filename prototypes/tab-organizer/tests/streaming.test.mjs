import assert from 'node:assert/strict';
import test from 'node:test';
import { createGroupStream } from '../native/group-stream.mjs';
import { createClaudeStream } from '../native/claude-stream.mjs';
import { validateProposal } from '../native/proposal.mjs';

test('extracts completed groups before the enclosing JSON is complete at every chunk boundary', () => {
  const group = { name: 'Docs "A" \\ notes {} []', tabIds: [1, 2] };
  const prefix = `{"groups":[${JSON.stringify(group)}`;
  for (let cut = 0; cut <= prefix.length; cut++) {
    const stream = createGroupStream();
    assert.deepEqual([...stream.push(prefix.slice(0, cut)), ...stream.push(prefix.slice(cut))], [group]);
    assert.deepEqual(stream.push('],"closeCandidates":[]}'), []);
  }
  const stream = createGroupStream();
  assert.deepEqual(
    [...prefix].flatMap((char) => stream.push(char)),
    [group],
  );
});

test('ignores braces, fake groups keys in strings, nested objects, and closure objects', () => {
  const stream = createGroupStream();
  const group = { name: 'Docs', tabIds: [1, 2], unused: { text: '} ] "groups": [{"name":"fake"}]' } };
  const json = JSON.stringify({
    closeCandidates: [{ tabId: 2, reason: '"groups": [{"name":"fake"}]' }],
    groups: [group],
  });
  assert.deepEqual(stream.push(json), [group]);
});

test('incomplete objects never become previews, and streamed groups retain final validation safeguards', () => {
  const stream = createGroupStream();
  assert.deepEqual(stream.push('{"groups":[{"name":"Docs","tabIds":[1,'), []);
  const groups = stream.push('2,3,99,"4"]}');
  const tabs = new Map([
    [1, { pinned: false }],
    [2, { pinned: true }],
    [3, { pinned: false }],
  ]);
  assert.deepEqual(validateProposal({ groups, closeCandidates: [] }, tabs).groups, [{ name: 'Docs', tabIds: [1, 3] }]);
});

test('oversized preview input stops extraction without inventing a group', () => {
  const stream = createGroupStream();
  assert.deepEqual(stream.push(' '.repeat(1024 * 1024 + 1)), []);
  assert.deepEqual(stream.push('{"groups":[{"name":"Docs","tabIds":[1,2]}]}'), []);
});

const delta = (text, extra = {}) => ({
  type: 'stream_event',
  event: { type: 'content_block_delta', delta: { type: 'text_delta', text } },
  ...extra,
});

test('Claude streaming extracts only main-response text deltas and trusts the final result separately', () => {
  const messages = [
    { type: 'system', subtype: 'init', account: 'not forwarded' },
    delta('{"groups":['),
    delta('{"name":"Docs","tabIds":[1,2]}'),
    delta('subagent text', { parent_tool_use_id: 'child' }),
    {
      type: 'stream_event',
      event: { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'not forwarded' } },
    },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'duplicate snapshot' }] } },
    { type: 'result', is_error: false, result: '{"groups":[],"closeCandidates":[]}' },
  ];
  const lines = messages.map(JSON.stringify).join('\n');
  for (const width of [1, 7, lines.length]) {
    const texts = [];
    const stream = createClaudeStream((text) => texts.push(text));
    for (let i = 0; i < lines.length; i += width) stream.push(lines.slice(i, i + width));
    assert.equal(stream.finish(), messages.at(-1).result);
    assert.deepEqual(texts, ['{"groups":[', '{"name":"Docs","tabIds":[1,2]}']);
  }
});

test('Claude missing, failed, malformed and oversized streams fail without exposing their raw contents', () => {
  const stream = createClaudeStream(() => {});
  stream.push(`${JSON.stringify(delta('partial'))}\n`);
  assert.throws(() => stream.finish(), /incomplete proposal/);
  stream.push(`${JSON.stringify({ type: 'result', is_error: true, result: 'sensitive raw error' })}\n`);
  assert.throws(
    () => stream.finish(),
    (error) => /incomplete/.test(error.message) && !error.message.includes('sensitive'),
  );
  assert.throws(() => createClaudeStream(() => {}).push('sensitive invalid JSON\n'), /unreadable response stream/);
  assert.throws(() => createClaudeStream(() => {}).push('x'.repeat(2 * 1024 * 1024 + 1)), /too much output/);
});
