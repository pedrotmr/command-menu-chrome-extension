import { useMemo } from 'react';
import { Item, ScoredItem, WebSearchItem, UrlNavigateItem } from '@/types';
import { fuzzySearch } from '@/utils/fuzzySearch';

function isValidUrl(input: string): string | null {
  const trimmed = input.trim();

  // Check if it's already a full URL with protocol
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href;
    }
  } catch {
    // Not a valid URL with protocol, continue checking
  }

  // Check if it looks like a URL without protocol
  // Match patterns like: domain.com, subdomain.domain.com, localhost:3000, etc.
  const urlPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:[0-9]+)?(\/.*)?$|^localhost(:[0-9]+)?(\/.*)?$/;

  if (urlPattern.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return null;
}

export function useFuzzySearch(items: Item[], query: string): (Item | ScoredItem | WebSearchItem | UrlNavigateItem)[] {
  return useMemo(() => {
    if (!query.trim()) {
      return items;
    }

    const filtered = fuzzySearch(items, query.trim());

    // If no results found, check if it's a URL or add web search option
    if (filtered.length === 0 && query.trim()) {
      const validUrl = isValidUrl(query);

      if (validUrl) {
        return [
          {
            id: 'url-navigate',
            title: `Go to ${validUrl}`,
            icon: '🌐',
            type: 'url-navigate' as const,
            url: validUrl,
          },
        ];
      }

      return [
        {
          id: 'web-search',
          title: `Search the web for "${query.trim()}"`,
          icon: '🔍',
          type: 'web-search' as const,
          query: query.trim(),
        },
      ];
    }

    return filtered;
  }, [items, query]);
}
