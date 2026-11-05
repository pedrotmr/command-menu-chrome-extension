import assert from 'node:assert/strict';
import test from 'node:test';
import { createProposalCache, keeperMatches, mergeLocalAnalysis, prepareAnalysis, proposalCacheKey } from '../extension/local-analysis.mjs';

const tab = (id, url, extra = {}) => ({ id, url, title: 'Docs', pinned: false, windowId: 1, groupId: -1, group: '', ...extra });

test('reduces exact copies to one model record and restores every unpinned member to its topic group', () => {
  const tabs = [tab(3, 'https://example.com/b'), tab(2, 'https://example.com/a'), tab(1, 'https://example.com/a')];
  const prepared = prepareAnalysis(tabs);
  assert.deepEqual(prepared.modelTabs.map((tab) => tab.id), [1, 3]);
  const result = mergeLocalAnalysis({
    groups: [{ name: 'Docs', tabs: prepared.modelTabs }], closeCandidates: [],
  }, prepared);
  assert.deepEqual(result.groups[0].tabs.map((tab) => tab.id), [1, 2, 3]);
  assert.equal(result.closeCandidates[0].id, 2);
  assert.equal(result.closeCandidates[0].keepTabId, 1);
});

test('prefers a pinned keeper, never sends pinned tabs, and never suggests closing them', () => {
  const prepared = prepareAnalysis([
    tab(1, 'https://example.com/a'), tab(2, 'https://example.com/a'),
    tab(3, 'https://example.com/a', { pinned: true }), tab(4, 'https://example.com/b', { pinned: true }),
  ]);
  assert.deepEqual(prepared.modelTabs.map((tab) => tab.id), [1]);
  assert.deepEqual(prepared.localCloseCandidates.map((tab) => [tab.id, tab.keepTabId]), [[1, 3], [2, 3]]);
});

test('query strings, fragments, and URL characters beyond the provider limit remain distinct', () => {
  const longUrl = `https://example.com/${'a'.repeat(2100)}`;
  const urls = ['https://example.com/?q=1', 'https://example.com/?q=2',
    'https://example.com/#a', 'https://example.com/#b', `${longUrl}1`, `${longUrl}2`];
  const prepared = prepareAnalysis(urls.map((url, i) => tab(i + 1, url)));
  assert.equal(prepared.modelTabs.length, urls.length);
  assert.equal(prepared.localCloseCandidates.length, 0);
});

test('keeps exact-URL keepers protected from AI closures and caps the combined suggestions at five', () => {
  const tabs = Array.from({ length: 8 }, (_, i) => tab(i + 1, 'https://example.com/a'));
  const prepared = prepareAnalysis(tabs);
  const result = mergeLocalAnalysis({ groups: [], closeCandidates: [tabs[0], tabs[1]] }, prepared);
  assert.deepEqual(result.closeCandidates.map((tab) => tab.id), [2, 3, 4, 5, 6]);
  assert.equal(prepared.localCloseCandidates.length, 7);
});

test('a local closure requires the distinct keeper to still exist at the exact URL', () => {
  const candidate = { ...tab(2, 'https://example.com/a'), keepTabId: 1 };
  assert.equal(keeperMatches(candidate, tab(1, candidate.url)), true);
  assert.equal(keeperMatches(candidate, undefined), false);
  assert.equal(keeperMatches(candidate, tab(1, 'https://example.com/b')), false);
  assert.equal(keeperMatches({ ...candidate, keepTabId: 2 }, tab(2, candidate.url)), false);
});

test('cache identity includes model settings and complete tab identity and metadata', () => {
  const tabs = [tab(1, `https://example.com/${'a'.repeat(2100)}1`), tab(2, 'https://example.com/b')];
  const selection = { modelId: 'gpt-6-luna', reasoningEffort: 'low' };
  const key = proposalCacheKey(tabs, 'codex', selection);
  assert.equal(proposalCacheKey([...tabs].reverse(), 'codex', selection), key);
  for (const changed of [
    { id: 3 }, { url: `${tabs[0].url}2` }, { title: 'Updated' }, { pinned: true },
    { windowId: 2 }, { groupId: 1 }, { group: 'New group' },
  ]) {
    assert.notEqual(proposalCacheKey([{ ...tabs[0], ...changed }, tabs[1]], 'codex', selection), key);
  }
  assert.notEqual(proposalCacheKey(tabs.slice(1), 'codex', selection), key);
  assert.notEqual(proposalCacheKey(tabs, 'anthropic', selection), key);
  assert.notEqual(proposalCacheKey(tabs, 'codex', { ...selection, modelId: 'another-model' }), key);
  assert.notEqual(proposalCacheKey(tabs, 'codex', { ...selection, reasoningEffort: 'none' }), key);
});

test('cache isolates caller mutations, expires, and retains only the latest proposal', () => {
  let clock = 0;
  const cache = createProposalCache({ now: () => clock, ttlMs: 100 });
  const proposal = { groups: [{ name: 'Docs', tabs: [tab(1, 'https://example.com')] }] };
  cache.set('first', proposal);
  proposal.groups[0].name = 'Mutated original';
  const retrieved = cache.get('first');
  assert.equal(retrieved.proposal.groups[0].name, 'Docs');
  retrieved.proposal.groups[0].name = 'Mutated copy';
  assert.equal(cache.get('first').proposal.groups[0].name, 'Docs');
  clock = 99;
  assert.equal(cache.get('first').ageMs, 99);
  clock = 100;
  assert.equal(cache.get('first'), undefined);
  cache.set('first', proposal);
  cache.set('second', proposal);
  assert.equal(cache.get('first'), undefined);
  cache.clear();
  assert.equal(cache.get('second'), undefined);
});
