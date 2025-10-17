import { useState, useEffect } from 'react';
import { Bookmark } from '@/types';
import { extractBookmarks } from '@/utils/bookmarkExtractor';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBookmarks() {
      try {
        setLoading(true);
        const response = await chrome.runtime.sendMessage({ action: 'get-bookmarks' });

        if (response && response.bookmarks) {
          const extracted = extractBookmarks(response.bookmarks);
          setBookmarks(extracted);
        } else {
          setError('No bookmarks found');
        }
      } catch (err) {
        console.error('Error loading bookmarks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bookmarks');
      } finally {
        setLoading(false);
      }
    }

    loadBookmarks();
  }, []);

  return { bookmarks, loading, error };
}
