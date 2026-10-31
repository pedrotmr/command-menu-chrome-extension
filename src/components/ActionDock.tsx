import type { ActionDockItem } from './ActionDock/types';
import { ResultGlyph } from './results/ResultGlyph';
import { ChevronGlyph } from './ActionDock/ChevronGlyph';
import { useActionDockKeyboard } from './ActionDock/useActionDockKeyboard';

export type { ActionDockItem } from './ActionDock/types';

interface ActionDockProps {
  id: string;
  label: string;
  items: ActionDockItem[];
  focusFirstItem: boolean;
  onDismiss: () => void;
}

/**
 * Row actions docked to the lower-right corner of the Command Bar.
 * Keys follow the menu pattern: arrows, Home, End and first letters move focus; Enter runs the action.
 * The Command Bar owns Escape, outside clicks and focus restoration.
 */
export function ActionDock({ id, label, items, focusFirstItem, onDismiss }: ActionDockProps) {
  const { menuRef, searchRef, query, setQuery, filteredItems, handleKeyDown, handleSearchKeyDown } =
    useActionDockKeyboard({ items, focusFirstItem, onDismiss });

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
            <span className="action-dock-icon" aria-hidden="true">
              <ResultGlyph kind={item.icon} />
            </span>
            <span className="action-dock-label">{item.label}</span>
            {item.opensDialog && (
              <span className="action-dock-chevron" aria-hidden="true">
                <ChevronGlyph />
              </span>
            )}
          </button>
        ))}
        {!filteredItems.length && (
          <button type="button" role="menuitem" className="action-dock-item action-dock-empty" disabled>
            No matching actions
          </button>
        )}
      </div>
      <div className="action-dock-footer">
        <svg
          className="action-dock-search-icon"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="m10.5 10.5 3 3" />
        </svg>
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
