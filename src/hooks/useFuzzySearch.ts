import { useMemo } from 'react';
import { Item, ScoredItem, WebSearchItem, UrlNavigateItem } from '@/types';
import { fuzzySearch } from '@/utils/fuzzySearch';

/**
 * Maps chrome:// URL queries to actual Chrome internal pages
 */
function getChromeUrl(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  
  // Check if it starts with chrome://
  if (!trimmed.startsWith('chrome://')) {
    return null;
  }

  // Normalize the chrome:// URL
  let chromeUrl = trimmed;
  
  // Ensure it has proper format (chrome://page/)
  if (!chromeUrl.endsWith('/') && !chromeUrl.includes('?')) {
    chromeUrl = chromeUrl + '/';
  }

  // Map common chrome:// page names to their full URLs
  const chromePageMap: Record<string, string> = {
    'chrome://settings': 'chrome://settings/',
    'chrome://settings/': 'chrome://settings/',
    'chrome://extensions': 'chrome://extensions/',
    'chrome://extensions/': 'chrome://extensions/',
    'chrome://history': 'chrome://history/',
    'chrome://history/': 'chrome://history/',
    'chrome://downloads': 'chrome://downloads/',
    'chrome://downloads/': 'chrome://downloads/',
    'chrome://bookmarks': 'chrome://bookmarks/',
    'chrome://bookmarks/': 'chrome://bookmarks/',
    'chrome://flags': 'chrome://flags/',
    'chrome://flags/': 'chrome://flags/',
    'chrome://newtab': 'chrome://newtab/',
    'chrome://newtab/': 'chrome://newtab/',
    'chrome://new-tab-page': 'chrome://newtab/',
    'chrome://new-tab-page/': 'chrome://newtab/',
    'chrome://extensions/shortcuts': 'chrome://extensions/shortcuts',
    'chrome://extensions/shortcuts/': 'chrome://extensions/shortcuts',
  };

  // Check if it's a known mapped page
  if (chromePageMap[chromeUrl]) {
    return chromePageMap[chromeUrl];
  }

  // For other chrome:// URLs, try to use them as-is (Chrome will handle validation)
  // Ensure it's a valid chrome:// URL format
  const chromeUrlPattern = /^chrome:\/\/[a-z0-9-]+(\/[a-z0-9-]*)*(\?.*)?$/;
  if (chromeUrlPattern.test(chromeUrl)) {
    return chromeUrl;
  }

  // If it's just "chrome://" or invalid format, default to settings
  if (trimmed === 'chrome://' || trimmed === 'chrome:///') {
    return 'chrome://settings/';
  }

  return null;
}

function isValidUrl(input: string): string | null {
  const trimmed = input.trim();

  // Check for chrome:// URLs first
  const chromeUrl = getChromeUrl(trimmed);
  if (chromeUrl) {
    return chromeUrl;
  }

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

    const trimmedQuery = query.trim();
    
    // Check for chrome:// URLs first - always prioritize navigation over search
    const chromeUrl = getChromeUrl(trimmedQuery);
    if (chromeUrl) {
      return [
        {
          id: 'url-navigate',
          title: `Go to ${chromeUrl}`,
          icon: '⚙️',
          type: 'url-navigate' as const,
          url: chromeUrl,
        },
      ];
    }

    const filtered = fuzzySearch(items, trimmedQuery);

    // If no results found, check if it's a URL or add web search option
    if (filtered.length === 0 && trimmedQuery) {
      const validUrl = isValidUrl(trimmedQuery);

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
          title: `Search the web for "${trimmedQuery}"`,
          icon: '🔍',
          type: 'web-search' as const,
          query: trimmedQuery,
        },
      ];
    }

    return filtered;
  }, [items, query]);
}
