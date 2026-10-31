import { useLayoutEffect, useRef, useState } from 'react';
import { PaletteItem } from '@/types';
import { isTabInSplitView } from '@/utils/splitViews';
import { getSearchProvider, parseProviderQuery } from '@/utils/searchProviders';
import { ProviderIcon, providerAccentStyle } from './ProviderIcon';

export interface ResultsEmptyState {
  title: string;
  detail: string;
  providerId?: string;
  action?: { label: string; shortcut?: string; onActivate: () => void };
}

interface ResultsListProps {
  items: PaletteItem[];
  selectedIndex: number;
  keyboardNavigationVersion: number;
  query: string;
  providerSearchMode: boolean;
  mode: 'commands' | 'tabs';
  isBusy: boolean;
  loadingState?: { title: string; detail: string };
  emptyState?: ResultsEmptyState;
  isInitialList?: boolean;
  onItemClick: (index: number) => void;
  onItemHover: (index: number) => void;
  onItemContextMenu?: (index: number) => boolean;
  /** Rows that pass this check get a "more actions" button. */
  hasItemActions?: (item: PaletteItem) => boolean;
  onItemActions?: (index: number, fromKeyboard: boolean) => void;
  /** Index of the row whose actions menu is open. */
  openActionsIndex?: number;
  actionsMenuId?: string;
}

