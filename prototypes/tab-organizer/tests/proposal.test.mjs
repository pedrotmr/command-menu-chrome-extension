import assert from 'node:assert/strict';
import test from 'node:test';
import { validateProposal } from '../native/proposal.mjs';

const tabs = new Map([1, 2, 3, 4, 5, 6].map((id) => [id, { id, pinned: id === 6 }]));

test('accepts a useful proposal without a model-written summary or group explanations', () => {
  assert.deepEqual(
    validateProposal(
      {
        groups: [{ name: ' Docs ', tabIds: [1, 2] }],
        closeCandidates: [{ tabId: 3, reason: 'Same article' }],
      },
      tabs,
    ),
    {
      groups: [{ name: 'Docs', tabIds: [1, 2] }],
      closeCandidates: [{ tabId: 3, reason: 'Same article' }],
    },
  );
});

test('compact groups still exclude pinned, invented, repeated and already assigned tab IDs', () => {
  const result = validateProposal(
    {
      groups: [
        { name: 'Docs', tabIds: [1, 6, 99, '2', 2, 1] },
        { name: ' docs ', tabIds: [3, 4] },
        { name: 'Research', tabIds: [1, 3, 4] },
        { name: 'Travel', tabIds: [4, 5] },
      ],
      closeCandidates: [],
    },
    tabs,
  );
  assert.deepEqual(result.groups, [
    { name: 'Docs', tabIds: [1, 2] },
    { name: 'Research', tabIds: [3, 4] },
  ]);
});

test('compact duplicate suggestions still require known unpinned tabs and a reason', () => {
  const result = validateProposal(
    {
      groups: [],
      closeCandidates: [
        { tabId: 6, reason: 'Pinned duplicate' },
        { tabId: 99, reason: 'Invented tab' },
        { tabId: 1, reason: ' Same URL ' },
        { tabId: 1, reason: 'Repeated suggestion' },
        { tabId: 2 },
      ],
    },
    tabs,
  );
  assert.deepEqual(result.closeCandidates, [{ tabId: 1, reason: 'Same URL' }]);
});

test('rejects incomplete responses and accepts an empty proposal', () => {
  for (const value of [null, {}, { groups: [] }, { groups: 'invalid', closeCandidates: [] }]) {
    assert.throws(() => validateProposal(value, tabs), /incomplete proposal/);
  }
  assert.deepEqual(validateProposal({ groups: [], closeCandidates: [] }, tabs), {
    groups: [],
    closeCandidates: [],
  });
});
