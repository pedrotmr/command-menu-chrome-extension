import { Bookmark } from '@/types';

export function extractBookmarks(
  bookmarkNodes: chrome.bookmarks.BookmarkTreeNode[],
  result: Bookmark[] = []
): Bookmark[] {
  for (const node of bookmarkNodes) {
    if (node.url) {
      result.push({
        id: node.id,
        title: node.title,
        url: node.url,
        icon: '🔖',
        type: 'bookmark',
      });
    }
    if (node.children) {
      extractBookmarks(node.children, result);
    }
  }
  return result;
}
