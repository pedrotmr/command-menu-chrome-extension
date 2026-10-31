import type { MouseEventHandler, PointerEventHandler } from 'react';
import type { ManagedTab } from '@/utils/tabItems';
import { optionId, tabHost, tabInitials } from '../helpers';
import { TabFavicon } from './TabFavicon';

interface TabCardDataProps {
  tab: ManagedTab;
  index: number;
  tabsCount: number;
}

interface TabCardStateProps {
  selected: boolean;
  currentTabId: number | null;
}

interface TabCardHandlerProps {
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onMouseDown: MouseEventHandler<HTMLDivElement>;
  onClick: MouseEventHandler<HTMLDivElement>;
}

interface TabCardProps extends TabCardDataProps, TabCardStateProps, TabCardHandlerProps {}

export function TabCard({
  tab,
  index,
  tabsCount,
  selected,
  currentTabId,
  onPointerMove,
  onMouseDown,
  onClick,
}: TabCardProps) {
  const tabId = tab.id;

  if (tabId === undefined) {
    return null;
  }

  const title = tab.customName || tab.title || tab.url || 'Untitled tab';
  const host = tabHost(tab);
  const accessibleLabel = [
    `${index + 1} of ${tabsCount}`,
    title,
    host,
    tabId === currentTabId ? 'current tab' : '',
    tab.pinned ? 'pinned' : '',
    tab.audible ? 'playing audio' : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      id={optionId(tabId)}
      className={`tab-card${selected ? ' is-selected' : ''}`}
      role="option"
      aria-label={accessibleLabel}
      aria-selected={selected}
      title={`${title}${host ? ` · ${host}` : ''}`}
      onPointerMove={onPointerMove}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div className="tab-card-preview" aria-hidden="true">
        {tab.previewDataUrl ? (
          <img className="tab-card-screenshot" src={tab.previewDataUrl} alt="" decoding="async" />
        ) : (
          <div className="tab-preview-fallback" aria-hidden="true">
            <span className="tab-preview-emblem">
              <span>{tabInitials(tab)}</span>
              {tab.favIconUrl && <TabFavicon key={tab.favIconUrl} src={tab.favIconUrl} />}
            </span>
            <span className="tab-preview-host">{host || 'Open tab'}</span>
          </div>
        )}
      </div>

      <div className="tab-card-label">
        <span className="tab-card-favicon" aria-hidden="true">
          <span>{tabInitials(tab)}</span>
          {tab.favIconUrl && <TabFavicon key={tab.favIconUrl} src={tab.favIconUrl} />}
        </span>
        <span className="tab-card-title">{title}</span>
        {tab.audible && (
          <span className="tab-card-status is-audible" aria-hidden="true" title="Playing audio">
            ♫
          </span>
        )}
        {tab.pinned && (
          <span className="tab-card-status" aria-hidden="true" title="Pinned">
            <svg viewBox="0 0 16 16" fill="none">
              <path
                d="M5.25 2.5h5.5M6.5 2.5v3.6l-2 2v1h7v-1l-2-2V2.5M8 9.1v4.4"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
