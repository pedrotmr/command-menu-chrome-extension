import { Item, ScoredItem } from '@/types';

export function fuzzySearch(items: Item[], query: string): ScoredItem[] {
  const queryLower = query.toLowerCase();

  return items
    .map((item) => {
      const title = item.title.toLowerCase();
      const url = 'url' in item ? item.url.toLowerCase() : '';
      const searchText = title + ' ' + url;
      let score = 0;

      // Exact match in title gets highest score
      if (title.includes(queryLower)) {
        score += 100;
      }

      // Exact match in URL gets high score
      if (url && url.includes(queryLower)) {
        score += 80;
      }

      // Title starts with query gets high score
      if (title.startsWith(queryLower)) {
        score += 50;
      }

      // URL starts with query gets good score
      if (url && url.startsWith(queryLower)) {
        score += 40;
      }

      // Fuzzy matching on combined title + URL
      let queryIndex = 0;
      let consecutiveMatches = 0;

      for (let i = 0; i < searchText.length && queryIndex < query.length; i++) {
        if (searchText[i] === queryLower[queryIndex]) {
          score += 1;
          consecutiveMatches++;
          queryIndex++;

          // Bonus for consecutive matches
          if (consecutiveMatches > 1) {
            score += consecutiveMatches;
          }
        } else {
          consecutiveMatches = 0;
        }
      }

      // Only return items that match all characters
      // AND have a minimum score threshold to avoid weak fuzzy matches
      if (queryIndex === query.length && score >= query.length * 2) {
        return { ...item, score } as ScoredItem;
      }
      return null;
    })
    .filter((item): item is ScoredItem => item !== null)
    .sort((a, b) => b.score - a.score);
}
