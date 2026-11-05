export function prepareAnalysis(tabs) {
  const byUrl = new Map();
  for (const tab of [...tabs].sort((a, b) => a.id - b.id)) {
    const copies = byUrl.get(tab.url) || [];
    copies.push(tab);
    byUrl.set(tab.url, copies);
  }
  const modelTabs = [];
  const membersByRepresentative = new Map();
  const localCloseCandidates = [];
  const keepIds = new Set();
  for (const copies of byUrl.values()) {
    const unpinned = copies.filter((tab) => !tab.pinned);
    if (!unpinned.length) continue;
    const representative = unpinned[0];
    modelTabs.push(representative);
    membersByRepresentative.set(representative.id, unpinned);
    if (copies.length < 2) continue;
    const keeper = copies.find((tab) => tab.pinned) || representative;
    keepIds.add(keeper.id);
    for (const tab of unpinned) {
      if (tab.id === keeper.id) continue;
      localCloseCandidates.push({
        ...tab,
        reason: 'Exact same URL as another open tab',
        keepTabId: keeper.id,
      });
    }
  }
  return { modelTabs, membersByRepresentative, localCloseCandidates, keepIds };
}

export function mergeLocalAnalysis(proposal, prepared) {
  const groups = proposal.groups.map((group) => ({
    ...group,
    tabs: group.tabs.flatMap((tab) => prepared.membersByRepresentative.get(tab.id) || []),
  })).filter((group) => group.tabs.length >= 2);
  const seen = new Set();
  const closeCandidates = [
    ...prepared.localCloseCandidates,
    ...proposal.closeCandidates.filter((tab) => !prepared.keepIds.has(tab.id)),
  ].filter((tab) => {
    if (tab.pinned || seen.has(tab.id)) return false;
    seen.add(tab.id);
    return true;
  }).slice(0, 5);
  return { ...proposal, groups, closeCandidates };
}

export function keeperMatches(candidate, keeper) {
  return candidate.keepTabId !== candidate.id &&
    keeper?.id === candidate.keepTabId && keeper.url === candidate.url;
}

export function proposalCacheKey(tabs, provider, selection) {
  return JSON.stringify([
    provider, selection.modelId, selection.reasoningEffort,
    [...tabs].sort((a, b) => a.id - b.id).map((tab) => [
      tab.id, tab.url, tab.title, tab.pinned, tab.windowId, tab.groupId, tab.group,
    ]),
  ]);
}

export function createProposalCache({ now = () => performance.now(), ttlMs = 5 * 60_000 } = {}) {
  let entry;
  return {
    get(key) {
      if (!entry) return undefined;
      const ageMs = now() - entry.savedAt;
      if (ageMs >= ttlMs) {
        entry = undefined;
        return undefined;
      }
      return entry.key === key ? { proposal: structuredClone(entry.proposal), ageMs } : undefined;
    },
    set(key, proposal) {
      entry = { key, proposal: structuredClone(proposal), savedAt: now() };
    },
    clear() { entry = undefined; },
  };
}
