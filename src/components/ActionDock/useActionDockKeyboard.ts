import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ActionDockItem } from './types';

interface UseActionDockKeyboardProps {
  items: ActionDockItem[];
  focusFirstItem: boolean;
  onDismiss: () => void;
}

const menuItems = (menu: HTMLElement | null): HTMLElement[] => {
  return Array.from(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
};

const keepInView = (menu: HTMLElement, item: HTMLElement): void => {
  const menuBounds = menu.getBoundingClientRect();
  const itemBounds = item.getBoundingClientRect();

  if (itemBounds.top < menuBounds.top) {
    menu.scrollTop -= menuBounds.top - itemBounds.top;
  } else if (itemBounds.bottom > menuBounds.bottom) {
    menu.scrollTop += itemBounds.bottom - menuBounds.bottom;
  }
};

export const useActionDockKeyboard = ({ items, focusFirstItem, onDismiss }: UseActionDockKeyboardProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return normalizedQuery ? items.filter((item) => item.label.toLocaleLowerCase().includes(normalizedQuery)) : items;
  }, [items, query]);

  const focusItem = (item: HTMLElement | undefined): void => {
    const menu = menuRef.current;

    if (!menu || !item) {
      return;
    }

    item.focus({ preventScroll: true });
    keepInView(menu, item);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const elements = menuItems(menuRef.current);

    if (event.key === 'Tab') {
      event.preventDefault();

      if (event.shiftKey) {
        searchRef.current?.focus({ preventScroll: true });
      } else {
        onDismiss();
      }

      return;
    }

    if (!elements.length) {
      return;
    }

    const current = elements.indexOf(event.target as HTMLElement);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;

      if (current < 0) {
        focusItem(step > 0 ? elements[0] : elements[elements.length - 1]);
        return;
      }

      const next = (current + step + elements.length) % elements.length;

      focusItem(elements[next]);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusItem(event.key === 'Home' ? elements[0] : elements[elements.length - 1]);
      return;
    }

    if (event.key.length !== 1 || !event.key.trim() || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const letter = event.key.toLocaleLowerCase();

    for (let offset = 1; offset <= elements.length; offset++) {
      const candidate = elements[(current + offset + elements.length) % elements.length];

      if (candidate.textContent?.trim().toLocaleLowerCase().startsWith(letter)) {
        event.preventDefault();
        focusItem(candidate);
        return;
      }
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    const elements = menuItems(menuRef.current);

    if (event.key === 'ArrowDown' && elements.length) {
      event.preventDefault();
      focusItem(elements[0]);
    } else if (event.key === 'ArrowUp' && elements.length) {
      event.preventDefault();
      focusItem(elements[elements.length - 1]);
    } else if (event.key === 'Enter' && elements.length) {
      event.preventDefault();
      elements[0].click();
    } else if (event.key === 'Tab') {
      event.preventDefault();

      if (event.shiftKey) {
        onDismiss();
      } else if (elements.length) {
        focusItem(elements[0]);
      } else {
        onDismiss();
      }
    }
  };

  useLayoutEffect(() => {
    // A pointer opens the menu without a highlighted item; the first arrow key picks one.
    const target = focusFirstItem ? menuItems(menuRef.current)[0] : menuRef.current;
    target?.focus({ preventScroll: true });
  }, [focusFirstItem]);

  return { menuRef, searchRef, query, setQuery, filteredItems, handleKeyDown, handleSearchKeyDown };
};
