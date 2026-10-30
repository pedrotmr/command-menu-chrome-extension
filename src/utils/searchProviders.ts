import { SearchItem } from '@/types';

export interface SearchProviderDefinition {
  id: string;
  name: string;
  prefix: string;
  aliases: string[];
  urlTemplate: string;
  hint: string;
  verb: 'Search' | 'Ask';
  // Brand tints for the provider chip, mark tile and empty state; each pair is used only behind or around the mark.
  accent: { light: string; dark: string };
}

// Providers open their public search/composer pages; this registry does not call private APIs or scrape results.
export const searchProviders: SearchProviderDefinition[] = [
  { id: 'google', name: 'Google', prefix: 'g', aliases: ['g', 'go', 'goo', 'google'], urlTemplate: 'https://www.google.com/search?q=%s', hint: 'Search the web', verb: 'Search', accent: { light: '#1a73e8', dark: '#8ab4f8' } },
  { id: 'youtube', name: 'YouTube', prefix: 'yt', aliases: ['yt', 'yo', 'you', 'youtube'], urlTemplate: 'https://www.youtube.com/results?search_query=%s', hint: 'Search videos', verb: 'Search', accent: { light: '#e0001e', dark: '#ff5c6c' } },
  { id: 'chatgpt', name: 'ChatGPT', prefix: 'ai', aliases: ['ai', 'cha', 'chat', 'chatgpt', 'gp', 'gpt'], urlTemplate: 'https://chatgpt.com/?q=%s', hint: 'Open ChatGPT with a question', verb: 'Ask', accent: { light: '#10a37f', dark: '#4fd1a8' } },
  { id: 'claude', name: 'Claude', prefix: 'cl', aliases: ['cl', 'claude'], urlTemplate: 'https://claude.ai/new?q=%s', hint: 'Open Claude with a question', verb: 'Ask', accent: { light: '#c8623f', dark: '#e98d6b' } },
  { id: 'perplexity', name: 'Perplexity', prefix: 'p', aliases: ['p', 'pe', 'per', 'perp', 'perpl', 'perple', 'perplex', 'perplexi', 'perplexit', 'perplexity'], urlTemplate: 'https://www.perplexity.ai/search?q=%s', hint: 'Get an answer with sources', verb: 'Ask', accent: { light: '#1b7f8c', dark: '#2fc1d3' } },
  { id: 'x', name: 'X', prefix: 'x', aliases: ['x', 'twitter'], urlTemplate: 'https://x.com/search?q=%s', hint: 'Search posts', verb: 'Search', accent: { light: '#0f1419', dark: '#e7e9ea' } },
  { id: 'yahoo', name: 'Yahoo', prefix: 'y', aliases: ['y', 'ya', 'yah', 'yaho', 'yahoo', 'yh'], urlTemplate: 'https://search.yahoo.com/search?p=%s', hint: 'Search Yahoo', verb: 'Search', accent: { light: '#6001d2', dark: '#b18cff' } },
];

export function getSearchProvider(id: string): SearchProviderDefinition | null {
  return searchProviders.find((provider) => provider.id === id) ?? null;
}

export function parseProviderQuery(input: string): { provider: SearchProviderDefinition; query: string } | null {
  const trimmed = input.trim();
  const separator = trimmed.search(/\s/);
  if (separator < 0) return null;

  const prefix = trimmed.slice(0, separator).toLowerCase();
  const query = trimmed.slice(separator).trim();
  if (!query) return null;

  const provider = searchProviders.find((candidate) => candidate.prefix === prefix);
  return provider ? { provider, query } : null;
}

export function findSearchProvider(alias: string): SearchProviderDefinition | null {
  const normalized = alias.trim().toLowerCase();
  if (!normalized) return null;
  return searchProviders.find((provider) => provider.aliases.includes(normalized)) ?? null;
}

export function createProviderSearchItem(provider: SearchProviderDefinition, query: string): SearchItem {
  const normalizedQuery = query.trim();
  return {
    id: `search-${provider.id}`,
    title: provider.verb === 'Ask'
      ? `Ask ${provider.name} “${normalizedQuery}”`
      : `Search ${provider.name} for “${normalizedQuery}”`,
    subtitle: provider.hint,
    icon: '↗',
    type: 'search',
    keywords: [provider.name, normalizedQuery],
    url: provider.urlTemplate.replace('%s', encodeURIComponent(normalizedQuery)),
  };
}
