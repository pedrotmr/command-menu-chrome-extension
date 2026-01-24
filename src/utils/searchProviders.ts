import { SearchProvider } from '@/types';

export const searchProviders: SearchProvider[] = [
  {
    name: 'ChatGPT',
    keywords: ['cha', 'chat', 'chatgpt', 'gp', 'gpt'],
    urlTemplate: 'https://chatgpt.com/?q=%s',
  },
  {
    name: 'YouTube',
    keywords: ['yt', 'yo', 'you', 'youtube'],
    urlTemplate: 'https://www.youtube.com/results?search_query=%s',
  },
  {
    name: 'Google',
    keywords: ['g', 'go', 'goo', 'google'],
    urlTemplate: 'https://www.google.com/search?q=%s',
  },
  {
    name: 'Perplexity',
    keywords: [
      'p',
      'pe',
      'per',
      'perp',
      'perpl',
      'perple',
      'perplex',
      'perplexi',
      'perplexit',
      'perplexity',
    ],
    urlTemplate: 'https://www.perplexity.ai/search?q=%s',
  },
  {
    name: 'Yahoo',
    keywords: ['y', 'ya', 'yah', 'yaho', 'yahoo'],
    urlTemplate: 'https://search.yahoo.com/search?p=%s',
  },
];