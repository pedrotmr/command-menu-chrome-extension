import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

let importId = 0;
const flush = () => new Promise((resolve) => setImmediate(resolve));
const groups = [{ name: 'Docs', tabs: [
  { id: 1, title: 'Docs A', url: 'https://example.com/a', pinned: false },
  { id: 2, title: 'Docs B', url: 'https://example.com/b', pinned: false },
] }];
const finalProposal = () => ({
  groups, closeCandidates: [], provider: 'codex', modelName: 'gpt-6-luna', reasoningEffort: 'low',
  tabsAnalyzed: 2, tabsSentToModel: 2, exactDuplicateCount: 0, latencyMs: 100,
  optimizationStep: 4, resultSource: 'fresh', outputCharacters: 100,
  timings: { authMs: 0, requestMs: 100, validationMs: 0 },
});

async function harness(t) {
  const dom = new JSDOM(await readFile(new URL('../extension/popup.html', import.meta.url), 'utf8'));
  const previous = { document: globalThis.document, Option: globalThis.Option, chrome: globalThis.chrome };
  globalThis.document = dom.window.document;
  globalThis.Option = dom.window.Option;
  const listeners = [];
  const analyses = [];
  const messages = [];
  const settings = {
    provider: 'codex', selections: {
      codex: { modelId: 'gpt-6-luna', reasoningEffort: 'low' },
      anthropic: { modelId: '', reasoningEffort: 'default' },
    },
  };
  globalThis.chrome = { runtime: {
    onMessage: { addListener: (fn) => listeners.push(fn) },
    sendMessage: (message) => {
      messages.push(message);
      if (message.type === 'analyze') return new Promise((resolve) => analyses.push({ message, resolve }));
      const result = {
        'get-settings': settings, 'save-settings': settings,
        'session': { status: 'connected', sharing: true }, 'has-reopenable-tabs': false,
        'catalog': { models: [{ id: 'gpt-6-luna', displayName: 'Luna', defaultReasoningEffort: 'low',
          reasoningEfforts: [{ value: 'low', label: 'Low' }] }] },
      }[message.type];
      return Promise.resolve({ ok: true, result });
    },
  } };
  t.after(() => {
    dom.window.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  await import(`../extension/popup.js?test=${++importId}`);
  await flush();
  const $ = (selector) => dom.window.document.querySelector(selector);
  const preview = (value = groups, runId = analyses.at(-1).message.runId) => {
    listeners.forEach((fn) => fn({ type: 'analysis-progress', runId, groups: value }));
  };
  assert.equal($('#organize').disabled, false);
  return { $, preview, analyses, messages };
}

test('popup shows read-only groups before completion and enables review only after the final response', async (t) => {
  const { $, preview, analyses, messages } = await harness(t);
  $('#organize').click();
  preview(groups, 'another-popup-run');
  assert.equal($('#results').classList.contains('hidden'), true);
  preview([{ ...groups[0], name: '<img src=x onerror=alert(1)>' }]);
  assert.equal($('#results').classList.contains('hidden'), false);
  assert.equal($('#groups h3').textContent, '<img src=x onerror=alert(1)>');
  assert.equal($('#groups img'), null);
  assert.equal($('#groups input').disabled, true);
  assert.equal($('#apply').disabled, true);
  assert.equal($('#reanalyze').disabled, true);
  $('#apply').click();
  assert.equal(messages.some((message) => message.type === 'apply'), false);
  analyses[0].resolve({ ok: true, result: finalProposal() });
  await flush();
  assert.equal($('#groups h3').textContent, 'Docs');
  assert.equal($('#groups input').disabled, false);
  assert.equal($('#apply').disabled, false);
  assert.equal($('#reanalyze').disabled, false);
  assert.match($('#timing-details').textContent, /First group shown: \d+ ms/);
  assert.match($('#timing-details').textContent, /Total: \d+ ms/);
});

test('cancellation removes previews and old progress cannot appear in a subsequent run', async (t) => {
  const { $, preview, analyses } = await harness(t);
  $('#organize').click();
  const oldRun = analyses[0].message.runId;
  preview();
  $('#cancel').click();
  preview();
  assert.equal($('#results').classList.contains('hidden'), true);
  assert.equal($('#groups').children.length, 0);
  analyses[0].resolve({ ok: true, result: finalProposal() });
  await flush();
  assert.equal($('#results').classList.contains('hidden'), true);
  assert.equal($('#apply').disabled, true);
  $('#organize').click();
  preview(groups, oldRun);
  assert.equal($('#results').classList.contains('hidden'), true);
  preview();
  assert.equal($('#results').classList.contains('hidden'), false);
  analyses[1].resolve({ ok: true, result: finalProposal() });
  await flush();
});

test('final errors discard preview groups and never enable Apply', async (t) => {
  const { $, preview, analyses } = await harness(t);
  $('#organize').click();
  preview();
  analyses[0].resolve({ ok: false, error: 'Incomplete proposal; no tabs changed.' });
  await flush();
  preview();
  assert.equal($('#results').classList.contains('hidden'), true);
  assert.equal($('#groups').children.length, 0);
  assert.equal($('#apply').disabled, true);
  assert.match($('#message').textContent, /Incomplete proposal/);
});

test('cached proposals remain immediate complete results without a fabricated streaming time', async (t) => {
  const { $, analyses } = await harness(t);
  $('#organize').click();
  const result = finalProposal();
  delete result.timings;
  delete result.latencyMs;
  result.resultSource = 'cached';
  result.cacheAgeMs = 100;
  result.tabsSentToModel = 0;
  analyses[0].resolve({ ok: true, result });
  await flush();
  assert.match($('#latency').textContent, /Cached proposal/);
  assert.doesNotMatch($('#timing-details').textContent, /First group shown|Host:|NaN/);
  assert.equal($('#apply').disabled, false);
});
