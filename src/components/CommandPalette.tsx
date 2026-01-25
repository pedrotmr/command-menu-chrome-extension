import { useState, useMemo } from 'react';
import { Item, Command, Bookmark, HistoryItem, SearchProvider } from '@/types';
import { commands } from '@/utils/commands';
import { executeCommand } from '@/utils/chromeHelpers';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useHistory } from '@/hooks/useHistory';
import { useFuzzySearch } from '@/hooks/useFuzzySearch';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { SearchInput } from './SearchInput';
import { ResultsList } from './ResultsList';

interface CommandPaletteProps {
  onClose: () => void;
  isOpen: boolean;
}

export function CommandPalette({ onClose, isOpen }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeProvider, setActiveProvider] = useState<SearchProvider | null>(
    null
  );
  const { bookmarks, loading: bookmarksLoading } = useBookmarks();
  const { history, loading: historyLoading } = useHistory();

  const loading = bookmarksLoading || historyLoading;

  // Combine commands, bookmarks, and history
  const allItems: Item[] = useMemo(() => {
    // Deduplicate: if a URL exists in both bookmarks and history, keep the bookmark
    const bookmarkUrls = new Set(bookmarks.map((b) => b.url));
    const uniqueHistory = history.filter((h) => !bookmarkUrls.has(h.url));
    return [...commands, ...bookmarks, ...uniqueHistory];
  }, [bookmarks, history]);

  // Filter items based on search query
  const filteredItems: Item[] = useFuzzySearch(
    allItems,
    query,
    activeProvider
  ) as Item[];

  const handleSearch = async (
    searchProvider: SearchProvider,
    searchQuery: string
  ) => {
    if (!searchQuery) return;

    const searchUrl = searchProvider.urlTemplate.replace('%s', encodeURIComponent(searchQuery));

    try {
      await chrome.runtime.sendMessage({
        action: 'create-tab',
        url: searchUrl,
      });
    } catch (error) {
      console.error('Error creating tab:', error);
    }
    onClose();
  };

  // Execute selected item
  const executeSelected = async () => {
    if (filteredItems.length === 0) return;

    const selectedItem = filteredItems[selectedIndex];

    try {
      if (selectedItem.type === 'bookmark') {
        await chrome.runtime.sendMessage({
          action: 'create-tab',
          url: (selectedItem as Bookmark).url,
        });
      } else if (selectedItem.type === 'history') {
        await chrome.runtime.sendMessage({
          action: 'create-tab',
          url: (selectedItem as HistoryItem).url,
        });
      } else if (selectedItem.type === 'command') {
        await executeCommand(selectedItem as Command);
      } else if (selectedItem.type === 'url-navigate') {
        await chrome.runtime.sendMessage({
          action: 'create-tab',
          url: (selectedItem as any).url,
        });
      } else if (selectedItem.type === 'web-search') {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
          (selectedItem as any).query
        )}`;
        await chrome.runtime.sendMessage({
          action: 'create-tab',
          url: searchUrl,
        });
      }
    } catch (error) {
      console.error('Error executing item:', error);
    }

    onClose();
  };

  const handleEnter = () => {
    if (activeProvider) {
      handleSearch(activeProvider, query);
    } else {
      executeSelected();
    }
  };

  // Keyboard navigation
  const { selectedIndex, selectIndex } = useKeyboardNavigation({
    itemCount: filteredItems.length,
    onExecute: handleEnter,
    onClose,
    isOpen,
  });

  return (
    <div className="flex flex-col w-full h-full bg-transparent overflow-hidden">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={
          loading
            ? 'Loading...'
            : activeProvider
            ? `Search on ${activeProvider.name}`
            : 'Search commands, bookmarks, and history...'
        }
        autoFocus={isOpen}
        activeProvider={activeProvider}
        setActiveProvider={setActiveProvider}
      />
      <ResultsList
        items={filteredItems}
        selectedIndex={selectedIndex}
        onItemClick={(index) => {
          selectIndex(index);
          handleEnter();
        }}
      />
    </div>
  );
}