function domId(itemId: string): string {
  return `command-center-option-${itemId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function formatDisplayUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return value;
    const host = url.hostname.replace(/^www\./i, '');
    const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
    return `${host}${path}${url.search}${url.hash}`;
  } catch {
    return value;
  }
}

export function displayDetails(item: PaletteItem): string {
  if (item.type !== 'history') return '';
  const raw = item.subtitle ?? item.url;
  const formatted = raw.replace(/https?:\/\/[^\s·]+/gi, formatDisplayUrl);
  const normalize = (value: string) =>
    value
      .trim()
      .toLocaleLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  return normalize(formatted) === normalize(item.title) ? '' : formatted;
}

// Rows with an actions button need an explicit name; otherwise the button label joins the option name.
function optionLabel(item: PaletteItem, details: string, badge: string): string {
  const states = item.type === 'tab' ? [item.audible ? 'Playing audio' : ''] : [];
  return [item.title, details, ...states, badge].filter(Boolean).join(', ');
}

function itemBadge(item: PaletteItem): string {
  if (item.type === 'command') return item.category;
  if (item.type === 'tab') {
    if (item.current) return 'Current';
    if (item.pinned) return 'Pinned';
    if (isTabInSplitView(item)) return 'Split view';
    return 'Tab';
  }
  if (item.type === 'bookmark') return 'Bookmark';
  if (item.type === 'history') return 'History';
  if (item.type === 'url') return 'Website';
  return 'Search';
}

function HighlightedText({
  text,
  query,
  providerSearchMode,
}: {
  text: string;
  query: string;
  providerSearchMode: boolean;
}) {
  const searchTerm = providerSearchMode ? query : (parseProviderQuery(query)?.query ?? query);
  const terms = [...new Set(searchTerm.trim().split(/\s+/).filter(Boolean))];
  if (!terms.length) return <>{text}</>;

  const escapeRegExp = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const searchableTerms = new Set(terms.map((term) => term.toLocaleLowerCase()));
  return (
    <>
      {text
        .split(expression)
        .map((part, index) =>
          searchableTerms.has(part.toLocaleLowerCase()) ? <mark key={`${index}-${part}`}>{part}</mark> : part,
        )}
    </>
  );
}

export type ResultIconKind =
  | 'tab'
  | 'bookmark'
  | 'history'
  | 'search'
  | 'url'
  | 'reload'
  | 'settings'
  | 'command'
  | 'window'
  | 'group'
  | 'plus'
  | 'close'
  | 'copy'
  | 'download'
  | 'audio'
  | 'pin'
  | 'edit'
  | 'navigation'
  | 'extension'
  | 'privacy'
  | 'zoom'
  | 'keyboard'
  | 'split'
  | 'link'
  | 'web-store';

function resultIconKind(item: PaletteItem): ResultIconKind {
  if (item.type === 'tab') return 'tab';
  if (item.type === 'bookmark') return 'bookmark';
  if (item.type === 'history') return 'history';
  if (item.type === 'search') return 'search';
  if (item.type === 'url') return 'url';

  const id = item.id;
  if (id.includes('search')) return 'search';
  if (id.includes('history') || id.includes('reopen')) return 'history';
  if (id.includes('bookmark')) return 'bookmark';
  if (id.includes('reload') || id.includes('refresh')) return 'reload';
  if (id.includes('shortcuts')) return 'keyboard';
  if (id.includes('settings')) return 'settings';
  if (id === 'chrome-web-store') return 'web-store';
  if (id.includes('extensions')) return 'extension';
  if (id.includes('incognito')) return 'privacy';
  if (id.includes('zoom')) return 'zoom';
  if (id.includes('copy')) return 'copy';
  if (id.includes('download')) return 'download';
  if (id.includes('mute') || id.includes('audio')) return 'audio';
  if (id.includes('pin')) return 'pin';
  if (id.includes('rename')) return 'edit';
  if (id.includes('back') || id.includes('forward')) return 'navigation';
  if (id.includes('close')) return 'close';
  if (id.includes('group') || id.includes('split')) return 'group';
  if (id.includes('window') || id.includes('minimize') || id.includes('maximize')) return 'window';
  if (id.includes('new-tab')) return 'plus';
  if (item.category === 'Tabs') return 'tab';
  if (item.category === 'Groups') return 'group';
  return 'command';
}

export function ResultGlyph({ kind }: { kind: ResultIconKind }) {
  if (kind === 'web-store') {
    return (
      <svg viewBox="0 0 24 24" fill="#4285F4" aria-hidden="true">
        <path d="M0 1.637v19.09c0 .9.736 1.636 1.636 1.636h.131a10.4 10.4 0 0 1-.13-1.636 10.3 10.3 0 0 1 1.667-5.64l4.202 7.276h1.128A3.77 3.77 0 0 1 12 16.958a3.77 3.77 0 0 1 3.366 5.406h1.048a4.7 4.7 0 0 0-1.587-5.406h6.83a10.34 10.34 0 0 1 .577 5.406h.13c.9 0 1.636-.737 1.636-1.637V1.637Zm9.273 2.181h5.454a1.09 1.09 0 1 1 0 2.182H9.273a1.09 1.09 0 1 1 0-2.182M12 10.364a10.36 10.36 0 0 1 9.233 5.652H12a4.71 4.71 0 0 0-4.677 4.149L3.91 14.25A10.34 10.34 0 0 1 12 10.364" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'tab' && (
        <>
          <rect x="2.8" y="3.7" width="14.4" height="12.6" rx="2.1" />
          <path d="M3 7h14M6 5.3h.01M8.3 5.3h.01" />
        </>
      )}
      {kind === 'bookmark' && <path d="M5 3.2h10v13.6l-5-3.3-5 3.3V3.2Z" />}
      {kind === 'history' && (
        <>
          <path d="M4.1 7.1A6.3 6.3 0 1 1 3.7 11" />
          <path d="M3 4.3v3.6h3.6M10 6.2v4l2.8 1.6" />
        </>
      )}
      {kind === 'search' && (
        <>
          <circle cx="8.7" cy="8.7" r="5.3" />
          <path d="m12.6 12.6 4.1 4.1" />
        </>
      )}
      {kind === 'url' && (
        <>
          <path d="M11.5 3.8h4.7v4.7M16 4l-7.3 7.3" />
          <path d="M14.3 10.5v4.1a1.6 1.6 0 0 1-1.6 1.6H5.4a1.6 1.6 0 0 1-1.6-1.6V7.3a1.6 1.6 0 0 1 1.6-1.6h4.1" />
        </>
      )}
      {kind === 'reload' && (
        <>
          <path d="M16.3 8a6.5 6.5 0 0 0-11.2-2L3.7 7.5" />
          <path d="M3.7 3.7v3.8h3.8M3.7 12a6.5 6.5 0 0 0 11.2 2l1.4-1.5" />
          <path d="M16.3 16.3v-3.8h-3.8" />
        </>
      )}
      {kind === 'settings' && (
        <>
          <path d="m8 2.8 4 .1.5 2a5.4 5.4 0 0 1 1.3.8l2-.6 1.9 3.4-1.5 1.4v1.6l1.5 1.4-1.9 3.4-2-.6a5.4 5.4 0 0 1-1.3.8l-.5 2-4-.1-.5-2a5.4 5.4 0 0 1-1.3-.8l-2 .6-1.9-3.4 1.5-1.4v-1.6L2.3 8.4l1.9-3.4 2 .6a5.4 5.4 0 0 1 1.3-.8l.5-2Z" />
          <circle cx="10" cy="10" r="2.2" />
        </>
      )}
      {kind === 'window' && (
        <>
          <rect x="3" y="3.8" width="14" height="12.4" rx="2" />
          <path d="M3.2 7h13.6M6 5.4h.01M8.2 5.4h.01" />
        </>
      )}
      {kind === 'group' && (
        <>
          <rect x="3" y="3" width="5.5" height="5.5" rx="1.2" />
          <rect x="11.5" y="3" width="5.5" height="5.5" rx="1.2" />
          <rect x="3" y="11.5" width="5.5" height="5.5" rx="1.2" />
          <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.2" />
        </>
      )}
      {kind === 'plus' && (
        <>
          <path d="M10 4v12M4 10h12" />
        </>
      )}
      {kind === 'close' && (
        <>
          <path d="m5 5 10 10M15 5 5 15" />
        </>
      )}
      {kind === 'copy' && (
        <>
          <rect x="7" y="6.5" width="9" height="10" rx="1.7" />
          <path d="M12.5 6.5V5A1.5 1.5 0 0 0 11 3.5H5A1.5 1.5 0 0 0 3.5 5v8A1.5 1.5 0 0 0 5 14.5h2" />
        </>
      )}
      {kind === 'download' && (
        <>
          <path d="M10 3.5v9M6.5 9.5 10 13l3.5-3.5M4 16.5h12" />
        </>
      )}
      {kind === 'audio' && (
        <>
          <path d="M3.5 8v4h3l4 3.2V4.8l-4 3.2h-3Z" />
          <path d="M13.5 7a4.5 4.5 0 0 1 0 6M15.5 5a7.2 7.2 0 0 1 0 10" />
        </>
      )}
      {kind === 'pin' && (
        <>
          <path d="M7 3.5h6M8 3.5v4l-2.5 2.4v1.2h9v-1.2L12 7.5v-4M10 11.1v5.4" />
        </>
      )}
      {kind === 'edit' && (
        <>
          <path d="m4 13.5-.8 3.3 3.3-.8L16 7.5 12.5 4 4 12.5Z" />
          <path d="m10.8 5.7 3.5 3.5" />
        </>
      )}
      {kind === 'navigation' && (
        <>
          <path d="M6 4 3 7l3 3M3.5 7H12a4.5 4.5 0 0 1 0 9h-1" />
          <path d="m14 16 3-3-3-3" />
        </>
      )}
      {kind === 'extension' && (
        <>
          <path d="M4 3.5h4.2a2 2 0 1 0 3.8 0H16a1.5 1.5 0 0 1 1.5 1.5v3.2a2 2 0 1 0 0 3.6V16a1.5 1.5 0 0 1-1.5 1.5h-3.2a2 2 0 1 0-3.6 0H4A1.5 1.5 0 0 1 2.5 16V5A1.5 1.5 0 0 1 4 3.5Z" />
        </>
      )}
      {kind === 'privacy' && (
        <>
          <path d="M2.8 10s2.6-4.2 7.2-4.2 7.2 4.2 7.2 4.2-2.6 4.2-7.2 4.2S2.8 10 2.8 10Z" />
          <circle cx="10" cy="10" r="1.8" />
          <path d="m4 16 12-12" />
        </>
      )}
      {kind === 'zoom' && (
        <>
          <circle cx="8.4" cy="8.4" r="5" />
          <path d="m12.1 12.1 4.4 4.4M6.5 8.4h3.8M8.4 6.5v3.8" />
        </>
      )}
      {kind === 'keyboard' && (
        <>
          <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
          <path d="M5.5 8h.01M8.5 8h.01M11.5 8h.01M14.5 8h.01M6 11h.01M9 11h.01M12 11h2.5M7 13.5h6" />
        </>
      )}
      {kind === 'command' && (
        <>
          <path d="M10 2.8v4.1M10 13.1v4.1M2.8 10h4.1M13.1 10h4.1" />
          <path d="m6.1 6.1 2 2m3.8 3.8 2 2m0-7.8-2 2m-3.8 3.8-2 2" />
          <circle cx="10" cy="10" r="2.1" />
        </>
      )}
      {kind === 'split' && (
        <>
          <rect x="2.8" y="3.8" width="14.4" height="12.4" rx="2" />
          <path d="M10 3.8v12.4" />
        </>
      )}
      {kind === 'link' && (
        <>
          <rect x="2.6" y="10.3" width="9.6" height="4.4" rx="2.2" transform="rotate(-45 7.4 12.5)" />
          <rect x="7.8" y="5.3" width="9.6" height="4.4" rx="2.2" transform="rotate(-45 12.6 7.5)" />
        </>
      )}
    </svg>
  );
}

function MoreGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="3.5" cy="8" r="1.3" />
      <circle cx="8" cy="8" r="1.3" />
      <circle cx="12.5" cy="8" r="1.3" />
    </svg>
  );
}

function ItemIcon({ item }: { item: PaletteItem }) {
  const [failedFaviconUrl, setFailedFaviconUrl] = useState<string | null>(null);
  const kind = resultIconKind(item);
  if (item.type === 'search') {
    const providerId = item.id.replace(/^search-/, '');
    if (getSearchProvider(providerId)) return <ProviderIcon providerId={providerId} />;
  }
  if (item.type === 'tab' && item.favIconUrl) {
    const failed = failedFaviconUrl === item.favIconUrl;
    return (
      <span className={`favicon-wrap${failed ? ' is-fallback' : ''}`}>
        <img
          className="result-favicon"
          src={item.favIconUrl}
          alt=""
          loading="lazy"
          onError={() => setFailedFaviconUrl(item.favIconUrl!)}
          onLoad={() => setFailedFaviconUrl((failedUrl) => (failedUrl === item.favIconUrl ? null : failedUrl))}
        />
        <span className="favicon-fallback">
          <ResultGlyph kind="tab" />
        </span>
      </span>
    );
  }

  return (
    <span className="result-icon">
      <ResultGlyph kind={kind} />
    </span>
  );
}

export function ResultsList({
  items,
  selectedIndex,
  keyboardNavigationVersion,
  query,
  providerSearchMode,
  mode,
  isBusy,
  loadingState,
  emptyState,
  isInitialList = false,
  onItemClick,
  onItemHover,
  onItemContextMenu,
  hasItemActions,
  onItemActions,
  openActionsIndex,
  actionsMenuId,
}: ResultsListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !selected) return;

    const listBounds = list.getBoundingClientRect();
    const selectedBounds = selected.getBoundingClientRect();
    if (selectedBounds.top < listBounds.top) {
      list.scrollTop -= listBounds.top - selectedBounds.top;
    } else if (selectedBounds.bottom > listBounds.bottom) {
      list.scrollTop += selectedBounds.bottom - listBounds.bottom;
    }
  }, [items, keyboardNavigationVersion]);

  return (
    <>
      <div
        ref={listRef}
        id="command-center-results"
        className={`results-list${isInitialList ? ' is-opening-list' : ''}`}
        role="listbox"
        aria-label={mode === 'tabs' ? 'Open tabs' : 'Commands and search results'}
        aria-busy={isBusy}
      >
        {items.map((item, index) => {
          const selected = index === selectedIndex;
          const badge = itemBadge(item);
          const details = displayDetails(item);
          const hasActions = Boolean(onItemActions && hasItemActions?.(item));
          const actionsOpen = hasActions && index === openActionsIndex;

          return (
            <div
              key={item.id}
              id={domId(item.id)}
              className={`result-row${selected ? ' is-selected' : ''}${item.type === 'tab' && item.current ? ' is-active-tab' : ''}${hasActions ? ' has-actions' : ''}${actionsOpen ? ' is-actions-target' : ''}`}
              role="option"
              aria-selected={selected}
              aria-label={hasActions ? optionLabel(item, details, badge) : undefined}
              aria-description={item.type === 'bookmark' ? `Saved address: ${formatDisplayUrl(item.url)}` : undefined}
              title={item.type === 'bookmark' ? formatDisplayUrl(item.url) : undefined}
              onMouseEnter={() => onItemHover(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onItemClick(index)}
              onContextMenu={
                onItemContextMenu
                  ? (event) => {
                      if (onItemContextMenu(index)) event.preventDefault();
                    }
                  : undefined
              }
            >
              <span className="result-icon-wrap">
                <ItemIcon key={item.type === 'tab' ? (item.favIconUrl ?? item.id) : item.id} item={item} />
              </span>
              <span className="result-copy">
                <span className="result-title">
                  <HighlightedText text={item.title} query={query} providerSearchMode={providerSearchMode} />
                </span>
                {details && <span className="result-subtitle">{details}</span>}
              </span>
              {item.type === 'tab' && item.audible && (
                <>
                  <span className="tab-audible" aria-hidden="true">
                    ♫
                  </span>
                  <span className="visually-hidden">Playing audio</span>
                </>
              )}
              <span
                className={`result-badge${item.type === 'tab' && item.pinned && !item.current ? ' is-pinned' : ''}`}
                title={item.type === 'tab' ? badge : undefined}
              >
                {badge}
              </span>
              {hasActions && (
                <button
                  type="button"
                  className="result-actions-trigger"
                  // Only the selected row's button is a Tab stop; arrow keys still drive selection from the search field.
                  tabIndex={selected ? 0 : -1}
                  aria-label={`Actions for ${item.title}`}
                  aria-haspopup="menu"
                  aria-expanded={actionsOpen}
                  aria-controls={actionsOpen ? actionsMenuId : undefined}
                  onClick={(event) => {
                    event.stopPropagation();
                    // Keyboard activation reports detail 0; it moves focus to the first action.
                    onItemActions?.(index, event.detail === 0);
                  }}
                >
                  <MoreGlyph />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {items.length === 0 && isBusy && (
        <div className="empty-state is-loading" role="status" aria-live="polite">
          <span className="loading-indicator" aria-hidden="true" />
          <p>{loadingState?.title ?? 'Loading results…'}</p>
          <span>{loadingState?.detail ?? 'This should only take a moment.'}</span>
        </div>
      )}
      {items.length === 0 &&
        !isBusy &&
        (() => {
          const provider = emptyState?.providerId ? getSearchProvider(emptyState.providerId) : null;
          return (
            <div
              className={`empty-state${provider ? ' is-provider' : ''}`}
              style={provider ? providerAccentStyle(provider) : undefined}
            >
              {provider ? (
                <span className="empty-state-mark">
                  <ProviderIcon providerId={provider.id} />
                </span>
              ) : (
                <span className="empty-state-icon" aria-hidden="true">
                  <ResultGlyph kind="search" />
                </span>
              )}
              <div className="empty-state-copy" role="status">
                <p>{emptyState?.title ?? (mode === 'tabs' ? 'No matching tabs' : 'No matching commands or pages')}</p>
                <span>
                  {emptyState?.detail ??
                    (mode === 'tabs'
                      ? 'Try part of the tab name or website.'
                      : 'Try a shorter search or a provider prefix like “yt”.')}
                </span>
              </div>
              {emptyState?.action && (
                <button
                  type="button"
                  className="button-secondary empty-state-action"
                  onClick={emptyState.action.onActivate}
                >
                  {emptyState.action.label}
                  {emptyState.action.shortcut && <kbd aria-hidden="true">{emptyState.action.shortcut}</kbd>}
                </button>
              )}
            </div>
          );
        })()}
    </>
  );
}

export function resultDomId(itemId: string): string {
  return domId(itemId);
}
