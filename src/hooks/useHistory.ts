import { useState, useEffect } from 'react';
import { HistoryItem } from '@/types';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const response = await chrome.runtime.sendMessage({ action: 'get-history' });

        if (response && response.history) {
          const historyItems: HistoryItem[] = response.history
            .filter((item: chrome.history.HistoryItem) => item.url && item.title)
            .map((item: chrome.history.HistoryItem) => ({
              id: `history-${item.id}`,
              title: item.title || item.url || '',
              url: item.url!,
              icon: '🕐',
              type: 'history' as const,
              lastVisitTime: item.lastVisitTime,
            }));
          setHistory(historyItems);
        } else {
          setError('No history found');
        }
      } catch (err) {
        console.error('Error loading history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  return { history, loading, error };
}
