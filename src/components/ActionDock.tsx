import { KeyboardEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ResultGlyph, ResultIconKind } from './ResultsList';

export interface ActionDockItem {
  id: string;
  label: string;
  icon: ResultIconKind;
  onSelect: () => void;
  /** The action continues in a dialog, such as choosing a window. */
  opensDialog?: boolean;
  danger?: boolean;
  /** Adds a small gap above the item to separate it from the previous group. */
  startsGroup?: boolean;
}

interface ActionDockProps {
  id: string;
  label: string;
  items: ActionDockItem[];
  focusFirstItem: boolean;
  onDismiss: () => void;
}

function ChevronGlyph() {
  return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5" /></svg>;
}

function menuItems(menu: HTMLElement | null): HTMLElement[] {
  return Array.from(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
}

function keepInView(menu: HTMLElement, item: HTMLElement): void {
  const menuBounds = menu.getBoundingClientRect();
  const itemBounds = item.getBoundingClientRect();
  if (itemBounds.top < menuBounds.top) {
    menu.scrollTop -= menuBounds.top - itemBounds.top;
  } else if (itemBounds.bottom > menuBounds.bottom) {
    menu.scrollTop += itemBounds.bottom - menuBounds.bottom;
  }
}

/**
 * Row actions docked to the lower-right corner of the Command Bar.
 * Keys follow the menu pattern: arrows, Home, End and first letters move focus; Enter runs the action.
 * The Command Bar owns Escape, outside clicks and focus restoration.
 */
export function ActionDock({ id, label, items, focusFirstItem, onDismiss }: ActionDockProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return normalizedQuery
      ? items.filter((item) => item.label.toLocaleLowerCase().includes(normalizedQuery))
      : items;
  }, [items, query]);

  useLayoutEffect(() => {
    // A pointer opens the menu without a highlighted item; the first arrow key picks one.
    const target = focusFirstItem ? menuItems(menuRef.current)[0] : menuRef.current;
    target?.focus({ preventScroll: true });
  }, [focusFirstItem]);

  function focusItem(item: HTMLElement | undefined): void {
    const menu = menuRef.current;
    if (!menu || !item) return;
    item.focus({ preventScroll: true });
    keepInView(menu, item);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const elements = menuItems(menuRef.current);
    if (event.key === 'Tab') {
      event.preventDefault();
      if (event.shiftKey) searchRef.current?.focus({ preventScroll: true });
      else onDismiss();
      return;
    }
    if (!elements.length) return;
    const current = elements.indexOf(event.target as HTMLElement);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const next = current < 0
        ? (step > 0 ? 0 : elements.length - 1)
        : (current + step + elements.length) % elements.length;
      focusItem(elements[next]);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusItem(event.key === 'Home' ? elements[0] : elements[elements.length - 1]);
      return;
    }
    if (event.key.length !== 1 || !event.key.trim() || event.metaKey || event.ctrlKey || event.altKey) return;

    const letter = event.key.toLocaleLowerCase();
    for (let offset = 1; offset <= elements.length; offset++) {
      const candidate = elements[(current + offset + elements.length) % elements.length];
      if (candidate.textContent?.trim().toLocaleLowerCase().startsWith(letter)) {
        event.preventDefault();
        focusItem(candidate);
        return;
      }
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
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
  }

  return (
    <div className="action-dock" onContextMenu={(event) => event.preventDefault()}>
      <div
        ref={menuRef}
        id={id}
        className="action-dock-menu"
        role="menu"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {filteredItems.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={`action-dock-item${item.danger ? ' is-danger' : ''}${item.startsGroup ? ' starts-group' : ''}`}
            aria-haspopup={item.opensDialog ? 'dialog' : undefined}
            onClick={item.onSelect}
          >
            <span className="action-dock-icon" aria-hidden="true"><ResultGlyph kind={item.icon} /></span>
            <span className="action-dock-label">{item.label}</span>
            {item.opensDialog && <span className="action-dock-chevron" aria-hidden="true"><ChevronGlyph /></span>}
          </button>
        ))}
        {!filteredItems.length && (
          <button type="button" role="menuitem" className="action-dock-item action-dock-empty" disabled>
            No matching actions
          </button>
        )}
      </div>
      <div className="action-dock-footer">
        <svg className="action-dock-search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>
        <input
          ref={searchRef}
          id={`${id}-search`}
          type="search"
          role="searchbox"
          aria-label="Search tab actions"
          placeholder="Search actions…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        <kbd>esc</kbd>
      </div>
    </div>
  );
}
