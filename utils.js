// Shared utility functions for Command Palette

/**
 * Fuzzy search through items matching against title and URL
 * @param {Array} items - Array of items to search through
 * @param {string} query - Search query string
 * @returns {Array} Filtered and sorted array of items with scores
 */
function fuzzySearch(items, query) {
  const queryLower = query.toLowerCase();

  return items
    .map((item) => {
      const title = item.title.toLowerCase();
      const url = item.url ? item.url.toLowerCase() : "";
      const searchText = title + " " + url;
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
      let totalConsecutiveBonus = 0;

      for (let i = 0; i < searchText.length && queryIndex < query.length; i++) {
        if (searchText[i] === queryLower[queryIndex]) {
          score += 1;
          consecutiveMatches++;
          queryIndex++;

          // Bonus for consecutive matches
          if (consecutiveMatches > 1) {
            totalConsecutiveBonus += consecutiveMatches;
            score += consecutiveMatches;
          }
        } else {
          consecutiveMatches = 0;
        }
      }

      // Only return items that match all characters
      // AND have a minimum score threshold to avoid weak fuzzy matches
      if (queryIndex === query.length && score >= query.length * 2) {
        return { ...item, score };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

/**
 * Recursively extract bookmarks from bookmark tree nodes
 * @param {Array} bookmarkNodes - Chrome bookmark tree nodes
 * @param {Array} result - Accumulator array for results
 * @returns {Array} Flat array of bookmark objects
 */
function extractBookmarks(bookmarkNodes, result = []) {
  for (const node of bookmarkNodes) {
    if (node.url) {
      result.push({
        id: node.id,
        title: node.title,
        url: node.url,
        icon: "🔖",
        type: "bookmark",
      });
    }
    if (node.children) {
      extractBookmarks(node.children, result);
    }
  }
  return result;
}
