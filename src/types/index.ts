export type ItemType = 'command' | 'bookmark' | 'web-search' | 'url-navigate';

export interface BaseItem {
  id: string;
  title: string;
  icon: string;
  type: ItemType;
}

export interface Command extends BaseItem {
  type: 'command';
}

export interface Bookmark extends BaseItem {
  type: 'bookmark';
  url: string;
}

export interface WebSearchItem extends BaseItem {
  type: 'web-search';
  query: string;
}

export interface UrlNavigateItem extends BaseItem {
  type: 'url-navigate';
  url: string;
}

export type Item = Command | Bookmark | WebSearchItem | UrlNavigateItem;

export type ScoredItem = (Command | Bookmark | WebSearchItem | UrlNavigateItem) & { score: number };

export interface ChromeMessage {
  action: string;
  [key: string]: any;
}

export interface ChromeResponse {
  success?: boolean;
  error?: string;
  bookmarks?: chrome.bookmarks.BookmarkTreeNode[];
  [key: string]: any;
}

export interface SearchProvider {
  name: string;
  keywords: string[];
  urlTemplate: string;
}
