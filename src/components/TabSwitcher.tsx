import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { sendBackground } from '@/utils/chromeHelpers';
import { ManagedTab } from '@/utils/tabItems';
import { isTabSwitcherModifierKey, wasTabSwitcherModifierReleasedAfter } from '@/utils/tabSwitcherKeyRelease';

interface TabSwitcherProps {
  onClose: () => void;
  autoSwitchOnRelease?: boolean;
  openedAt?: number;
  modifierReleasedAtOpen?: boolean;
  surface?: 'popup' | 'overlay';
  cycleVersion?: number;
}

function optionId(tabId: number): string {
  return `recent-tab-${tabId}`;
}

function tabInitials(tab: ManagedTab): string {
  const title = tab.customName || tab.title || tab.url || 'Tab';
  return title.trim().slice(0, 1).toLocaleUpperCase();
}

function TabFavicon({ src }: { src: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = failedUrl === src;

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      hidden={failed}
      onError={() => setFailedUrl(src)}
      onLoad={() => setFailedUrl((previousUrl) => (previousUrl === src ? null : previousUrl))}
    />
  );
}

export function TabSwitcher({
  onClose,
  autoSwitchOnRelease = false,
  openedAt = 0,
  modifierReleasedAtOpen = false,
  surface = 'popup',
  cycleVersion = 0,
}: TabSwitcherProps) {
  const onCloseRef = useRef(onClose);
  const [tabs, setTabs] = useState<ManagedTab[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<HTMLParagraphElement>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const previousCycleVersion = useRef(cycleVersion);
  const cycleVersionRef = useRef(cycleVersion);
  const selectedTabRef = useRef<ManagedTab | undefined>(undefined);
  const currentTabIdRef = useRef<number | null>(null);
  const modifierReleasedRef = useRef(false);
  const autoActivationAttemptedRef = useRef(false);
  const activateAfterShortcutRef = useRef<(tab: ManagedTab | undefined) => void>(() => undefined);
  const activationInFlightRef = useRef(false);
  const windowIdRef = useRef<number | undefined>(undefined);
  const switcherShownRef = useRef(false);

  const selectedTab = tabs[selectedIndex];
  const activeDescendant = selectedTab?.id === undefined ? undefined : optionId(selectedTab.id);
  const stateMessage = message || (loading ? 'Loading recent tabs…' : 'No recent tabs are available.');
  const cardCount = Math.max(1, tabs.length);
  const panelWidth = cardCount * 278 + (cardCount - 1) * 7 + 22;
  const hasTabs = tabs.length > 0;

  useLayoutEffect(() => {
    (listboxRef.current ?? stateRef.current)?.focus({ preventScroll: true });
  }, [hasTabs]);

  useLayoutEffect(() => {
    selectedTabRef.current = selectedTab;
  }, [selectedTab]);

  useLayoutEffect(() => {
    cycleVersionRef.current = cycleVersion;
  }, [cycleVersion]);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    activateAfterShortcutRef.current = activateAfterShortcut;
  });

  useLayoutEffect(() => {
    if (!autoSwitchOnRelease) return;
    if (modifierReleasedAtOpen || wasTabSwitcherModifierReleasedAfter(openedAt)) {
      modifierReleasedRef.current = true;
    }
    const onKeyUp = (event: globalThis.KeyboardEvent) => {
      if (!isTabSwitcherModifierKey(event.key)) return;
      event.preventDefault();
      modifierReleasedRef.current = true;
      activateAfterShortcutRef.current(selectedTabRef.current);
    };
    window.addEventListener('keyup', onKeyUp, true);
    return () => window.removeEventListener('keyup', onKeyUp, true);
  }, [autoSwitchOnRelease, openedAt, modifierReleasedAtOpen]);

  useEffect(() => {
    let mounted = true;
    const handlePageHide = () => hideSwitcher();
    window.addEventListener('pagehide', handlePageHide);
    void Promise.all([
      sendBackground<ManagedTab[]>('tabs:recent'),
      sendBackground<chrome.tabs.Tab | null>('tabs:current'),
    ])
      .then(async ([recentTabs, current]) => {
        if (!mounted) return;
        const currentId = current?.id ?? null;
        setCurrentTabId(currentId);
        currentTabIdRef.current = currentId;
        windowIdRef.current = current?.windowId;
        switcherShownRef.current = true;
        const opened = await sendBackground<{ pendingCycles?: number }>('tabs:switcher-shown', {
          windowId: current?.windowId,
          surface,
        }).catch(() => ({ pendingCycles: 0 }));
        if (!mounted) {
          switcherShownRef.current = false;
          await sendBackground('tabs:switcher-hidden', { windowId: windowIdRef.current }).catch(() => undefined);
          return;
        }
        const previousTabIndex = recentTabs.findIndex((tab) => tab.id !== currentId);
        const firstIndex = previousTabIndex >= 0 ? previousTabIndex : 0;
        const pendingCycles =
          Math.max(0, Number(opened.pendingCycles ?? 0)) +
          Math.max(0, cycleVersionRef.current - previousCycleVersion.current);
        previousCycleVersion.current = cycleVersionRef.current;
        const nextIndex = recentTabs.length ? (firstIndex + pendingCycles) % recentTabs.length : 0;
        selectedTabRef.current = recentTabs[nextIndex];
        setTabs(recentTabs);
        setSelectedIndex(nextIndex);
        if (modifierReleasedRef.current) activateAfterShortcutRef.current(recentTabs[nextIndex]);
        void sendBackground<Record<number, string>>('tabs:recent-previews', {
          tabIds: recentTabs.flatMap((tab) => (tab.id === undefined ? [] : [tab.id])),
        })
          .then((previews) => {
            if (!mounted) return;
            setTabs((currentTabs) =>
              currentTabs.map((tab) => ({
                ...tab,
                previewDataUrl: tab.id === undefined ? undefined : previews[tab.id],
              })),
            );
          })
          .catch(() => undefined);
      })
      .catch((error: unknown) => {
        if (mounted) {
          console.error('Tab Switcher initialization failed.', error);
          setMessage('Could not load recent tabs. Close and reopen the switcher to try again.');
          hideSwitcher();
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      window.removeEventListener('pagehide', handlePageHide);
      hideSwitcher();
    };
  }, [surface]);

  useEffect(() => {
    if (cycleVersion === previousCycleVersion.current || tabs.length < 2) return;
    const cycles = cycleVersion - previousCycleVersion.current;
    previousCycleVersion.current = cycleVersion;
    const nextIndex = (((selectedIndex + cycles) % tabs.length) + tabs.length) % tabs.length;
    selectedTabRef.current = tabs[nextIndex];
    setSelectedIndex(nextIndex);
  }, [cycleVersion, selectedIndex, tabs]);

  const selectIndex = (index: number): void => {
    if (!tabs.length) return;
    setMessage('');
    const nextIndex = (index + tabs.length) % tabs.length;
    selectedTabRef.current = tabs[nextIndex];
    setSelectedIndex(nextIndex);
  };

  async function activate(tab: ManagedTab): Promise<boolean> {
    if (tab.id === undefined || activationInFlightRef.current) return false;
    activationInFlightRef.current = true;
    setMessage('');
    try {
      await sendBackground('tabs:activate', { tabId: tab.id, sourceTabId: currentTabIdRef.current });
      closeSwitcher();
      return true;
    } catch {
      activationInFlightRef.current = false;
      await refreshAfterFailedActivation();
      return false;
    }
  }

  function activateAfterShortcut(tab: ManagedTab | undefined): void {
    if (!autoSwitchOnRelease || autoActivationAttemptedRef.current || !tab || tab.id === undefined) return;
    autoActivationAttemptedRef.current = true;
    void activate(tab).then((activated) => {
      if (!activated) autoActivationAttemptedRef.current = false;
    });
  }

  async function refreshAfterFailedActivation(): Promise<void> {
    setMessage('That tab may have closed. Refreshing recent tabs.');
    try {
      const [recentTabs, current] = await Promise.all([
        sendBackground<ManagedTab[]>('tabs:recent'),
        sendBackground<chrome.tabs.Tab | null>('tabs:current'),
      ]);
      setTabs(recentTabs);
      setCurrentTabId(current?.id ?? null);
      currentTabIdRef.current = current?.id ?? null;
      const nextIndex = recentTabs.findIndex((tab) => tab.id !== current?.id);
      const resolvedIndex = nextIndex >= 0 ? nextIndex : 0;
      selectedTabRef.current = recentTabs[resolvedIndex];
      setSelectedIndex(resolvedIndex);
      setMessage(recentTabs.length ? 'Recent tabs updated. Choose a tab to switch.' : 'No recent tabs are available.');
    } catch {
      setMessage('Could not refresh recent tabs. Close and reopen the switcher to try again.');
    }
  }

  function closeSwitcher(): void {
    hideSwitcher();
    onCloseRef.current();
  }

  function hideSwitcher(): void {
    switcherShownRef.current = false;
    void sendBackground('tabs:switcher-hidden', { windowId: windowIdRef.current }).catch(() => undefined);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeSwitcher();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        selectIndex(selectedIndex + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        selectIndex(selectedIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        selectIndex(0);
        break;
      case 'End':
        event.preventDefault();
        selectIndex(tabs.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (selectedTab) void activate(selectedTab);
        break;
      case 'Tab':
        event.preventDefault();
        (listboxRef.current ?? stateRef.current)?.focus({ preventScroll: true });
        break;
    }
  }

  const listLabel = 'Most recently used tabs in this window';

  return (
    <div
      className="tab-switcher-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tab-switcher-title"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          (listboxRef.current ?? stateRef.current)?.focus({ preventScroll: true });
        }
      }}
    >
      <h1 className="visually-hidden" id="tab-switcher-title">
        Recent tabs
      </h1>
      {tabs.length ? (
        <div
          ref={listboxRef}
          className="tab-switcher-panel"
          role="listbox"
          aria-label={listLabel}
          aria-orientation="horizontal"
          aria-activedescendant={activeDescendant}
          tabIndex={0}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              event.preventDefault();
              listboxRef.current?.focus({ preventScroll: true });
            }
          }}
          style={
            {
              '--tab-switcher-panel-width': `${panelWidth}px`,
              gridTemplateColumns: `repeat(${cardCount}, minmax(0, 1fr))`,
            } as CSSProperties
          }
        >
          {tabs.map((tab, index) => {
            const tabId = tab.id;
            if (tabId === undefined) return null;
            const title = tab.customName || tab.title || tab.url || 'Untitled tab';
            const selected = index === selectedIndex;
            const host = (() => {
              try {
                return new URL(tab.url || '').hostname.replace(/^www\./, '');
              } catch {
                return '';
              }
            })();
            const accessibleLabel = [
              `${index + 1} of ${tabs.length}`,
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
                key={tabId}
                className={`tab-card${selected ? ' is-selected' : ''}`}
                role="option"
                aria-label={accessibleLabel}
                aria-selected={selected}
                title={`${title}${host ? ` · ${host}` : ''}`}
                onPointerMove={(event) => {
                  const previous = lastPointerRef.current;
                  lastPointerRef.current = { x: event.clientX, y: event.clientY };
                  if (!previous || Math.hypot(event.clientX - previous.x, event.clientY - previous.y) > 2) {
                    if (selectedIndex !== index) {
                      setMessage('');
                      selectedTabRef.current = tab;
                      setSelectedIndex(index);
                    }
                  }
                }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  void activate(tab);
                }}
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
          })}
        </div>
      ) : (
        <div
          className="tab-switcher-panel tab-switcher-empty-panel"
          role="presentation"
          style={{ width: 'min(320px, 88vw, calc(100vw - 48px))' }}
          onMouseDown={(event) => {
            event.preventDefault();
            stateRef.current?.focus({ preventScroll: true });
          }}
        >
          <p
            ref={stateRef}
            className="tab-switcher-state"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            tabIndex={0}
          >
            {stateMessage}
          </p>
        </div>
      )}
      {tabs.length > 0 && message && (
        <p className="tab-switcher-state" role="status" aria-live="polite" aria-atomic="true">
          {message}
        </p>
      )}
    </div>
  );
}
