export function filterGroupTabIds(tabIds, tabByModelId, assigned) {
  return [...new Set(tabIds)].filter(
    (id) => Number.isSafeInteger(id) && tabByModelId.has(id) && !tabByModelId.get(id).pinned && !assigned.has(id),
  );
}
