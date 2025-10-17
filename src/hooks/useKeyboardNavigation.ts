import { useState, useEffect, useCallback } from 'react';

interface UseKeyboardNavigationProps {
  itemCount: number;
  onExecute: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export function useKeyboardNavigation({
  itemCount,
  onExecute,
  onClose,
  isOpen,
}: UseKeyboardNavigationProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [itemCount]);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, itemCount - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          onExecute();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, itemCount, onExecute, onClose]);

  const selectIndex = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  return { selectedIndex, selectIndex };
}
