import { FormEvent, KeyboardEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BookmarkItem, CommandBarSize, CommandItem, HistoryItem, PaletteItem, ThemePreferences } from '@/types';
import { getCommands } from '@/utils/commands';
import { normalizeNavigationUrl, sendBackground } from '@/utils/chromeHelpers';
import { writeClipboardText } from '@/utils/clipboard';
import { searchItems, searchProviderItems } from '@/utils/fuzzySearch';
import { findSearchProvider, parseProviderQuery, SearchProviderDefinition } from '@/utils/searchProviders';
import { ResultsEmptyState, ResultsList, resultDomId } from './ResultsList';
import { ActionDock, ActionDockItem } from './ActionDock';
import { SettingsView } from './SettingsView';
import { ProviderIcon, providerAccentStyle } from './ProviderIcon';
import { applyTheme, cacheThemePreferences, normalizeThemePreferences } from '@/themes';
import { isTabInSplitView } from '@/utils/splitViews';
import { TAB_GROUP_ID_NONE } from '@/utils/chromeApiConstants';
import { initialCommandItems, ManagedTab, toTabItems } from '@/utils/tabItems';
import { markCommandPaletteEscape } from '@/utils/escapeEvents';

type FlowDialog =
  | { kind: 'rename'; tabId: number; initialName: string }
  | { kind: 'move'; tabId: number }
  | { kind: 'assign-group'; tabId: number }
  | { kind: 'group'; groupId: number | null; initialName: string; initialColor: string }
  | { kind: 'confirm-close'; action: string; count: number; title: string };
type ToastMessage = { message: string; tone: 'success' | 'error' };
type ActionDockState = { itemId: string; tabId: number; focusFirstItem: boolean };
type CommandPaletteMode = 'commands' | 'settings';
interface CommandPaletteProps {
  initialMode: CommandPaletteMode;
  initialTheme: ThemePreferences;
  surface?: 'popup' | 'overlay';
  onClose?: () => void;
  themeRoot?: HTMLElement;
  cacheThemeInLocalStorage?: boolean;
}

const groupColors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
const actionDockId = 'command-center-actions';
// Hidden row action buttons stay focusable with tabindex -1, so focus loops must skip them.
const tabbableSelector = [
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function BackGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 3.5 5.5 8l4.5 4.5" />
    </svg>
  );
}

function isTabActionsShortcut(event: KeyboardEvent<HTMLElement>): boolean {
  if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) return true;
  return event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
}

function recordTiming(name: string, durationMs: number): void {
  const host = window as Window & { __commandCenterTimings?: Array<{ name: string; durationMs: number; at: number }> };
  const metrics = host.__commandCenterTimings ?? (host.__commandCenterTimings = []);
  metrics.push({ name, durationMs, at: Date.now() });
  if (metrics.length > 100) metrics.splice(0, metrics.length - 100);
}

function resultPageSize(list: HTMLElement): number {
  const row = list.querySelector<HTMLElement>('.result-row');
  if (!row) return 1;
  const rowStyle = window.getComputedStyle(row);
  const listStyle = window.getComputedStyle(list);
  const margin = (Number.parseFloat(rowStyle.marginTop) || 0) + (Number.parseFloat(rowStyle.marginBottom) || 0);
  const padding = (Number.parseFloat(listStyle.paddingTop) || 0) + (Number.parseFloat(listStyle.paddingBottom) || 0);
  const rowPitch = row.getBoundingClientRect().height + margin;
  return Math.max(1, Math.floor((list.clientHeight - padding) / Math.max(1, rowPitch)));
}

function initialResultLimit(
  size: CommandBarSize,
  surface: 'popup' | 'overlay',
  viewport: { width: number; height: number },
): number {
  const overlayMaxHeights: Record<CommandBarSize, number> = { compact: 520, standard: 580, wide: 660 };
  const popupHeights: Record<CommandBarSize, number> = { compact: 520, standard: 560, wide: 600 };
  const panelHeight =
    surface === 'overlay'
      ? Math.min(overlayMaxHeights[size], viewport.height - (viewport.width <= 560 ? 24 : 48))
      : popupHeights[size];
  const panelBorder = surface === 'overlay' ? 2 : 0;
  const searchHeight = surface === 'overlay' ? 58 : 56;
  const listContentHeight = panelHeight - panelBorder - searchHeight - 20;
  const rowHeight = surface === 'overlay' ? 44 : 42;
  const rowPitch = rowHeight + 4;
  // Cap the unfiltered opening view at seven rows and leave one row of slack for smaller screens.
  return Math.max(1, Math.min(7, Math.floor(listContentHeight / rowPitch) - 1));
}

function flattenBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[], output: BookmarkItem[] = []): BookmarkItem[] {
  for (const node of nodes) {
    if (node.url) {
      output.push({
        id: `bookmark-${node.id}`,
        title: node.title || node.url,
        subtitle: node.url,
        icon: '☆',
        type: 'bookmark',
        url: node.url,
      });
    }
    if (node.children) flattenBookmarks(node.children, output);
  }
  return output;
}

function toHistoryItems(items: chrome.history.HistoryItem[]): HistoryItem[] {
  return items
    .filter((item) => Boolean(item.url && item.title))
    .map((item) => ({
      id: `history-${item.id}`,
      title: item.title || item.url || 'Visited page',
      subtitle: item.url,
      icon: '◷',
      type: 'history',
      url: item.url!,
      lastVisitTime: item.lastVisitTime,
    }));
}

