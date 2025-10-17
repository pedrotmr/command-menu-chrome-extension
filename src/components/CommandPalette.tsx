import { useState, useMemo } from 'react';
import { Item, Command, Bookmark } from '@/types';
import { commands } from '@/utils/commands';
import { executeCommand } from '@/utils/chromeHelpers';
import { useBookmarks } from '@/hooks/useBookmarks';
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
  const { bookmarks, loading } = useBookmarks();

  // Combine commands and bookmarks
  const allItems: Item[] = useMemo(() => {
    return [...commands, ...bookmarks];
  }, [bookmarks]);

  // Filter items based on search query
  const filteredItems: Item[] = useFuzzySearch(allItems, query) as Item[];

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

  // Keyboard navigation
  const { selectedIndex, selectIndex } = useKeyboardNavigation({
    itemCount: filteredItems.length,
    onExecute: executeSelected,
    onClose,
    isOpen,
  });

  return (
    <div className="flex flex-col w-full h-full bg-transparent overflow-hidden">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={loading ? 'Loading bookmarks...' : 'Search commands and bookmarks...'}
        autoFocus={isOpen}
      />
      <ResultsList
        items={filteredItems}
        selectedIndex={selectedIndex}
        onItemClick={(index) => {
          selectIndex(index);
          executeSelected();
        }}
      />
    </div>
  );
}