export function CommandPalette({
  initialMode,
  initialTheme,
  surface = 'popup',
  onClose,
  themeRoot,
  cacheThemeInLocalStorage = true,
}: CommandPaletteProps) {
  const [mode, setMode] = useState<CommandPaletteMode>(initialMode);
  const [query, setQuery] = useState('');
  const [activeProvider, setActiveProvider] = useState<SearchProviderDefinition | null>(null);
  const providerOriginQuery = useRef('');
  const [tabs, setTabs] = useState<ManagedTab[]>([]);
  const [tabsReady, setTabsReady] = useState(false);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);
  const [currentWindowId, setCurrentWindowId] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [localDataLoading, setLocalDataLoading] = useState(false);
  const [localDataLoaded, setLocalDataLoaded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [keyboardNavigationVersion, setKeyboardNavigationVersion] = useState(0);
  const [permissions, setPermissions] = useState<Set<string>>(() => new Set());
  const [groups, setGroups] = useState<chrome.tabGroups.TabGroup[]>([]);
  const [windows, setWindows] = useState<chrome.windows.Window[]>([]);
  const [splitCapabilities, setSplitCapabilities] = useState({ create: false, unsplit: false });
  const [dialog, setDialog] = useState<FlowDialog | null>(null);
  const [actionDock, setActionDock] = useState<ActionDockState | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupColor, setGroupColor] = useState('blue');
  const [groupTargetId, setGroupTargetId] = useState('new');
  const [moveWindowId, setMoveWindowId] = useState('new');
  const [preferences, setPreferences] = useState(initialTheme);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [dialogError, setDialogError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const commandCenterRef = useRef<HTMLDivElement>(null);
  const settingsViewRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const moveWindowSelectRef = useRef<HTMLSelectElement>(null);
  const groupNameInputRef = useRef<HTMLInputElement>(null);
  const groupTargetSelectRef = useRef<HTMLSelectElement>(null);
  const closeConfirmationCancelRef = useRef<HTMLButtonElement>(null);
  const actionDockReturnFocus = useRef<HTMLElement | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastDismissRef = useRef<HTMLButtonElement>(null);
  const localDataRequest = useRef<Promise<void> | null>(null);
  const handoffPending = useRef(false);

  const restorePaletteFocus = useCallback(() => {
    requestAnimationFrame(() => {
      const focusTarget = mode === 'settings' ? settingsViewRef.current : inputRef.current;
      if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true });
    });
  }, [mode]);

  const notify = useCallback(
    (message: string, tone: ToastMessage['tone'] = 'error') => {
      setToast({ message, tone });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current =
        tone === 'success'
          ? setTimeout(() => {
              const restoreFocus = toastDismissRef.current?.matches(':focus') ?? false;
              setToast(null);
              toastTimer.current = null;
              if (restoreFocus) restorePaletteFocus();
            }, 4000)
          : null;
    },
    [restorePaletteFocus],
  );

  const loadLocalData = useCallback(async () => {
    if (localDataLoaded) return;
    if (localDataRequest.current) return localDataRequest.current;

    setLocalDataLoading(true);
    const request = Promise.all([
      sendBackground<chrome.bookmarks.BookmarkTreeNode[]>('bookmarks:list'),
      sendBackground<chrome.history.HistoryItem[]>('history:list'),
    ])
      .then(([bookmarkTree, historyEntries]) => {
        setBookmarks(flattenBookmarks(bookmarkTree));
        setHistory(toHistoryItems(historyEntries));
      })
      .catch(() => {
        notify('Could not load bookmarks and history. Commands and open tabs are still available.');
      })
      .finally(() => {
        localDataRequest.current = null;
        setLocalDataLoaded(true);
        setLocalDataLoading(false);
      });
    localDataRequest.current = request;
    return request;
  }, [localDataLoaded, notify]);

  const systemAppearance = useMemo(() => window.matchMedia('(prefers-color-scheme: dark)'), []);
  const [systemDark, setSystemDark] = useState(systemAppearance.matches);

  useLayoutEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const updateSystemAppearance = () => setSystemDark(systemAppearance.matches);
    systemAppearance.addEventListener('change', updateSystemAppearance);
    return () => systemAppearance.removeEventListener('change', updateSystemAppearance);
  }, [systemAppearance]);

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    applyTheme(preferences, systemDark, themeRoot);
    if (cacheThemeInLocalStorage) cacheThemePreferences(preferences);
  }, [preferences, systemDark, themeRoot, cacheThemeInLocalStorage]);

  const refreshTabs = async () => {
    const started = performance.now();
    const [nextTabs, currentTab, groupsAllowed, splitSupport] = await Promise.all([
      sendBackground<ManagedTab[]>('tabs:list'),
      sendBackground<chrome.tabs.Tab | null>('tabs:current'),
      sendBackground<boolean>('permissions:contains', { permissions: ['tabGroups'] }).catch(() => false),
      sendBackground<{ create: boolean; unsplit: boolean }>('browser:split-capabilities').catch(() => ({
        create: false,
        unsplit: false,
      })),
    ]);
    const currentId = currentTab?.id ?? null;
    let nextGroups: chrome.tabGroups.TabGroup[] = [];
    if (groupsAllowed) {
      nextGroups = await sendBackground<chrome.tabGroups.TabGroup[]>('groups:list').catch(() => []);
    }
    const groupById = new Map(nextGroups.map((group) => [group.id, group]));
    setTabs(
      nextTabs.map((tab) => {
        const group = groupById.get(tab.groupId);
        return {
          ...tab,
          groupTitle: group?.title,
          groupColor: group?.color,
        };
      }),
    );
    setCurrentTabId(currentId);
    setCurrentWindowId(currentTab?.windowId ?? null);
    setGroups(nextGroups);
    setSplitCapabilities(splitSupport);
    setTabsReady(true);
    recordTiming('tab-list', performance.now() - started);
  };

  useEffect(() => {
    performance.mark('cc:ui-mounted');
    const requestPermissions = async () => {
      try {
        const granted =
          surface === 'popup'
            ? await chrome.permissions.getAll()
            : await sendBackground<chrome.permissions.Permissions>('permissions:get-all');
        setPermissions(new Set(granted.permissions ?? []));
      } catch {
        setPermissions(new Set());
      }
    };
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        void refreshTabs().catch(() => notify('Could not update open tabs.'));
      }, 32);
    };
    void refreshTabs().catch(() => {
      setTabsReady(true);
      notify('Could not load open tabs.');
    });
    void requestPermissions();
    const handleRuntimeMessage = (message: { action?: string }) => {
      if (message.action === 'ui:tabs-changed') scheduleRefresh();
      if (message.action === 'ui:permissions-changed') {
        void sendBackground<chrome.permissions.Permissions>('permissions:get-all')
          .then((granted) => setPermissions(new Set(granted.permissions ?? [])))
          .catch(() => undefined);
      }
    };
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
    };
    // Popup lifetime is short; refreshTabs is intentionally captured once for these browser event listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== 'commands' || activeProvider || localDataLoaded || localDataRequest.current) return;
    if (!permissions.has('bookmarks') || !permissions.has('history')) return;
    void loadLocalData();
  }, [mode, query, activeProvider, localDataLoaded, permissions, loadLocalData]);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (dialog && dialogElement) {
      if (!dialogElement.open) dialogElement.showModal();
      requestAnimationFrame(() => {
        if (dialog.kind === 'move') moveWindowSelectRef.current?.focus();
        else if (dialog.kind === 'assign-group') groupTargetSelectRef.current?.focus();
        else if (dialog.kind === 'group') groupNameInputRef.current?.focus();
        else if (dialog.kind === 'confirm-close') closeConfirmationCancelRef.current?.focus();
        else renameInputRef.current?.focus();
      });
      return;
    }

    if (dialogElement?.open) dialogElement.close();
    requestAnimationFrame(() => {
      if (dialogRef.current?.open) return;
      const focusTarget = mode === 'settings' ? settingsViewRef.current : inputRef.current;
      if (focusTarget?.isConnected) focusTarget.focus({ preventScroll: true });
    });
  }, [dialog, mode]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === currentTabId) ?? null, [tabs, currentTabId]);
  const activeGroup = useMemo(
    () => (activeTab ? (groups.find((group) => group.id === activeTab.groupId) ?? null) : null),
    [activeTab, groups],
  );
  const tabCountInWindow = activeTab ? tabs.filter((tab) => tab.windowId === activeTab.windowId).length : 0;
  const tabsToRightCount = activeTab
    ? tabs.filter((tab) => tab.windowId === activeTab.windowId && tab.index > activeTab.index).length
    : 0;
  const activeGroupTabCount =
    activeTab?.groupId !== undefined && activeTab.groupId !== TAB_GROUP_ID_NONE
      ? tabs.filter((tab) => tab.groupId === activeTab.groupId).length
      : 0;
  const commands = useMemo(
    () =>
      getCommands({
        activeTab,
        activeGroup,
        tabCountInWindow,
        tabsToRightCount,
        activeGroupTabCount,
        canUnsplitTabs: splitCapabilities.unsplit,
      }),
    [activeTab, activeGroup, tabCountInWindow, tabsToRightCount, activeGroupTabCount, splitCapabilities.unsplit],
  );
  const tabItems = useMemo(
    () => toTabItems(tabs, currentTabId, currentWindowId),
    [tabs, currentTabId, currentWindowId],
  );
  const initialItems = useMemo(() => initialCommandItems(commands, tabItems), [commands, tabItems]);
  const uniqueHistory = useMemo(() => {
    const bookmarkedUrls = new Set(bookmarks.map((bookmark) => bookmark.url));
    return history.filter((item) => !bookmarkedUrls.has(item.url));
  }, [bookmarks, history]);
  const savedSearchPrompt = useMemo<CommandItem | null>(() => {
    const term = query.trim();
    if (!term || mode !== 'commands' || (permissions.has('bookmarks') && permissions.has('history'))) return null;
    return {
      id: 'search-saved-pages',
      title: `Search bookmarks and history for “${term}”`,
      description: 'Grant optional access to search saved pages and recent visits on this device.',
      subtitle: 'Requires optional bookmarks and history access',
      category: 'Saved pages',
      icon: '⌕',
      type: 'command',
      action: '',
      flow: 'saved-search',
      permission: { permissions: ['bookmarks', 'history'] },
      keywords: [term, 'bookmarks', 'history', 'saved pages'],
    };
  }, [mode, query, permissions]);
  const providerCandidate = useMemo(() => {
    const term = query.trim();
    if (mode !== 'commands' || activeProvider || parseProviderQuery(term)) return null;
    return findSearchProvider(term);
  }, [mode, query, activeProvider]);

  const sourceItems = useMemo<PaletteItem[]>(() => {
    if (mode === 'settings') return [];
    return [...commands, ...tabItems, ...bookmarks, ...uniqueHistory];
  }, [mode, commands, tabItems, bookmarks, uniqueHistory]);
  const isUnfilteredExpandedView =
    mode === 'commands' && preferences.windowMode === 'expanded' && !query.trim() && !activeProvider;
  const openingResultLimit = initialResultLimit(preferences.size, surface, viewport);

  const results = useMemo(() => {
    if (mode === 'commands' && preferences.windowMode === 'compact' && !query.trim() && !activeProvider) return [];
    if (mode === 'commands' && !query.trim() && !activeProvider && !tabsReady) return [];
    const start = performance.now();
    const allowFallback = !localDataLoading && !providerCandidate;
    const searchableItems = !query.trim() && mode === 'commands' ? initialItems : sourceItems;
    const found = activeProvider
      ? query.trim() && mode === 'commands'
        ? searchProviderItems(searchableItems, query, activeProvider, allowFallback)
        : []
      : searchItems(searchableItems, query, false, allowFallback);
    if (
      savedSearchPrompt &&
      !activeProvider &&
      !providerCandidate &&
      !parseProviderQuery(query) &&
      !normalizeNavigationUrl(query)
    ) {
      // Permission discovery must not take over the selected result or Enter action.
      found.push(savedSearchPrompt);
    }
    const visibleResults = isUnfilteredExpandedView ? found.slice(0, openingResultLimit) : found;
    const duration = performance.now() - start;
    if (mode !== 'settings' && query.trim()) {
      recordTiming('local-search', duration);
    }
    return visibleResults;
  }, [
    sourceItems,
    initialItems,
    query,
    mode,
    preferences.windowMode,
    openingResultLimit,
    isUnfilteredExpandedView,
    savedSearchPrompt,
    activeProvider,
    providerCandidate,
    localDataLoading,
    tabsReady,
  ]);

  useEffect(() => {
    setSelectedIndex((current) => Math.min(current, Math.max(0, results.length - 1)));
  }, [results.length]);

  const activeIndex = Math.min(selectedIndex, Math.max(0, results.length - 1));
  const isCompactEmpty =
    mode === 'commands' && preferences.windowMode === 'compact' && !query.trim() && !activeProvider;
  const isLoadingInitialTabs =
    mode === 'commands' && preferences.windowMode === 'expanded' && !query.trim() && !activeProvider && !tabsReady;
  const showResults = mode === 'commands' && !isCompactEmpty;
  const selectedItem = showResults ? results[activeIndex] : undefined;
  const selectedTab =
    selectedItem?.type === 'tab' ? (tabs.find((tab) => tab.id === selectedItem.tabId) ?? null) : activeTab;
  const assignmentWindowId =
    dialog?.kind === 'assign-group' ? tabs.find((tab) => tab.id === dialog.tabId)?.windowId : undefined;
  const groupChoices =
    assignmentWindowId === undefined ? [] : groups.filter((group) => group.windowId === assignmentWindowId);
  const actionDockIndex = actionDock ? results.findIndex((item) => item.id === actionDock.itemId) : -1;
  const actionDockTab = actionDock ? (tabs.find((tab) => tab.id === actionDock.tabId) ?? null) : null;

  useEffect(() => {
    if (!actionDock) return;
    if (!showResults || actionDockIndex < 0 || !actionDockTab) {
      closeActionDock();
      return;
    }
    // The row that opened the dock stays selected, even when a tab refresh reorders the results.
    if (selectedIndex !== actionDockIndex) setSelectedIndex(actionDockIndex);
  }, [actionDock, actionDockIndex, actionDockTab, selectedIndex, showResults]);

  function selectFromKeyboard(update: (index: number) => number): void {
    setSelectedIndex(update);
    setKeyboardNavigationVersion((version) => version + 1);
  }

  function dismissToast(restoreFocus = false): void {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = null;
    setToast(null);
    if (restoreFocus) restorePaletteFocus();
  }

  function changeMode(nextMode: CommandPaletteMode): void {
    setMode(nextMode);
    setQuery('');
    setActiveProvider(null);
    setSelectedIndex(0);
    requestAnimationFrame(() => {
      if (nextMode === 'settings') settingsViewRef.current?.focus({ preventScroll: true });
      else inputRef.current?.focus({ preventScroll: true });
    });
  }

  function closeSurface(): void {
    if (onClose) onClose();
    else window.close();
  }

  function handleSurfaceEscape(event: KeyboardEvent<HTMLElement>): void {
    if (event.key !== 'Escape' || dialog) return;
    markCommandPaletteEscape(event.nativeEvent);
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
    if (event.repeat) return;
    if (actionDock) {
      closeActionDock();
      return;
    }
    if (mode !== 'commands' || activeProvider || query.trim()) {
      changeMode('commands');
      return;
    }
    closeSurface();
  }

  async function ensurePermissions(
    required: NonNullable<chrome.permissions.Permissions['permissions']>,
  ): Promise<boolean> {
    const missing = required.filter((permission) => !permissions.has(permission));
    if (!missing.length) return true;

    try {
      if (surface === 'overlay') {
        await sendBackground<boolean>('permissions:open-request', { permissions: missing });
        notify('Approve access in the Command Menu window, then choose this command again.', 'success');
        return false;
      }
      const granted = await chrome.permissions.request({ permissions: missing });
      if (!granted) {
        const isSavedSearchPermission = missing.includes('bookmarks') || missing.includes('history');
        notify(
          isSavedSearchPermission
            ? 'Bookmarks and history access was declined. Commands and open tabs are still available.'
            : 'Permission declined. Other commands are still available.',
        );
        return false;
      }
      setPermissions((current) => new Set([...current, ...missing]));
      return true;
    } catch {
      notify('Chrome could not grant that permission.');
      return false;
    }
  }

  async function ensureCommandPermission(command: CommandItem): Promise<boolean> {
    return ensurePermissions(command.permission?.permissions ?? []);
  }

  async function executeCommand(command: CommandItem): Promise<void> {
    if (!(await ensureCommandPermission(command))) return;

    if (command.flow === 'settings') {
      changeMode('settings');
      return;
    }
    if (command.flow === 'saved-search') {
      await loadLocalData();
      return;
    }
    if (command.flow === 'confirm-close') {
      const count =
        command.id === 'close-other-tabs'
          ? Math.max(0, tabCountInWindow - 1)
          : command.id === 'close-right-tabs'
            ? tabsToRightCount
            : activeGroupTabCount;
      if (!count) return;

      const noun = count === 1 ? 'tab' : 'tabs';
      const title =
        command.id === 'close-other-tabs'
          ? `Close ${count} other ${noun}?`
          : command.id === 'close-right-tabs'
            ? `Close ${count} ${noun} to the right?`
            : `Close ${count} ${noun} in this group?`;
      dismissToast();
      setDialogError('');
      setDialog({ kind: 'confirm-close', action: command.action, count, title });
      return;
    }
    if (command.flow === 'rename-active' && activeTab?.id !== undefined) {
      openRename(activeTab);
      return;
    }
    if (command.flow === 'move-active' && activeTab?.id !== undefined) {
      openMove(activeTab);
      return;
    }
    if (command.flow === 'assign-group' && activeTab?.id !== undefined) {
      const currentGroups = await sendBackground<chrome.tabGroups.TabGroup[]>('groups:list').catch(() => []);
      setGroups(currentGroups);
      setGroupTargetId('new');
      setGroupName('');
      setGroupColor('blue');
      setDialog({ kind: 'assign-group', tabId: activeTab.id });
      return;
    }
    if (command.flow === 'group-active' && activeTab?.id !== undefined) {
      const currentGroups = permissions.has('tabGroups')
        ? groups
        : await sendBackground<chrome.tabGroups.TabGroup[]>('groups:list').catch(() => []);
      const group = currentGroups.find((candidate) => candidate.id === activeTab.groupId) ?? activeGroup;
      dismissToast();
      setDialogError('');
      setGroups(currentGroups);
      setDialog({
        kind: 'group',
        groupId: group?.id ?? null,
        initialName: group?.title ?? '',
        initialColor: group?.color ?? 'blue',
      });
      setGroupName(group?.title ?? '');
      setGroupColor(group?.color ?? 'blue');
      return;
    }

    try {
      if (command.id === 'toggle-tab-group' && activeGroup) {
        await sendBackground('groups:update', { groupId: activeGroup.id, collapsed: !activeGroup.collapsed });
        await refreshTabs();
        notify(activeGroup.collapsed ? 'Tab group expanded.' : 'Tab group collapsed.', 'success');
        return;
      }

      if (command.action === 'tabs:copy-url' || command.action === 'tabs:copy-title') {
        const value = await sendBackground<string>(command.action);
        if (!value) throw new Error('There is nothing to copy from the current tab.');
        await writeClipboardText(value);
        notify(command.action === 'tabs:copy-url' ? 'URL copied.' : 'Tab title copied.', 'success');
        return;
      }

      const started = performance.now();
      await sendBackground(command.action);
      recordTiming('browser-action', performance.now() - started);
      closeSurface();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The command failed.');
    }
  }

  async function executeItem(item: PaletteItem): Promise<void> {
    if (item.type === 'command') {
      await executeCommand(item);
      return;
    }
    if (item.type === 'tab') {
      const started = performance.now();
      try {
        await sendBackground('tabs:activate', { tabId: item.tabId, sourceTabId: currentTabId });
        recordTiming('tab-switch', performance.now() - started);
        closeSurface();
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Could not switch to that tab.');
      }
      return;
    }
    if ('url' in item) {
      // One handoff at a time: a second Enter or click must not open a duplicate tab while Chrome responds.
      if (handoffPending.current) return;
      handoffPending.current = true;
      try {
        const action =
          item.type === 'bookmark' || item.type === 'history' ? 'browser:open-saved-url' : 'browser:open-url';
        await sendBackground(action, { url: item.url });
        closeSurface();
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : item.type === 'search'
              ? 'Could not open that search.'
              : 'Could not open that page.',
        );
      } finally {
        handoffPending.current = false;
      }
    }
  }

  function activateProvider(provider: SearchProviderDefinition): void {
    providerOriginQuery.current = query;
    setActiveProvider(provider);
    setQuery('');
    setSelectedIndex(0);
    inputRef.current?.focus({ preventScroll: true });
  }

  function returnToCommandSearch(): void {
    setActiveProvider(null);
    setQuery(providerOriginQuery.current);
    setSelectedIndex(0);
    inputRef.current?.focus({ preventScroll: true });
  }

  function tabForResult(item: PaletteItem | undefined): ManagedTab | null {
    if (item?.type !== 'tab') return null;
    return tabs.find((tab) => tab.id === item.tabId) ?? null;
  }

  function openRename(tab: ManagedTab): void {
    if (tab.id === undefined) return;
    dismissToast();
    setDialogError('');
    setRenameValue(tab.customName ?? '');
    setDialog({ kind: 'rename', tabId: tab.id, initialName: tab.customName ?? '' });
  }

  function openActionDock(index: number, focusFirstItem: boolean): void {
    const item = results[index];
    const tab = tabForResult(item);
    if (!item || tab?.id === undefined) return;
    if (!actionDock) {
      // Closing returns focus to the opener: the row's actions button, or the search field.
      const commandCenter = commandCenterRef.current;
      const opener = (commandCenter?.getRootNode() as Document | ShadowRoot | undefined)?.activeElement;
      actionDockReturnFocus.current =
        opener instanceof HTMLElement && opener !== commandCenter && commandCenter?.contains(opener) ? opener : null;
    }
    dismissToast();
    setSelectedIndex(index);
    setActionDock({ itemId: item.id, tabId: tab.id, focusFirstItem });
  }

  function toggleActionDock(index: number, focusFirstItem: boolean): void {
    if (actionDock && results[index]?.id === actionDock.itemId) closeActionDock();
    else openActionDock(index, focusFirstItem);
  }

  function closeActionDock(restoreFocus = true): void {
    const opener = actionDockReturnFocus.current;
    actionDockReturnFocus.current = null;
    setActionDock(null);
    if (!restoreFocus) return;
    const focusTarget = opener?.isConnected ? opener : inputRef.current;
    focusTarget?.focus({ preventScroll: true });
  }

  function canSplitWithActiveTab(tab: ManagedTab): boolean {
    return Boolean(
      activeTab &&
      tab.id !== activeTab.id &&
      tab.windowId === activeTab.windowId &&
      tab.pinned === activeTab.pinned &&
      tab.groupId === activeTab.groupId &&
      !isTabInSplitView(tab) &&
      !isTabInSplitView(activeTab) &&
      Math.abs(tab.index - activeTab.index) === 1 &&
      splitCapabilities.create,
    );
  }

  function tabActionItems(tab: ManagedTab): ActionDockItem[] {
    // Each action closes the dock first; flows that continue in a dialog move focus there themselves.
    const run = (action: () => void | Promise<void>) => () => {
      closeActionDock();
      void action();
    };
    const items: ActionDockItem[] = [
      {
        id: 'move-window',
        label: 'Move to window',
        icon: 'window',
        opensDialog: true,
        onSelect: run(() => openMove(tab)),
      },
      {
        id: 'move-group',
        label: 'Move to tab group',
        icon: 'group',
        opensDialog: true,
        onSelect: run(() => openGroupAssignment(tab)),
      },
      { id: 'rename', label: 'Rename tab', icon: 'edit', opensDialog: true, onSelect: run(() => openRename(tab)) },
    ];
    if (canSplitWithActiveTab(tab)) {
      items.push({
        id: 'split',
        label: 'Split with current tab',
        icon: 'split',
        onSelect: run(() => splitWithActiveTab(tab)),
      });
    }
    items.push(
      {
        id: 'pin',
        label: tab.pinned ? 'Unpin tab' : 'Pin tab',
        icon: 'pin',
        startsGroup: true,
        onSelect: run(() => toggleSelectedPin(tab)),
      },
      {
        id: 'mute',
        label: tab.mutedInfo?.muted ? 'Unmute tab' : 'Mute tab',
        icon: 'audio',
        onSelect: run(() => toggleSelectedMute(tab)),
      },
      {
        id: 'copy-url',
        label: 'Copy URL',
        icon: 'link',
        startsGroup: true,
        onSelect: run(() => copyTabValue(tab, 'url')),
      },
      { id: 'copy-title', label: 'Copy title', icon: 'copy', onSelect: run(() => copyTabValue(tab, 'title')) },
      {
        id: 'close',
        label: 'Close tab',
        icon: 'close',
        danger: true,
        startsGroup: true,
        onSelect: run(() => closeTab(tab)),
      },
    );
    return items;
  }

  async function openMove(tab: ManagedTab): Promise<void> {
    if (tab.id === undefined) return;
    dismissToast();
    setDialogError('');
    try {
      const availableWindows = await sendBackground<chrome.windows.Window[]>('windows:list');
      setWindows(availableWindows.filter((item) => item.id !== tab.windowId && item.incognito === tab.incognito));
      setMoveWindowId('new');
      setDialog({ kind: 'move', tabId: tab.id });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not load browser windows.');
    }
  }

  async function openGroupAssignment(tab: ManagedTab): Promise<void> {
    if (tab.id === undefined || !(await ensurePermissions(['tabGroups']))) return;
    dismissToast();
    setDialogError('');
    const currentGroups = await sendBackground<chrome.tabGroups.TabGroup[]>('groups:list').catch(() => []);
    setGroups(currentGroups);
    setGroupTargetId('new');
    setGroupName('');
    setGroupColor('blue');
    setDialog({ kind: 'assign-group', tabId: tab.id });
  }

  async function closeDialog(): Promise<void> {
    if (dialogRef.current?.open) dialogRef.current.close();
    setDialog(null);
    setDialogError('');
  }

  async function submitDialog(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setDialogError('');
    if (!dialog) return;

    try {
      if (dialog.kind === 'confirm-close') {
        await sendBackground(dialog.action);
        closeSurface();
        return;
      }

      if (dialog.kind === 'rename') {
        await sendBackground('tabs:rename', { tabId: dialog.tabId, name: renameValue });
        await refreshTabs();
        await closeDialog();
        notify(renameValue.trim() ? 'Tab name saved.' : 'Custom tab name removed.', 'success');
        return;
      }

      if (dialog.kind === 'move') {
        if (moveWindowId === 'new') {
          await sendBackground('tabs:move-new-window', { tabId: dialog.tabId });
        } else {
          await sendBackground('tabs:move', { tabId: dialog.tabId, windowId: Number(moveWindowId) });
        }
        closeSurface();
        return;
      }

      if (dialog.kind === 'assign-group') {
        if (groupTargetId === 'new') {
          await sendBackground('groups:create', { tabId: dialog.tabId, title: groupName, color: groupColor });
        } else {
          await sendBackground('tabs:group', { tabId: dialog.tabId, groupId: Number(groupTargetId) });
        }
        await refreshTabs();
        await closeDialog();
        notify(groupTargetId === 'new' ? 'Tab group created.' : 'Tab moved to group.', 'success');
        return;
      }

      if (dialog.kind === 'group') {
        if (dialog.groupId === null) {
          await sendBackground('groups:create-current', { title: groupName, color: groupColor });
        } else {
          await sendBackground('groups:update', { groupId: dialog.groupId, title: groupName, color: groupColor });
        }
        await refreshTabs();
        await closeDialog();
        notify(dialog.groupId === null ? 'Tab group created.' : 'Tab group updated.', 'success');
      }
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : 'Could not complete that action.');
    }
  }

  async function toggleSelectedPin(tab: ManagedTab): Promise<void> {
    if (tab.id === undefined) return;
    try {
      await sendBackground('tabs:pin', { tabId: tab.id, pinned: !tab.pinned });
      await refreshTabs();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not change the pin state.');
    }
  }

  async function toggleSelectedMute(tab: ManagedTab): Promise<void> {
    if (tab.id === undefined) return;
    try {
      await sendBackground('tabs:mute', { tabId: tab.id, muted: !tab.mutedInfo?.muted });
      await refreshTabs();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not change the audio state.');
    }
  }

  async function copyTabValue(tab: ManagedTab, field: 'url' | 'title'): Promise<void> {
    if (tab.id === undefined) return;
    if (!(await ensurePermissions(['clipboardWrite']))) return;
    try {
      const value = await sendBackground<string>(`tabs:copy-${field}`, { tabId: tab.id });
      if (!value) throw new Error(`This tab has no ${field} to copy.`);
      await writeClipboardText(value);
      notify(field === 'url' ? 'Tab URL copied.' : 'Page title copied.', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not copy this value.');
    }
  }

  async function splitWithActiveTab(tab: ManagedTab): Promise<void> {
    if (tab.id === undefined) return;
    try {
      await sendBackground('tabs:split-active', { tabId: tab.id });
      closeSurface();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not create split view.');
    }
  }

  async function closeTab(tab: ManagedTab): Promise<void> {
    if (tab.id === undefined) return;
    try {
      await sendBackground('tabs:close', { tabId: tab.id });
      closeSurface();
    } catch {
      notify('Could not close that tab.');
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Tab' && !event.shiftKey && mode === 'commands' && !activeProvider) {
      const provider = findSearchProvider(query);
      if (provider) {
        event.preventDefault();
        activateProvider(provider);
        return;
      }
    }
    if (event.key === 'Backspace' && !query && activeProvider) {
      event.preventDefault();
      returnToCommandSearch();
      return;
    }
    if (event.key === 'Backspace' && (event.metaKey || event.ctrlKey) && query) {
      event.preventDefault();
      setQuery('');
      setSelectedIndex(0);
      return;
    }
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      selectFromKeyboard((index) => Math.min(index + 1, results.length - 1));
      return;
    }
    if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      selectFromKeyboard((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter' && selectedItem) {
      event.preventDefault();
      void executeItem(selectedItem);
      return;
    }
    if (event.key === 'Enter' && providerCandidate) {
      event.preventDefault();
      activateProvider(providerCandidate);
    }
  }

  function handlePaletteKeyDown(event: KeyboardEvent<HTMLElement>): void {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
    if (dialog) {
      if (event.key === 'Tab') {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(tabbableSelector) ?? []).filter(
          (element) => element.getClientRects().length > 0,
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && event.target === first && last) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && event.target === last && first) {
          event.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (actionDock) {
      // The dock handles its own navigation; the actions shortcut closes it again.
      if (isTabActionsShortcut(event)) {
        event.preventDefault();
        closeActionDock();
      }
      return;
    }
    if (mode === 'settings' && event.key === 'Tab' && event.shiftKey && event.target === settingsViewRef.current) {
      const focusable = Array.from(
        commandCenterRef.current?.querySelectorAll<HTMLElement>(tabbableSelector) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const last = focusable[focusable.length - 1];
      if (last) {
        event.preventDefault();
        last.focus();
      }
      return;
    }
    if (surface === 'overlay' && event.key === 'Tab') {
      const focusable = Array.from(
        commandCenterRef.current?.querySelectorAll<HTMLElement>(tabbableSelector) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && event.target === first && last) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && event.target === last && first) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.key === 'F2' && selectedItem?.type === 'tab' && selectedTab) {
      event.preventDefault();
      openRename(selectedTab);
      return;
    }
    if (isTabActionsShortcut(event) && selectedItem?.type === 'tab' && selectedTab) {
      event.preventDefault();
      openActionDock(activeIndex, true);
      return;
    }
    if (
      (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
      results.length &&
      event.target instanceof Element &&
      event.target.closest('.result-actions-trigger')
    ) {
      // From a row's actions button, arrows go back to moving the selection from the search field.
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      selectFromKeyboard((index) => Math.max(0, Math.min(index + step, results.length - 1)));
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    if ((event.key === 'PageDown' || event.key === 'PageUp') && mode !== 'settings' && results.length) {
      event.preventDefault();
      const resultsList = commandCenterRef.current?.querySelector<HTMLElement>('.results-list');
      if (resultsList) {
        const pageSize = resultPageSize(resultsList);
        const direction = event.key === 'PageDown' ? 1 : -1;
        selectFromKeyboard((index) => Math.max(0, Math.min(index + direction * pageSize, results.length - 1)));
      }
    }
  }

  function handleThemeChange(next: ThemePreferences): void {
    const normalized = normalizeThemePreferences(next);
    setPreferences(normalized);
    if (cacheThemeInLocalStorage) cacheThemePreferences(normalized);
    applyTheme(normalized, systemDark, themeRoot);
    void chrome.storage.local.set({ themePreferences: normalized }).catch(() => {
      notify('Could not save your appearance preference.');
    });
  }

  const emptyState: ResultsEmptyState | undefined = providerCandidate
    ? {
        title: `${providerCandidate.verb} ${providerCandidate.name}`,
        detail: `Press Tab or Enter to ${providerCandidate.verb.toLowerCase()} ${providerCandidate.name}.`,
        providerId: providerCandidate.id,
      }
    : activeProvider && !query.trim()
      ? {
          title: `${activeProvider.verb} ${activeProvider.name}`,
          detail: `Type ${activeProvider.verb === 'Ask' ? 'a question' : 'what to search for'}, then press Enter. ${activeProvider.name} opens in a new tab.`,
          providerId: activeProvider.id,
        }
      : undefined;
  const resultCountText = `${results.length} ${results.length === 1 ? 'result' : 'results'}`;
  const liveStatusText =
    toast?.message ??
    (mode === 'settings'
      ? ''
      : localDataLoading
        ? 'Searching saved pages and recent history.'
        : results.length
          ? resultCountText
          : '');

  return (
    <div
      ref={commandCenterRef}
      className={`command-center${surface === 'overlay' ? ' is-overlay-surface' : ''}${isCompactEmpty ? ' is-compact-empty' : ''}${isUnfilteredExpandedView ? ' is-initial-expanded-view' : ''}${actionDock ? ' has-action-dock' : ''}`}
      role={surface === 'overlay' ? 'dialog' : undefined}
      aria-modal={surface === 'overlay' ? true : undefined}
      aria-label="Command Bar"
      tabIndex={-1}
      onKeyDownCapture={handleSurfaceEscape}
      onKeyDown={handlePaletteKeyDown}
      onMouseDown={(event) => {
        if (dialog) return;
        const target = event.target;
        if (actionDock && target instanceof Element) {
          // Inside the dock, keep focus on its actions. A row click closes the dock on click instead of running the row.
          if (target.closest('.action-dock')) {
            if (!target.closest('button, input, select, textarea, [tabindex]:not([tabindex="-1"])'))
              event.preventDefault();
            return;
          }
          if (target.closest('.result-row')) {
            event.preventDefault();
            return;
          }
          closeActionDock(false);
        }
        if (
          target instanceof Element &&
          target.closest('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
        )
          return;
        event.preventDefault();
        if (mode === 'settings') settingsViewRef.current?.focus({ preventScroll: true });
        else inputRef.current?.focus({ preventScroll: true });
      }}
    >
      <h1 className="visually-hidden">Command Bar</h1>
      {mode === 'settings' ? (
        <SettingsView
          preferences={preferences}
          onChange={handleThemeChange}
          onBack={() => changeMode('commands')}
          viewRef={(node) => {
            settingsViewRef.current = node;
          }}
          onManageShortcuts={() => {
            void sendBackground('browser:open-shortcuts')
              .then(closeSurface)
              .catch((error) => notify(error instanceof Error ? error.message : 'Could not open keyboard shortcuts.'));
          }}
        />
      ) : (
        <>
          <div className="search-area">
            <span className="search-symbol" aria-hidden="true">
              {activeProvider ? (
                <ProviderIcon providerId={activeProvider.id} />
              ) : (
                <svg viewBox="0 0 20 20" fill="none">
                  <circle cx="8.8" cy="8.8" r="5.7" stroke="currentColor" strokeWidth="1.6" />
                  <path d="m13.1 13.1 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              )}
            </span>
            <label className="visually-hidden" htmlFor="command-center-search">
              {activeProvider
                ? `${activeProvider.verb} ${activeProvider.name}`
                : 'Search commands, tabs, bookmarks, history, and the web'}
            </label>
            {activeProvider && (
              <span className="provider-chip" style={providerAccentStyle(activeProvider)}>
                <span>{activeProvider.name}</span>
                <button
                  type="button"
                  aria-label="Back to command search"
                  title="Back to command search"
                  onClick={returnToCommandSearch}
                >
                  <BackGlyph />
                </button>
              </span>
            )}
            <input
              ref={inputRef}
              id="command-center-search"
              className="search-input"
              name="command-query"
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={
                activeProvider ? `${activeProvider.verb} ${activeProvider.name}…` : 'Search commands or a website'
              }
              role="combobox"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-expanded={showResults && results.length > 0}
              aria-controls={showResults ? 'command-center-results' : undefined}
              aria-activedescendant={selectedItem ? resultDomId(selectedItem.id) : undefined}
              aria-describedby={
                [
                  providerCandidate ? 'provider-tab-hint' : '',
                  selectedItem?.type === 'tab' && selectedTab ? 'tab-actions-hint' : '',
                ]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              autoComplete="off"
              spellCheck={false}
            />
            <span id="tab-actions-hint" className="visually-hidden">
              F2 renames the selected tab. Shift F10, the Context Menu key, or Command/Control K opens tab actions.
            </span>
            {providerCandidate && (
              <span id="provider-tab-hint" className="visually-hidden">
                Press Tab to {providerCandidate.verb.toLowerCase()} {providerCandidate.name}.
              </span>
            )}
            <div className="mode-nav" role="group" aria-label="Command Bar controls">
              {providerCandidate && (
                <button
                  type="button"
                  className="provider-hint"
                  aria-label={`${providerCandidate.verb} ${providerCandidate.name}`}
                  onClick={() => activateProvider(providerCandidate)}
                >
                  <ProviderIcon providerId={providerCandidate.id} className="provider-hint-icon" />
                  <kbd aria-hidden="true">Tab</kbd>
                  <span>
                    {providerCandidate.verb} {providerCandidate.name}
                  </span>
                </button>
              )}
              <button
                type="button"
                aria-label="Appearance settings"
                className="mode-icon-button"
                onClick={() => changeMode('settings')}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M3 5.5h5M11.5 5.5H17M3 10h2M8.5 10H17M3 14.5h8M14.5 14.5H17" />
                  <circle cx="10" cy="5.5" r="1.5" />
                  <circle cx="7" cy="10" r="1.5" />
                  <circle cx="13" cy="14.5" r="1.5" />
                </svg>
              </button>
            </div>
          </div>

          {showResults && (
            <div className="results-region">
              <ResultsList
                items={results}
                selectedIndex={activeIndex}
                keyboardNavigationVersion={keyboardNavigationVersion}
                query={query}
                providerSearchMode={Boolean(activeProvider)}
                mode="commands"
                isBusy={localDataLoading || isLoadingInitialTabs}
                loadingState={
                  isLoadingInitialTabs
                    ? { title: 'Loading your tabs', detail: 'Putting pinned tabs first.' }
                    : { title: 'Searching saved pages', detail: 'Checking bookmarks and recent history.' }
                }
                emptyState={emptyState}
                isInitialList={isUnfilteredExpandedView}
                onItemClick={(index) => {
                  // With the dock open, the first click on a row only closes the dock.
                  if (actionDock) {
                    closeActionDock();
                    return;
                  }
                  setSelectedIndex(index);
                  void executeItem(results[index]);
                }}
                onItemHover={(index) => {
                  if (!actionDock) setSelectedIndex(index);
                }}
                onItemContextMenu={(index) => {
                  if (!tabForResult(results[index])) return false;
                  openActionDock(index, false);
                  return true;
                }}
                hasItemActions={(item) => item.type === 'tab'}
                onItemActions={toggleActionDock}
                openActionsIndex={actionDock ? actionDockIndex : undefined}
                actionsMenuId={actionDockId}
              />
              {actionDock && actionDockTab && actionDockIndex >= 0 && (
                <ActionDock
                  key={actionDock.itemId}
                  id={actionDockId}
                  label={`Actions for ${results[actionDockIndex].title}`}
                  items={tabActionItems(actionDockTab)}
                  focusFirstItem={actionDock.focusFirstItem}
                  onDismiss={() => closeActionDock()}
                />
              )}
            </div>
          )}
        </>
      )}

      <dialog
        ref={dialogRef}
        className="flow-dialog"
        aria-labelledby="flow-dialog-title"
        aria-describedby="flow-dialog-description"
        onCancel={(event) => {
          event.preventDefault();
          void closeDialog();
        }}
      >
        {dialog && (
          <form
            onSubmit={(event) => {
              void submitDialog(event);
            }}
          >
            <div className="dialog-heading">
              <p className="eyebrow">
                {dialog.kind === 'rename'
                  ? 'Tab'
                  : dialog.kind === 'move'
                    ? 'Window'
                    : dialog.kind === 'confirm-close'
                      ? 'Confirm'
                      : 'Tab group'}
              </p>
              <h2 id="flow-dialog-title">
                {dialog.kind === 'confirm-close'
                  ? dialog.title
                  : dialog.kind === 'rename'
                    ? 'Rename tab'
                    : dialog.kind === 'move'
                      ? 'Move tab'
                      : dialog.kind === 'assign-group'
                        ? 'Move tab to group'
                        : dialog.groupId === null
                          ? 'Create tab group'
                          : 'Edit tab group'}
              </h2>
              <p id="flow-dialog-description">
                {dialog.kind === 'confirm-close'
                  ? 'These tabs will close. You can find the pages again in Chrome History.'
                  : dialog.kind === 'rename'
                    ? 'This name is stored by the extension. The website title stays unchanged.'
                    : dialog.kind === 'move'
                      ? 'Choose a destination window for this tab.'
                      : dialog.kind === 'assign-group'
                        ? 'Add this tab to an existing group or create a new one.'
                        : 'Choose a name and color for this group.'}
              </p>
            </div>

            <p
              className={`dialog-notice${dialogError ? ' is-visible' : ''}`}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {dialogError}
            </p>

            {dialog.kind === 'rename' && (
              <div className="field-group">
                <label htmlFor="rename-tab-input">Custom tab name</label>
                <input
                  ref={renameInputRef}
                  id="rename-tab-input"
                  name="custom-tab-name"
                  autoComplete="off"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  maxLength={120}
                  placeholder="e.g. Sprint planning"
                />
                <span className="field-help">Leave it empty to restore the page title.</span>
              </div>
            )}

            {dialog.kind === 'move' && (
              <div className="field-group">
                <label htmlFor="move-window-select">Destination</label>
                <select
                  ref={moveWindowSelectRef}
                  id="move-window-select"
                  name="destination-window"
                  value={moveWindowId}
                  onChange={(event) => setMoveWindowId(event.target.value)}
                >
                  <option value="new">New window</option>
                  {windows.map((browserWindow, index) => {
                    const label = browserWindow.tabs?.find((tab) => tab.active)?.title;
                    return (
                      <option key={browserWindow.id} value={browserWindow.id}>
                        {label ? `Window · ${label}` : `Window ${index + 1}`}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {dialog.kind === 'group' && (
              <>
                <div className="field-group">
                  <label htmlFor="tab-group-name">Group name</label>
                  <input
                    ref={groupNameInputRef}
                    id="tab-group-name"
                    name="tab-group-name"
                    autoComplete="off"
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    maxLength={80}
                    placeholder="e.g. Research"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="tab-group-color">Group color</label>
                  <select
                    id="tab-group-color"
                    name="tab-group-color"
                    value={groupColor}
                    onChange={(event) => setGroupColor(event.target.value)}
                  >
                    {groupColors.map((color) => (
                      <option key={color} value={color}>
                        {color[0].toUpperCase() + color.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {dialog.kind === 'assign-group' && (
              <>
                <div className="field-group">
                  <label htmlFor="tab-group-target">Destination group</label>
                  <select
                    ref={groupTargetSelectRef}
                    id="tab-group-target"
                    name="tab-group-target"
                    value={groupTargetId}
                    onChange={(event) => setGroupTargetId(event.target.value)}
                  >
                    <option value="new">Create a new group</option>
                    {groupChoices.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.title || 'Unnamed group'}
                      </option>
                    ))}
                  </select>
                </div>
                {groupTargetId === 'new' && (
                  <>
                    <div className="field-group">
                      <label htmlFor="new-tab-group-name">Group name</label>
                      <input
                        ref={groupNameInputRef}
                        id="new-tab-group-name"
                        name="new-tab-group-name"
                        autoComplete="off"
                        value={groupName}
                        onChange={(event) => setGroupName(event.target.value)}
                        maxLength={80}
                        placeholder="e.g. Research"
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="new-tab-group-color">Group color</label>
                      <select
                        id="new-tab-group-color"
                        name="new-tab-group-color"
                        value={groupColor}
                        onChange={(event) => setGroupColor(event.target.value)}
                      >
                        {groupColors.map((color) => (
                          <option key={color} value={color}>
                            {color[0].toUpperCase() + color.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="dialog-actions">
              <button
                ref={dialog.kind === 'confirm-close' ? closeConfirmationCancelRef : undefined}
                type="button"
                className="button-secondary"
                onClick={() => {
                  void closeDialog();
                }}
              >
                Cancel
              </button>
              <button type="submit" className={dialog.kind === 'confirm-close' ? 'button-danger' : 'button-primary'}>
                {dialog.kind === 'confirm-close'
                  ? 'Close tabs'
                  : dialog.kind === 'rename'
                    ? 'Save name'
                    : dialog.kind === 'move'
                      ? 'Move tab'
                      : dialog.kind === 'assign-group'
                        ? groupTargetId === 'new'
                          ? 'Create group'
                          : 'Move to group'
                        : dialog.groupId === null
                          ? 'Create group'
                          : 'Save group'}
              </button>
            </div>
          </form>
        )}
      </dialog>

      <div className={`notice-container${toast ? ' is-visible' : ''}`} data-tone={toast?.tone ?? 'success'}>
        <span className="notice-icon" aria-hidden="true">
          {toast?.tone === 'error' ? '!' : '✓'}
        </span>
        <div className="notice-message" role="status" aria-live="polite" aria-atomic="true">
          {liveStatusText}
        </div>
        {toast && (
          <button
            ref={toastDismissRef}
            type="button"
            className="notice-dismiss"
            aria-label="Dismiss message"
            onClick={() => dismissToast(true)}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
