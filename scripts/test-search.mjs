import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSources = async (...relativePaths) => {
  const sources = await Promise.all(
    relativePaths.map((relativePath) => readFile(path.join(projectRoot, relativePath), 'utf8')),
  );

  return sources.join('\n');
};

const server = await createServer({
  configFile: path.join(projectRoot, 'vite.config.ts'),
  root: projectRoot,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const manifest = JSON.parse(await readFile(path.join(projectRoot, 'src/manifest.json'), 'utf8'));
  const globalStyles = await readFile(path.join(projectRoot, 'src/styles/global.css'), 'utf8');
  const popupEntrySource = await readFile(path.join(projectRoot, 'src/popup/index.tsx'), 'utf8');
  const popupStartupSource = await readFile(path.join(projectRoot, 'src/popup/startPopup.ts'), 'utf8');
  const permissionRequestSource = await readFile(path.join(projectRoot, 'src/popup/PermissionRequest.tsx'), 'utf8');
  const popupHtml = await readFile(path.join(projectRoot, 'src/popup/index.html'), 'utf8');
  const popupEscapeGuard = await readFile(path.join(projectRoot, 'public/escape-guard.js'), 'utf8');
  let escapeHandler;
  let popupCloses = 0;
  runInNewContext(popupEscapeGuard, {
    window: {
      addEventListener: (_, handler) => {
        escapeHandler = handler;
      },
      setTimeout: (callback) => callback(),
      close: () => {
        popupCloses++;
      },
    },
    document: { querySelector: () => null },
  });
  escapeHandler({ key: 'Escape', isTrusted: true, isComposing: true });
  escapeHandler({ key: 'Escape', isTrusted: false });
  assert.equal(popupCloses, 0, 'IME cancellation and synthetic Escape do not close the popup');
  escapeHandler({ key: 'Escape', isTrusted: true });
  assert.equal(popupCloses, 1, 'a real Escape still closes the popup');
  const previewHtml = await readFile(path.join(projectRoot, 'design-preview.html'), 'utf8');
  const actionPrototypeHtml = await readFile(path.join(projectRoot, 'actions-popover-prototype.html'), 'utf8');
  const themeGalleryHtml = await readFile(path.join(projectRoot, 'theme-gallery.html'), 'utf8');
  const settingsSource = await readSources(
    'src/components/SettingsView.tsx',
    'src/components/SettingsView/AppearanceSection/AppearanceSection.tsx',
    'src/components/SettingsView/PaletteSection/PaletteSection.tsx',
    'src/components/SettingsView/FontFamilySection/FontFamilySection.tsx',
    'src/components/SettingsView/CommandBarSizeSection/CommandBarSizeSection.tsx',
    'src/components/SettingsView/WindowModeSection/WindowModeSection.tsx',
    'src/components/SettingsView/ShortcutSettingsRow/ShortcutSettingsRow.tsx',
  );
  const commandPaletteSource = await readSources(
    'src/components/CommandPalette.tsx',
    'src/components/CommandPalette/useCommandPaletteModel.ts',
    'src/components/CommandPalette/helpers.ts',
    'src/components/CommandPalette/SearchArea/SearchArea.tsx',
    'src/components/CommandPalette/ResultsRegion/ResultsRegion.tsx',
    'src/components/CommandPalette/FlowDialog/FlowDialog.tsx',
    'src/components/CommandPalette/FlowDialog/DialogFields.tsx',
    'src/components/CommandPalette/NoticeContainer/NoticeContainer.tsx',
  );
  const actionDockSource = await readSources(
    'src/components/ActionDock.tsx',
    'src/components/ActionDock/useActionDockKeyboard.ts',
  );
  const tabSwitcherSource = await readSources(
    'src/components/TabSwitcher.tsx',
    'src/components/TabSwitcher/useTabSwitcherModel.ts',
    'src/components/TabSwitcher/TabCard/TabCard.tsx',
    'src/components/TabSwitcher/EmptyPanel.tsx',
  );
  const backgroundSource = await readFile(path.join(projectRoot, 'src/background/index.ts'), 'utf8');
  const keyReleaseSource = await readFile(path.join(projectRoot, 'src/utils/tabSwitcherKeyRelease.ts'), 'utf8');
  const overlayHostSource = await readFile(path.join(projectRoot, 'src/overlay/surfaceHost/host.ts'), 'utf8');
  const overlayListenersSource = await readFile(path.join(projectRoot, 'src/overlay/surfaceHost/listeners.ts'), 'utf8');
  const clipboardSource = await readFile(path.join(projectRoot, 'src/utils/clipboard.ts'), 'utf8');
  const previewCacheSource = await readFile(path.join(projectRoot, 'src/utils/tabPreviewCache.ts'), 'utf8');
  const resultsSource = await readSources(
    'src/components/ResultsList.tsx',
    'src/components/ResultsList/ResultRow/ResultRow.tsx',
    'src/components/ResultsList/ResultRow/ItemIcon.tsx',
    'src/components/ResultsList/ResultRow/HighlightedText.tsx',
    'src/components/ResultsList/ResultRow/MoreGlyph.tsx',
    'src/components/ResultsList/EmptyState/EmptyState.tsx',
  );
  const productDoc = await readFile(path.join(projectRoot, 'PRODUCT.md'), 'utf8');
  assert.ok(!manifest.permissions.includes('bookmarks'), 'bookmark access is optional');
  assert.ok(!manifest.permissions.includes('history'), 'history access is optional');
  assert.ok(!manifest.permissions.includes('clipboardWrite'), 'clipboard write access is optional');
  assert.ok(
    !manifest.content_scripts?.length,
    'the manifest does not automatically inject scripts; explicit activeTab injection is allowed',
  );
  assert.ok(
    !manifest.host_permissions?.length && !manifest.optional_host_permissions?.length,
    'the extension requests no website access',
  );
  assert.ok(manifest.optional_permissions.includes('bookmarks'), 'bookmark search requests access only when selected');
  assert.ok(manifest.optional_permissions.includes('history'), 'history search requests access only when selected');
  assert.ok(
    manifest.optional_permissions.includes('clipboardWrite'),
    'copy commands request clipboard access only when selected',
  );
  assert.doesNotMatch(
    JSON.stringify(manifest.commands),
    /(?:Ctrl|Command)\+Tab/,
    'extension shortcuts do not suggest Tab, which Chrome excludes from supported command keys',
  );
  assert.match(
    backgroundSource,
    /notify: \(tabId, message = \{ action: 'ui:tabs-changed' \}\) => chrome\.tabs\.sendMessage\(tabId, message\)/,
    'overlay notifications use the persisted registry and support typed updates',
  );
  assert.match(
    backgroundSource,
    /tabNameReattachmentPending = true;\s*scheduleTabNameReconciliation\(\)/,
    'closing a named tab schedules stale-name reconciliation',
  );
  assert.match(
    backgroundSource,
    /new OverlayTabRegistry\([\s\S]*?chrome\.storage\.session\.get\(OVERLAY_TAB_IDS_SESSION_KEY\)/,
    'overlay registrations restore from session storage after a service-worker restart',
  );
  assert.match(
    backgroundSource,
    /overlayTabRegistry\.broadcast\(\)/,
    'tab-change broadcasts use the persisted overlay registry',
  );
  assert.match(
    backgroundSource,
    /return tabNameOperations\.enqueue\(async \(\) => \{\s*const \[tabs, stored\]/,
    'name reconciliation reads storage and tabs inside the shared mutation queue',
  );
  assert.equal(
    (backgroundSource.match(/asPositiveInteger\(message\.windowId\)/g) ?? []).length,
    3,
    'window lifecycle messages validate IDs before using them',
  );
  assert.match(
    backgroundSource,
    /asPositiveInteger\(message\.sourceTabId\)/,
    'tab activation validates an optional source ID before using it',
  );
  assert.match(
    backgroundSource,
    /changes\.pinned !== undefined[\s\S]*?changes\.audible !== undefined/,
    'tab updates broadcast false pinned and audible values',
  );
  assert.match(
    backgroundSource,
    /chrome\.tabs\.onMoved\.addListener\(broadcastTabChanges\)/,
    'tab reordering refreshes open command surfaces',
  );
  assert.match(
    backgroundSource,
    /changes\.groupId !== undefined/,
    'tab group membership changes refresh open command surfaces',
  );
  assert.match(
    backgroundSource,
    /getLastFocused\(\{ windowTypes: \['normal'\] \}\)[\s\S]*?tabs\.query\(\{ active: true, windowId: focused\.id \}\)/,
    'active-tab actions ignore extension popup windows',
  );
  assert.match(
    backgroundSource,
    /case 'permissions:open-request'[\s\S]*?chrome\.windows\.create/,
    'overlay permission prompts open an extension page',
  );
  assert.doesNotMatch(
    backgroundSource,
    /chrome\.permissions\.request\s*\(/,
    'the service worker does not request permissions outside a user gesture',
  );
  assert.match(
    permissionRequestSource,
    /chrome\.permissions\.request\(\{ permissions \}\)/,
    'the extension permission page requests access from its explicit button click',
  );
  assert.ok(
    popupStartupSource.indexOf("if (fromUrl === 'permission-request')") <
      popupStartupSource.indexOf('chrome.storage.session.get('),
    'permission prompts do not consume pending shortcut launch state',
  );
  assert.match(
    popupEntrySource,
    /import \{ startPopup \} from '\.\/startPopup';\s*void startPopup\(\)/,
    'the popup entry delegates startup work to its startup module',
  );
  assert.match(
    keyReleaseSource,
    /key is 'Meta' \| 'Control' \| 'Alt'/,
    'Alt can act as the switcher shortcut modifier',
  );
  assert.match(
    backgroundSource,
    /event\.key === 'Meta' \|\| event\.key === 'Control' \|\| event\.key === 'Alt'/,
    'the cold-start key release monitor also recognizes Alt',
  );
  assert.match(
    previewHtml,
    /querySelectorAll\('\.segmented button\[data-theme\]'\)/,
    'appearance preview controls exclude the document root',
  );
  assert.match(
    actionPrototypeHtml,
    /panel\.setAttribute\('aria-label', `Tab actions for \$\{title\}`\)/,
    'the action prototype labels its panel from the selected tab',
  );
  assert.match(
    actionPrototypeHtml,
    /item\.classList\.contains\('is-selected'\) && !panel\.hidden/,
    'prototype aria-expanded follows actual panel visibility',
  );
  for (const token of ['--foreground', '--card', '--border', '--secondary', '--muted']) {
    assert.ok(themeGalleryHtml.includes(token), `theme gallery defines the outer-page ${token} token`);
  }
  assert.match(
    backgroundSource,
    /tabPreviewCache\.save\([\s\S]*?previewGeneration\s*,?\s*\)/,
    'preview writes use the shared serialized cache',
  );
  assert.match(
    popupStartupSource,
    /chrome\.storage\.session\.get\(\['nextPaletteMode', 'nextTabSwitcherAutoSwitchOnRelease', 'paletteRequestedAt'\]\)/,
    'the native popup reads the shortcut launch timestamp',
  );
  assert.match(
    clipboardSource,
    /ownerDocument\.execCommand\('copy'\)/,
    'clipboard writes have a legacy fallback for insecure pages',
  );
  assert.match(
    commandPaletteSource,
    /await writeClipboardText\(value\)/,
    'all command-menu copy actions use the shared clipboard helper',
  );
  assert.match(
    commandPaletteSource,
    /if \(command\.flow === 'assign-group' && activeTab\?\.id !== undefined\) \{\s*dismissToast\(\);\s*setDialogError\(''\);\s*const currentGroups = await sendBackground<chrome\.tabGroups\.TabGroup\[]>\('groups:list'\)/,
    'the assign-group command clears stale notices and dialog errors before opening its dialog',
  );
  assert.match(
    previewCacheSource,
    /private readonly operations = new SerialTaskQueue\(\)/,
    'preview cache mutations are serialized',
  );
  assert.match(
    previewCacheSource,
    /generation !== this\.generation/,
    'clear and removal invalidate screenshots that were already in flight',
  );
  assert.match(
    actionDockSource,
    /if \(event\.shiftKey\) \{\s*searchRef\.current\?\.focus\([\s\S]*?\} else \{\s*onDismiss\(\);/,
    'menu Shift+Tab returns to action search and Tab exits the dock',
  );
  assert.match(
    actionDockSource,
    /if \(event\.shiftKey\) \{\s*onDismiss\(\);\s*\} else if \(elements\.length\) \{\s*focusItem\(elements\[0\]\)/,
    'search Tab enters the first action while Shift+Tab dismisses',
  );
  assert.doesNotMatch(
    overlayHostSource,
    /contenteditable/,
    'the shadow host stays out of the editable accessibility tree',
  );
  assert.doesNotMatch(
    tabSwitcherSource,
    /scheduleAfterShortcut|TabSwitcherShortcutIdleCommit/,
    'holding the shortcut modifier never auto-activates a tab on idle',
  );
  assert.deepEqual(
    manifest.web_accessible_resources?.flatMap((entry) => entry.resources),
    [
      'assets/fonts/open-sans/OpenSans-Latin.woff2',
      'assets/fonts/open-sans/OpenSans-LatinExt.woff2',
      'assets/fonts/outfit/Outfit-Latin.woff2',
      'assets/fonts/outfit/Outfit-LatinExt.woff2',
      'assets/fonts/nunito-sans/NunitoSans-Latin.woff2',
      'assets/fonts/nunito-sans/NunitoSans-LatinExt.woff2',
      'assets/fonts/sora/Sora-Latin.woff2',
      'assets/fonts/sora/Sora-LatinExt.woff2',
      'assets/fonts/ibm-plex-mono/IBMPlexMono-400-Latin.woff2',
      'assets/fonts/ibm-plex-mono/IBMPlexMono-500-Latin.woff2',
      'assets/fonts/ibm-plex-mono/IBMPlexMono-600-Latin.woff2',
      'assets/fonts/ibm-plex-mono/IBMPlexMono-700-Latin.woff2',
    ],
    'only bundled UI fonts are exposed to host pages for isolated overlay rendering',
  );

  const { searchItems, searchProviderItems } = await server.ssrLoadModule('/src/utils/fuzzySearch.ts');
  const { createProviderSearchItem, findSearchProvider, parseProviderQuery } = await server.ssrLoadModule(
    '/src/utils/searchProviders.ts',
  );
  const { initialCommandItems, toTabItems } = await server.ssrLoadModule('/src/utils/tabItems.ts');
  const { installTabSwitcherKeyReleaseMonitor, isTabSwitcherModifierKey, wasTabSwitcherModifierReleasedAfter } =
    await server.ssrLoadModule('/src/utils/tabSwitcherKeyRelease.ts');
  const { asPositiveInteger, normalizeNavigationUrl, normalizeSavedNavigationUrl } =
    await server.ssrLoadModule('/src/utils/chromeHelpers.ts');
  const { writeClipboardText } = await server.ssrLoadModule('/src/utils/clipboard.ts');
  const { themeRegistry, themeTokenNames, defaultThemePreferences, normalizeThemePreferences } =
    await server.ssrLoadModule('/src/themes/index.ts');
  const { markTabNameClosed, reconcileTabNames } = await server.ssrLoadModule('/src/utils/tabNamePersistence.ts');
  assert.deepEqual(
    reconcileTabNames({ 7: null, 8: { customName: 2 }, 9: [] }, []),
    {},
    'corrupt stored names are discarded without breaking tab initialization',
  );
  assert.deepEqual(reconcileTabNames(null, []), {}, 'invalid storage containers recover to an empty name map');
  const { OverlayTabRegistry } = await server.ssrLoadModule('/src/utils/overlayTabRegistry.ts');
  const { SerialTaskQueue } = await server.ssrLoadModule('/src/utils/serialTaskQueue.ts');
  const { TabPreviewCache } = await server.ssrLoadModule('/src/utils/tabPreviewCache.ts');
  const { isOverlayPage } = await server.ssrLoadModule('/src/utils/pageSupport.ts');
  const { displayDetails } = await server.ssrLoadModule('/src/components/ResultsList.tsx');
  const { isTabInSplitView, SPLIT_VIEW_ID_NONE } = await server.ssrLoadModule('/src/utils/splitViews.ts');
  const { getCommands } = await server.ssrLoadModule('/src/utils/commands.ts');

  const savedOverlayTabIds = [];
  const notifiedOverlayTabIds = [];
  const notifiedOverlayMessages = [];
  const overlayRegistryPort = {
    load: async () => savedOverlayTabIds,
    save: async (tabIds) => {
      savedOverlayTabIds.splice(0, savedOverlayTabIds.length, ...tabIds);
    },
    notify: async (tabId, message) => {
      notifiedOverlayTabIds.push(tabId);
      notifiedOverlayMessages.push(message);
    },
  };
  const firstWorkerRegistry = new OverlayTabRegistry(overlayRegistryPort);
  await firstWorkerRegistry.register(17);
  const restartedWorkerRegistry = new OverlayTabRegistry(overlayRegistryPort);
  await restartedWorkerRegistry.broadcast();
  assert.deepEqual(
    notifiedOverlayTabIds,
    [17],
    'a new service-worker registry restores open overlay tabs and notifies them',
  );
  assert.deepEqual(
    notifiedOverlayMessages[0],
    { action: 'ui:tabs-changed' },
    'the overlay registry keeps its default tab-change message',
  );
  await restartedWorkerRegistry.broadcast({ action: 'ui:permissions-changed' });
  assert.deepEqual(
    notifiedOverlayMessages[1],
    { action: 'ui:permissions-changed' },
    'the overlay registry can broadcast permission changes',
  );

  assert.equal(asPositiveInteger(17), 17, 'positive integer Chrome IDs remain usable');
  assert.equal(asPositiveInteger(null), undefined, 'null is never coerced into Chrome ID zero');
  assert.equal(asPositiveInteger(undefined), undefined, 'missing IDs remain absent');
  assert.equal(asPositiveInteger(0), undefined, 'zero is rejected as an invalid Chrome window or tab ID');
  assert.equal(asPositiveInteger('17'), undefined, 'IDs must arrive as numbers instead of coercible strings');

  const previewStorage = new Map();
  let blockPreviewRead = false;
  let signalPreviewRead;
  let releasePreviewRead;
  let previewReadStarted = new Promise((resolve) => {
    signalPreviewRead = resolve;
  });
  let previewReadGate = new Promise((resolve) => {
    releasePreviewRead = resolve;
  });
  const previewCache = new TabPreviewCache(
    {
      get: async (key) => {
        if (blockPreviewRead) {
          blockPreviewRead = false;
          signalPreviewRead();
          await previewReadGate;
        }
        return { [key]: previewStorage.get(key) };
      },
      set: async (values) => {
        for (const [key, value] of Object.entries(values)) previewStorage.set(key, value);
      },
      remove: async (keys) => {
        for (const key of Array.isArray(keys) ? keys : [keys]) previewStorage.delete(key);
      },
    },
    'tabPreviewIds',
    'tabPreview:',
    5,
  );
  const previewRecord = (id) => ({
    url: `https://example.test/${id}`,
    dataUrl: `data:image/jpeg;base64,${id}`,
    capturedAt: id,
  });
  const initialPreviewGeneration = previewCache.captureGeneration();
  await Promise.all([
    previewCache.save(1, previewRecord(1), initialPreviewGeneration),
    previewCache.save(2, previewRecord(2), initialPreviewGeneration),
  ]);
  assert.deepEqual(
    previewStorage.get('tabPreviewIds'),
    [2, 1],
    'overlapping preview captures preserve both IDs in the serialized index',
  );
  assert.ok(
    previewStorage.has('tabPreview:1') && previewStorage.has('tabPreview:2'),
    'overlapping preview captures retain both screenshot records',
  );
  await previewCache.remove(1);
  assert.deepEqual(previewStorage.get('tabPreviewIds'), [2], 'removing one preview preserves the other tracked ID');
  assert.equal(previewStorage.has('tabPreview:1'), false, 'removing a preview deletes its image record');
  previewStorage.set('tabPreview:99', previewRecord(99));
  await previewCache.remove(99);
  assert.equal(
    previewStorage.has('tabPreview:99'),
    false,
    'removal also clears records missing from an inconsistent index',
  );

  const preClearGeneration = previewCache.captureGeneration();
  blockPreviewRead = true;
  const inFlightPreviewSave = previewCache.save(3, previewRecord(3), preClearGeneration);
  await previewReadStarted;
  const clearPreviews = previewCache.clear();
  releasePreviewRead();
  assert.equal(await inFlightPreviewSave, false, 'clearing the cache cancels a screenshot write already in flight');
  await clearPreviews;
  assert.equal(previewStorage.has('tabPreviewIds'), false, 'clear removes the serialized preview index');
  assert.equal(previewStorage.has('tabPreview:3'), false, 'a stale screenshot cannot repopulate a cleared cache');

  let copiedValue = '';
  let removedFallback = false;
  let restoredFallbackFocus = false;
  const fallbackTextarea = {
    value: '',
    style: {},
    tabIndex: 0,
    setAttribute() {},
    focus() {},
    select() {
      copiedValue = this.value;
    },
    remove() {
      removedFallback = true;
    },
  };
  const previouslyFocused = {
    isConnected: true,
    focus(options) {
      restoredFallbackFocus = options?.preventScroll === true;
    },
  };
  const fallbackDocument = {
    activeElement: previouslyFocused,
    body: { appendChild() {} },
    createElement(tag) {
      assert.equal(tag, 'textarea');
      return fallbackTextarea;
    },
    execCommand(command) {
      assert.equal(command, 'copy');
      return true;
    },
  };
  await writeClipboardText(
    'copied from an HTTP page',
    {
      writeText: async () => {
        throw new Error('insecure context');
      },
    },
    fallbackDocument,
  );
  assert.equal(copiedValue, 'copied from an HTTP page', 'clipboard fallback selects the requested value');
  assert.equal(removedFallback, true, 'clipboard fallback removes its temporary textarea');
  assert.equal(restoredFallbackFocus, true, 'clipboard fallback restores the previously focused control');

  const commands = [
    {
      id: 'reload',
      type: 'command',
      title: 'Reload current tab',
      subtitle: 'Reload the active page',
      keywords: ['refresh'],
      icon: '↻',
    },
    {
      id: 'tabs',
      type: 'command',
      title: 'Switch to a tab',
      subtitle: 'Search tabs',
      keywords: ['tab switcher'],
      icon: '▤',
    },
  ];
  const initialTabs = [
    { id: 'unpinned-recent', type: 'tab', title: 'Recent tab', pinned: false, windowId: 1, index: 4, current: true },
    { id: 'pinned-second', type: 'tab', title: 'Pinned second', pinned: true, windowId: 1, index: 1 },
    { id: 'unpinned-second', type: 'tab', title: 'Second recent', pinned: false, windowId: 1, index: 5 },
    { id: 'pinned-first', type: 'tab', title: 'Pinned first', pinned: true, windowId: 1, index: 0 },
    ...Array.from({ length: 6 }, (_, index) => ({
      id: `unpinned-${index}`,
      type: 'tab',
      title: `Recent ${index}`,
      pinned: false,
      windowId: 1,
      index: index + 6,
    })),
  ];
  const initialResults = searchItems(initialCommandItems(commands, initialTabs), '');
  assert.deepEqual(
    initialResults.map((item) => item.id),
    [
      'pinned-first',
      'pinned-second',
      'unpinned-recent',
      'unpinned-second',
      'unpinned-0',
      'unpinned-1',
      'unpinned-2',
      'unpinned-3',
      'unpinned-4',
      'unpinned-5',
      'reload',
      'tabs',
    ],
    'expanded initial results show pinned and other open tabs before browser commands',
  );
  const tabsFromRecencyOrder = toTabItems(
    [
      { id: 41, title: 'Recent', url: 'https://recent.test', index: 3, windowId: 1, pinned: false, lastAccessed: 900 },
      {
        id: 43,
        title: 'Pinned second',
        url: 'https://second.test',
        index: 1,
        windowId: 1,
        pinned: true,
        lastAccessed: 800,
      },
      {
        id: 44,
        title: 'Other window pinned',
        url: 'https://other.test',
        index: 0,
        windowId: 2,
        pinned: true,
        lastAccessed: 700,
      },
      {
        id: 42,
        title: 'Pinned first',
        url: 'https://first.test',
        index: 0,
        windowId: 1,
        pinned: true,
        lastAccessed: 100,
      },
    ],
    41,
    1,
  );
  assert.deepEqual(
    tabsFromRecencyOrder.filter((item) => item.pinned).map((item) => item.tabId),
    [42, 43, 44],
    'pinned tabs keep tab-strip order within the active window before pinned tabs from other windows',
  );
  assert.equal(
    displayDetails({
      id: 'bookmark-clean',
      type: 'bookmark',
      title: 'Retool',
      subtitle: 'https://retool.com/',
      url: 'https://retool.com/',
    }),
    '',
    'bookmark rows hide their URL beneath the title',
  );
  assert.equal(
    displayDetails({
      id: 'action-clean',
      type: 'command',
      title: 'Reload current tab',
      description: 'Reload the active page',
      subtitle: 'Reload the active page',
    }),
    '',
    'browser action rows hide their redundant description',
  );
  assert.equal(
    displayDetails({
      id: 'chrome-page-clean',
      type: 'url',
      title: 'Open Chrome settings',
      subtitle: 'chrome://settings/',
      url: 'chrome://settings/',
    }),
    '',
    'direct browser-page rows hide their URL beneath the title',
  );
  assert.equal(isTabSwitcherModifierKey('Meta'), true, 'Meta release completes the default Mac tab-switcher shortcut');
  assert.equal(
    isTabSwitcherModifierKey('Control'),
    true,
    'Control release completes user-customized and Windows/Linux tab-switcher shortcuts',
  );
  assert.equal(isTabSwitcherModifierKey('Alt'), true, 'Alt release completes Alt-based user-customized shortcuts');
  assert.equal(isTabSwitcherModifierKey('Shift'), false, 'Shift release alone does not activate the selected tab');
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let releaseListener;
  const fakeWindow = {
    addEventListener: (type, listener) => {
      if (type === 'keyup') releaseListener = listener;
    },
    __commandMenuKeyReleaseState: undefined,
  };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  try {
    installTabSwitcherKeyReleaseMonitor();
    const switcherOpenedAt = Date.now() - 1000;
    releaseListener({ key: 'Control', isTrusted: false });
    assert.equal(
      wasTabSwitcherModifierReleasedAfter(switcherOpenedAt),
      false,
      'page-generated keyboard events cannot prime automatic tab activation',
    );
    releaseListener({ key: 'Control', isTrusted: true });
    assert.equal(
      wasTabSwitcherModifierReleasedAfter(switcherOpenedAt),
      true,
      'a customized Control shortcut released before the switcher finishes mounting activates its selected tab',
    );
  } finally {
    if (originalWindowDescriptor) Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    else delete globalThis.window;
  }
  const renamedTab = {
    id: 'tab-4',
    type: 'tab',
    title: 'Design review',
    subtitle: 'Original roadmap title · https://example.com',
    keywords: ['Original roadmap title', 'https://example.com'],
    icon: '◉',
    tabId: 4,
  };

  assert.equal(searchItems(commands, 'refresh')[0].id, 'reload', 'command aliases remain searchable');
  assert.equal(
    searchItems([renamedTab], 'roadmap', true)[0].id,
    'tab-4',
    'tab search includes the original title after renaming',
  );
  assert.equal(
    searchItems([], 'yt lo-fi', false)[0].url,
    'https://www.youtube.com/results?search_query=lo-fi',
    'provider prefixes open the provider search page',
  );
  const renamedGithubBookmark = {
    id: 'bookmark-react',
    type: 'bookmark',
    title: 'React Docs',
    subtitle: 'https://github.com/facebook/react',
    icon: '☆',
    url: 'https://github.com/facebook/react',
  };
  assert.equal(
    searchItems([renamedGithubBookmark], 'github react')[0].id,
    'bookmark-react',
    'multi-word search can match title and URL together',
  );
  const localYtTab = {
    id: 'tab-yt-plan',
    type: 'tab',
    title: 'YT planning',
    subtitle: 'Lo-fi project notes',
    icon: '◉',
    tabId: 21,
  };
  const ytResults = searchItems([localYtTab], 'yt lo-fi');
  assert.equal(
    ytResults[0].url,
    'https://www.youtube.com/results?search_query=lo-fi',
    'an explicit provider prefix selects its search action first',
  );
  assert.equal(ytResults[1].id, 'tab-yt-plan', 'local results remain available beneath an explicit provider search');
  const localSettingsCommand = {
    id: 'open-chrome-settings',
    type: 'command',
    title: 'Open Chrome settings',
    description: 'Manage Chrome preferences',
    keywords: ['browser'],
    icon: '⚙',
  };
  const settingsProviderResults = searchItems([localSettingsCommand], 'g settings');
  assert.equal(
    settingsProviderResults[0].type,
    'search',
    'the provider handoff wins over single-letter prefix collisions',
  );
  assert.equal(
    settingsProviderResults[1].id,
    'open-chrome-settings',
    'local command matches remain accessible after a provider handoff',
  );
  const scatteredMatch = {
    id: 'bookmark-scattered',
    type: 'bookmark',
    title: `a${'x'.repeat(100)}b${'x'.repeat(100)}c`,
    subtitle: 'A long unrelated saved page',
    icon: '☆',
    url: 'https://example.com/other',
  };
  assert.equal(
    searchItems([scatteredMatch], 'abc')[0].type,
    'search',
    'weak matches across distant characters do not suppress web search',
  );
  const closeCommand = {
    id: 'close-tab',
    type: 'command',
    title: 'Close current tab',
    description: 'Close this page',
    keywords: ['close'],
    icon: '×',
  };
  assert.equal(
    searchItems([closeCommand], 'closet')[0].type,
    'search',
    'a loose misspelling cannot select a destructive command instead of web search',
  );
  const browsingCommand = {
    id: 'new-incognito-window',
    type: 'command',
    title: 'Create a private browsing window',
    description: 'Open a private window',
    keywords: ['private'],
    icon: '◉',
  };
  assert.equal(
    searchItems([browsingCommand], 'boing')[0].type,
    'search',
    'widely scattered letters cannot select an unrelated browser command',
  );
  const reopenCommand = {
    id: 'reopen-tab',
    type: 'command',
    title: 'Reopen closed tab',
    description: 'Restore the last closed tab',
    keywords: ['restore'],
    icon: '↶',
  };
  assert.equal(
    searchItems([reopenCommand], 'etab')[0].id,
    'reopen-tab',
    'fuzzy matching checks later character starts after an earlier weak match',
  );
  const historyItems = [
    {
      id: 'history-old',
      type: 'history',
      title: 'Project notes',
      subtitle: 'History result',
      icon: '◷',
      url: 'https://example.com/old',
      lastVisitTime: 100,
    },
    {
      id: 'history-new',
      type: 'history',
      title: 'Project notes',
      subtitle: 'History result',
      icon: '◷',
      url: 'https://example.com/new',
      lastVisitTime: 200,
    },
  ];
  const historyResults = searchItems(historyItems, 'project');
  assert.deepEqual(
    historyResults.slice(0, 2).map((item) => item.id),
    ['history-new', 'history-old'],
    'equally relevant history results preserve visit recency',
  );
  assert.equal(
    historyResults.at(-1).type,
    'search',
    'an external web-search option remains available beneath local matches',
  );
  assert.equal(
    findSearchProvider('YouTube')?.id,
    'youtube',
    'full provider names remain available through the Tab activation shortcut',
  );
  assert.equal(
    findSearchProvider('YT')?.id,
    'youtube',
    'short provider aliases remain available through the Tab activation shortcut',
  );
  assert.equal(findSearchProvider('go')?.id, 'google', 'the original Google Tab alias is preserved');
  assert.deepEqual(
    searchItems([], 'yt', false, false),
    [],
    'a provider hint does not compete with a generic Google fallback before Tab is pressed',
  );
  assert.equal(
    createProviderSearchItem(findSearchProvider('youtube'), 'lo-fi music').url,
    'https://www.youtube.com/results?search_query=lo-fi%20music',
    'activated providers encode the typed query safely',
  );
  assert.equal(
    parseProviderQuery('google drive'),
    null,
    'a provider name followed by ordinary words is not misread as a command prefix',
  );
  const githubBookmark = {
    id: 'bookmark-github',
    type: 'bookmark',
    title: 'GitHub project',
    subtitle: 'https://github.com/example/project',
    icon: '☆',
    url: 'https://github.com/example/project',
  };
  const githubAddressResults = searchItems([githubBookmark], 'github.com');
  assert.equal(githubAddressResults[0].type, 'url', 'a typed valid address opens before saved-page matches');
  assert.equal(
    githubAddressResults[0].url,
    'https://github.com/',
    'bare domains normalize to their canonical navigable URL',
  );
  assert.equal(
    githubAddressResults[1].id,
    'bookmark-github',
    'relevant saved pages remain available beneath direct navigation',
  );
  const savedExactAddress = {
    id: 'bookmark-google',
    type: 'bookmark',
    title: 'Google',
    subtitle: 'https://google.com/',
    icon: '☆',
    url: 'https://google.com/',
  };
  const bareGoogleResults = searchItems([savedExactAddress], 'google.com');
  assert.equal(bareGoogleResults[0].type, 'url', 'an exact bookmark cannot outrank direct address navigation');
  assert.equal(bareGoogleResults[0].url, 'https://google.com/', 'a bare domain uses the canonical trailing slash');
  assert.equal(bareGoogleResults[1].id, 'bookmark-google', 'an exact saved address remains a secondary result');
  const explicitGoogleResults = searchItems([savedExactAddress], 'https://google.com');
  assert.equal(
    explicitGoogleResults[0].type,
    'url',
    'a fully qualified address remains first when it exactly matches a bookmark',
  );
  assert.equal(
    explicitGoogleResults[1].id,
    'bookmark-google',
    'the matching bookmark remains available after direct navigation',
  );
  const youtubeGoogleResults = searchProviderItems([savedExactAddress], 'google.com', findSearchProvider('youtube'));
  assert.deepEqual(
    youtubeGoogleResults.slice(0, 2).map((item) => item.type),
    ['url', 'search'],
    'an active provider keeps direct navigation first and its search action immediately available',
  );
  assert.equal(
    youtubeGoogleResults[1].url,
    'https://www.youtube.com/results?search_query=google.com',
    'an active provider can still search a domain-shaped query',
  );
  assert.equal(
    youtubeGoogleResults[2].id,
    'bookmark-google',
    'saved pages remain accessible after direct navigation and provider search',
  );
  const chatgptNodeResults = searchProviderItems([], 'node.js', findSearchProvider('chatgpt'));
  assert.equal(
    chatgptNodeResults[0].type,
    'url',
    'dotted queries keep URL navigation first while a provider chip is active',
  );
  assert.equal(
    chatgptNodeResults[1].url,
    'https://chatgpt.com/?q=node.js',
    'dotted queries remain searchable with the active provider',
  );
  assert.equal(
    searchProviderItems([], 'how to prune a fig tree', findSearchProvider('chatgpt'))[0].url,
    'https://chatgpt.com/?q=how%20to%20prune%20a%20fig%20tree',
    'ordinary provider queries still select the provider action',
  );
  assert.equal(
    searchItems([], 'google.com?q=extensions')[0].url,
    'https://google.com/?q=extensions',
    'bare domains with a query string are recognized as addresses',
  );
  assert.equal(
    searchItems([], 'example.com/docs')[0].url,
    'https://example.com/docs',
    'bare URLs become navigation results',
  );
  assert.equal(
    searchItems([], 'chrome://flags/#enable-gpu-rasterization')[0].url,
    'chrome://flags/#enable-gpu-rasterization',
    'valid Chrome internal pages remain directly searchable',
  );
  assert.equal(
    searchItems([], 'chrome://settings')[0].url,
    'chrome://settings/',
    'common Chrome pages receive their canonical trailing slash',
  );
  assert.equal(
    normalizeNavigationUrl('chrome://new-tab-page'),
    'chrome://newtab/',
    'the newer Chrome new-tab alias resolves to canonical newtab',
  );
  assert.equal(
    normalizeNavigationUrl('chrome://new-tab-page/'),
    'chrome://newtab/',
    'the slash variant of the new-tab alias resolves to canonical newtab',
  );
  assert.deepEqual(
    searchItems([], 'javascript:alert(1)').map((item) => item.type),
    ['search'],
    'script URLs are treated as search text rather than navigable addresses',
  );
  assert.equal(
    normalizeSavedNavigationUrl('file:///Users/pedro/notes.html'),
    'file:///Users/pedro/notes.html',
    'saved local file URLs remain openable',
  );
  assert.equal(normalizeSavedNavigationUrl('javascript:alert(1)'), null, 'saved script URLs are rejected');
  assert.equal(
    searchItems([], 'localhost:3000/app')[0].url,
    'https://localhost:3000/app',
    'bare local development URLs with a port are recognized',
  );
  assert.equal(
    searchItems([], 'some words', false)[0].url,
    'https://www.google.com/search?q=some%20words',
    'unmatched queries offer a web search',
  );
  assert.deepEqual(
    searchItems([], 'nothing found', true),
    [],
    'tab mode never replaces no matches with an external search',
  );
  assert.match(
    globalStyles,
    /width: var\(--cc-popup-width\);/,
    'the Chrome action popup has a definite preferred width',
  );
  assert.match(
    globalStyles,
    /html\[data-popup-window='fallback'\][\s\S]*?width: min\(var\(--cc-popup-width\), 100vw\)/,
    'fallback popup windows clamp their preferred width to the available viewport',
  );
  assert.match(
    popupStartupSource,
    /dataset\.popupWindow = 'fallback'/,
    'fallback windows opt into responsive popup sizing',
  );
  assert.match(globalStyles, /min-width: 0;/, 'popup roots can shrink instead of clipping controls at zoom');
  assert.match(
    commandPaletteSource,
    /F2 renames the selected tab\. Shift F10, the Context Menu key, or Command\/Control K opens tab actions\./,
    'the accessible tab-action hint names every supported keyboard shortcut',
  );

  const actionCommands = getCommands({
    activeTab: { id: 1, windowId: 1, index: 1, pinned: false, groupId: -1, mutedInfo: { muted: false } },
    activeGroup: null,
    tabCountInWindow: 3,
    tabsToRightCount: 1,
    activeGroupTabCount: 0,
    canUnsplitTabs: false,
  });
  assert.equal(
    actionCommands.find((item) => item.id === 'close-other-tabs')?.flow,
    'confirm-close',
    'bulk close other tabs asks for confirmation',
  );
  assert.equal(
    actionCommands.find((item) => item.id === 'close-right-tabs')?.flow,
    'confirm-close',
    'bulk close to the right asks for confirmation',
  );
  const cacheRefresh = actionCommands.find((item) => item.id === 'hard-reload-tab');
  assert.equal(
    cacheRefresh?.title,
    'Clear cache and refresh',
    'the Arc-style cache refresh action follows sentence case',
  );
  assert.match(
    cacheRefresh?.description ?? '',
    /without using the local cache/,
    'the cache refresh description explains that the reload bypasses cache',
  );

  assert.equal(SPLIT_VIEW_ID_NONE, -1, 'Chrome uses -1 as its no-split sentinel');
  assert.equal(
    isTabInSplitView({ splitViewId: SPLIT_VIEW_ID_NONE }),
    false,
    'the no-split sentinel is not treated as a split',
  );
  assert.equal(isTabInSplitView({ splitViewId: 7 }), true, 'a real split ID is recognized');
  assert.equal(isTabInSplitView({}), false, 'missing split metadata is safe on older Chrome versions');
  assert.equal(
    actionCommands.some((item) => item.id === 'unsplit-current-view'),
    false,
    'unsplit is hidden for tabs with no active split',
  );
  const splitCommands = getCommands({
    activeTab: { id: 2, windowId: 1, index: 1, pinned: false, splitViewId: 7 },
    activeGroup: null,
    tabCountInWindow: 2,
    tabsToRightCount: 0,
    activeGroupTabCount: 0,
    canUnsplitTabs: false,
  });
  assert.equal(
    splitCommands.some((item) => item.id === 'unsplit-current-view'),
    false,
    'unsplit is hidden when Chrome has no unsplit API',
  );
  const splitCommandsWithApi = getCommands({
    activeTab: { id: 2, windowId: 1, index: 1, pinned: false, splitViewId: 7 },
    activeGroup: null,
    tabCountInWindow: 2,
    tabsToRightCount: 0,
    activeGroupTabCount: 0,
    canUnsplitTabs: true,
  });
  assert.equal(
    splitCommandsWithApi.some((item) => item.id === 'unsplit-current-view'),
    true,
    'unsplit is offered for an active Split View when Chrome exposes the API',
  );

  const now = Date.now();
  const renamed = {
    12: {
      tabId: 12,
      customName: 'Research',
      originalTitle: 'Project notes',
      url: 'https://example.com/notes',
      updatedAt: now - 1000,
      closedAt: now - 500,
    },
  };
  assert.match(
    backgroundSource,
    /withTabNamesMutation\(async \(names\) => \{\s*if \(!names\[String\(tabId\)\]\) \{\s*return false;\s*\}\s*const currentTabs = await chrome\.tabs\.query\(\{\}\);\s*return markTabNameClosed\(names, tabId, Date\.now\(\), currentTabs\);/,
    'closing a renamed tab snapshots same-URL tabs inside the serialized mutation',
  );
  const openNameBesideDuplicate = { 12: { ...renamed['12'], closedAt: undefined } };
  const duplicatePresentBeforeClose = reconcileTabNames(
    openNameBesideDuplicate,
    [{ id: 47, title: 'Project notes', url: 'https://example.com/notes' }],
    now + 1,
  );
  assert.equal(
    duplicatePresentBeforeClose['47'],
    undefined,
    'an open tab name is not reassigned while a close event is pending',
  );
  assert.equal(
    duplicatePresentBeforeClose['12']?.customName,
    'Research',
    'the open tab name remains attached to its original ID during reconciliation',
  );

  const serializedNames = { 12: { ...renamed['12'], closedAt: undefined } };
  const tabNameQueue = new SerialTaskQueue();
  const duplicateTab = [{ id: 47, title: 'Project notes', url: 'https://example.com/notes' }];
  let startListing;
  let releaseListing;
  const listingStarted = new Promise((resolve) => {
    startListing = resolve;
  });
  const waitForListing = new Promise((resolve) => {
    releaseListing = resolve;
  });
  const listOperation = tabNameQueue.enqueue(async () => {
    const snapshot = structuredClone(serializedNames);
    startListing();
    await waitForListing;
    const reconciled = reconcileTabNames(snapshot, duplicateTab, now + 1);
    for (const key of Object.keys(serializedNames)) delete serializedNames[key];
    Object.assign(serializedNames, reconciled);
  });
  await listingStarted;
  let closeOperationStarted = false;
  const closeOperation = tabNameQueue.enqueue(async () => {
    closeOperationStarted = true;
    assert.equal(markTabNameClosed(serializedNames, 12, now + 2, duplicateTab), true);
  });
  assert.equal(closeOperationStarted, false, 'the close mutation waits for the in-flight list reconciliation');
  releaseListing();
  await Promise.all([listOperation, closeOperation]);
  assert.equal(
    serializedNames['47'],
    undefined,
    'the overlapping list/close sequence does not rename the existing duplicate',
  );
  const serializedStaleName = Object.entries(serializedNames).find(([key]) => key.startsWith('stale:'))?.[1];
  assert.equal(serializedStaleName?.customName, 'Research', 'the overlapping sequence preserves the closed tab name');
  assert.deepEqual(
    serializedStaleName?.excludedTabIdsAtClose,
    [47],
    'the close-time candidate exclusion survives the overlapping list',
  );

  const closedTabName = { 12: { ...renamed['12'], closedAt: undefined } };
  assert.equal(
    markTabNameClosed(closedTabName, 12, now),
    true,
    'closing a named tab moves its record into the stale-key namespace',
  );
  assert.equal(closedTabName['12'], undefined, 'a closed tab name is no longer kept under its reusable numeric tab ID');
  const restoredAfterClose = reconcileTabNames(
    closedTabName,
    [{ id: 46, title: 'Project notes', url: 'https://example.com/notes' }],
    now + 1,
  );
  assert.equal(
    restoredAfterClose['46']?.customName,
    'Research',
    'a restored tab receives its unique custom name after the old tab closes',
  );

  const closedBesideDuplicate = { 12: { ...renamed['12'], closedAt: undefined } };
  markTabNameClosed(closedBesideDuplicate, 12, now, [
    { id: 47, title: 'Project notes', url: 'https://example.com/notes' },
  ]);
  const duplicateStillOpen = reconcileTabNames(
    closedBesideDuplicate,
    [{ id: 47, title: 'Project notes', url: 'https://example.com/notes' }],
    now + 1,
  );
  assert.equal(
    duplicateStillOpen['47'],
    undefined,
    'a tab that existed at closure does not inherit the closed tab name',
  );
  const originalRestoredBesideDuplicate = reconcileTabNames(
    duplicateStillOpen,
    [
      { id: 47, title: 'Project notes', url: 'https://example.com/notes' },
      { id: 48, title: 'Project notes', url: 'https://example.com/notes' },
    ],
    now + 2,
  );
  assert.equal(
    originalRestoredBesideDuplicate['47'],
    undefined,
    'the pre-existing duplicate remains unnamed after restoration',
  );
  assert.equal(
    originalRestoredBesideDuplicate['48']?.customName,
    'Research',
    'the restored tab receives the closed tab name',
  );
  const afterBrowserRestart = reconcileTabNames(
    duplicateStillOpen,
    [{ id: 47, title: 'Project notes', url: 'https://example.com/notes' }],
    now + 3,
    undefined,
    true,
  );
  assert.equal(
    afterBrowserRestart['47']?.customName,
    'Research',
    'close-time tab IDs are discarded when identity recovery spans a browser restart',
  );

  const restoredName = reconcileTabNames(
    renamed,
    [{ id: 44, title: 'Project notes', url: 'https://example.com/notes' }],
    now,
  );
  assert.equal(restoredName['44']?.customName, 'Research', 'a unique URL/title match restores a custom tab name');
  assert.equal(restoredName['12'], undefined, 'a restored name is removed from its stale tab ID');

  const restoredAfterDynamicTitle = reconcileTabNames(
    renamed,
    [{ id: 49, title: 'Project notes · updated', url: 'https://example.com/notes' }],
    now,
  );
  assert.equal(
    restoredAfterDynamicTitle['49']?.customName,
    'Research',
    'a unique URL restores a name when a page changes its title during restart',
  );
  assert.equal(
    restoredAfterDynamicTitle['49']?.originalTitle,
    'Project notes · updated',
    'the restored name records the page title after navigation',
  );

  const ambiguousName = reconcileTabNames(
    renamed,
    [
      { id: 45, title: 'Project notes', url: 'https://example.com/notes' },
      { id: 46, title: 'Project notes', url: 'https://example.com/notes' },
    ],
    now,
  );
  assert.equal(ambiguousName['45'], undefined, 'ambiguous duplicate tabs do not receive a possibly incorrect name');
  assert.equal(
    ambiguousName['12']?.customName,
    'Research',
    'the original metadata is kept when reattachment is ambiguous',
  );

  const ambiguousUrl = reconcileTabNames(
    renamed,
    [
      { id: 52, title: 'Project notes · updated', url: 'https://example.com/notes' },
      { id: 53, title: 'Project notes · another window', url: 'https://example.com/notes' },
    ],
    now,
  );
  assert.equal(ambiguousUrl['52'], undefined, 'a shared URL does not attach a name to one of multiple tabs');
  assert.equal(ambiguousUrl['53'], undefined, 'duplicate URLs remain unnamed when the match is ambiguous');
  assert.equal(
    ambiguousUrl['12']?.customName,
    'Research',
    'ambiguous URL metadata remains available for a later unique match',
  );

  const sameIdAfterRestart = reconcileTabNames(
    renamed,
    [{ id: 12, title: 'Different page', url: 'https://other.example/' }],
    now,
    undefined,
    true,
  );
  assert.equal(sameIdAfterRestart['12'], undefined, 'a reused tab ID cannot attach a stale name to a different page');
  assert.ok(
    Object.values(sameIdAfterRestart).some((name) => name.customName === 'Research'),
    'unmatched restart metadata remains available for a later unique match',
  );

  const sameIdExactRestore = reconcileTabNames(
    renamed,
    [{ id: 12, title: 'Project notes', url: 'https://example.com/notes' }],
    now,
    undefined,
    true,
  );
  assert.equal(
    sameIdExactRestore['12']?.customName,
    'Research',
    'same-ID restored tabs also require an exact identity match',
  );

  const activeName = reconcileTabNames(
    {
      12: { ...renamed['12'], tabId: 12 },
    },
    [{ id: 12, title: 'Updated page title', url: 'https://example.com/renamed' }],
    now,
  );
  assert.equal(activeName['12']?.url, 'https://example.com/renamed', 'active tab metadata follows navigation');
  assert.equal(
    activeName['12']?.originalTitle,
    'Updated page title',
    'active tab metadata follows dynamic page titles',
  );
  assert.equal(activeName['12']?.customName, 'Research', 'a long-lived active name is not discarded');

  const expired = reconcileTabNames(renamed, [], now + 91 * 24 * 60 * 60 * 1000);
  assert.equal(expired['12'], undefined, 'closed tab-name metadata expires after its retention period');

  const expiredBeforeRestore = reconcileTabNames(
    renamed,
    [{ id: 54, title: 'Project notes', url: 'https://example.com/notes' }],
    now + 91 * 24 * 60 * 60 * 1000,
  );
  assert.equal(
    expiredBeforeRestore['54'],
    undefined,
    'expired closed-tab names are not restored when the same page is opened later',
  );

  const longLivedTabClosedRecently = reconcileTabNames(
    {
      12: { ...renamed['12'], updatedAt: now - 120 * 24 * 60 * 60 * 1000, closedAt: now - 1000 },
    },
    [],
    now,
  );
  assert.equal(
    longLivedTabClosedRecently['12']?.customName,
    'Research',
    'closed-tab retention starts at closure, not last rename',
  );

  const longLivedOpenTabAmbiguous = reconcileTabNames(
    {
      12: { ...renamed['12'], updatedAt: now - 120 * 24 * 60 * 60 * 1000, closedAt: undefined },
    },
    [
      { id: 47, title: 'Project notes', url: 'https://example.com/notes' },
      { id: 48, title: 'Project notes', url: 'https://example.com/notes' },
    ],
    now,
    undefined,
    true,
  );
  assert.ok(
    Object.values(longLivedOpenTabAmbiguous).some((name) => name.customName === 'Research'),
    'an ambiguous open-tab name does not expire because it was created over 90 days ago',
  );

  const luminance = (hex) => {
    const channels = hex
      .match(/[a-f\d]{2}/gi)
      .map((part) => parseInt(part, 16) / 255)
      .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const contrast = (first, second) => {
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  for (const palette of themeRegistry) {
    assert.equal(
      typeof Object.getOwnPropertyDescriptor(palette, 'light')?.get,
      'function',
      `${palette.name} light tokens are generated on demand`,
    );
    assert.equal(
      typeof Object.getOwnPropertyDescriptor(palette, 'dark')?.get,
      'function',
      `${palette.name} dark tokens are generated on demand`,
    );
    assert.deepEqual(
      Object.keys(palette.light).sort(),
      [...themeTokenNames].sort(),
      `${palette.name} light theme includes exactly the shared tokens`,
    );
    assert.deepEqual(
      Object.keys(palette.dark).sort(),
      [...themeTokenNames].sort(),
      `${palette.name} dark theme includes exactly the shared tokens`,
    );
    for (const appearance of ['light', 'dark']) {
      assert.equal(
        palette.preview[appearance].background,
        palette[appearance]['--cc-bg'],
        `${palette.name} ${appearance} swatch matches its rendered background`,
      );
      assert.equal(
        palette.preview[appearance].accent,
        palette[appearance]['--cc-accent'],
        `${palette.name} ${appearance} swatch matches its contrast-corrected accent`,
      );
    }
    for (const scheme of [palette.light, palette.dark]) {
      assert.ok(
        contrast(scheme['--cc-border-strong'], scheme['--cc-bg']) >= 3,
        `${palette.name} scrollbar thumb meets WCAG 1.4.11 against the settings surface`,
      );
      const textSurfaces = [
        scheme['--cc-bg'],
        scheme['--cc-panel'],
        scheme['--cc-panel-raised'],
        scheme['--cc-input'],
        scheme['--cc-selection'],
        scheme['--cc-accent-soft'],
      ];
      for (const surface of textSurfaces) {
        for (const foreground of [scheme['--cc-text'], scheme['--cc-muted'], scheme['--cc-subtle']]) {
          assert.ok(
            contrast(foreground, surface) >= 4.5,
            `${palette.name} ${foreground} contrast is at least WCAG AA on ${surface}`,
          );
        }
      }
      assert.ok(
        contrast(scheme['--cc-accent-contrast'], scheme['--cc-accent']) >= 4.5,
        `${palette.name} action contrast is at least WCAG AA`,
      );
      assert.ok(
        contrast(scheme['--cc-accent'], scheme['--cc-panel']) >= 4.5,
        `${palette.name} accent text contrasts on its panel`,
      );
      assert.ok(
        contrast(scheme['--cc-accent'], scheme['--cc-accent-soft']) >= 4.5,
        `${palette.name} selected accent text contrasts on its surface`,
      );
      assert.ok(
        contrast(scheme['--cc-accent'], scheme['--cc-selection']) >= 4.5,
        `${palette.name} selected icon accent contrasts on its selection`,
      );
      assert.ok(
        contrast(scheme['--cc-danger'], scheme['--cc-panel']) >= 4.5,
        `${palette.name} destructive text contrasts on its panel`,
      );
      assert.ok(
        contrast(scheme['--cc-success'], scheme['--cc-panel']) >= 4.5,
        `${palette.name} success text contrasts on its panel`,
      );
      for (const surface of [
        scheme['--cc-bg'],
        scheme['--cc-panel'],
        scheme['--cc-selection'],
        scheme['--cc-accent-soft'],
      ]) {
        assert.ok(
          contrast(scheme['--cc-focus'], surface) >= 3,
          `${palette.name} focus indicator meets WCAG 1.4.11 on ${surface}`,
        );
      }
      for (const surface of [scheme['--cc-panel'], scheme['--cc-panel-raised'], scheme['--cc-input']]) {
        assert.ok(
          contrast(scheme['--cc-control-border'], surface) >= 3,
          `${palette.name} control border meets WCAG 1.4.11 on ${surface}`,
        );
      }
    }
  }
  assert.equal(
    new Set(themeRegistry.map((palette) => palette.id)).size,
    themeRegistry.length,
    'palette IDs are unique',
  );
  assert.equal(defaultThemePreferences.palette, 'plain', 'Plain is the default black-and-white palette');
  assert.equal(
    defaultThemePreferences.windowMode,
    'expanded',
    'Expanded preserves the existing results-first opening behavior',
  );
  assert.equal(
    normalizeThemePreferences({ palette: 'plain', windowMode: 'compact' }).windowMode,
    'compact',
    'Compact window mode persists through preference normalization',
  );
  assert.equal(
    normalizeThemePreferences({ palette: 'plain' }).windowMode,
    'expanded',
    'older preferences default to Expanded',
  );
  const oceanPalette = themeRegistry.find((palette) => palette.id === 't3-ocean');
  assert.equal(oceanPalette.preview.light.background, '#f5f7f8', 'Ocean light surfaces use the T3 Code palette colors');
  assert.equal(oceanPalette.preview.dark.background, '#17212b', 'Ocean dark surfaces use the T3 Code palette colors');
  assert.equal(
    oceanPalette.preview.light.accent,
    oceanPalette.light['--cc-accent'],
    'Ocean light swatch matches its contrast-corrected accent',
  );
  assert.equal(
    oceanPalette.preview.dark.accent,
    oceanPalette.dark['--cc-accent'],
    'Ocean dark swatch matches its contrast-corrected accent',
  );
  for (const paletteId of [
    'tobacco',
    'cursor-dark',
    'cursor-midnight',
    'vscode-dark-vs',
    'dracula',
    'catppuccin',
    'aurora',
    'gruvbox',
    'nordic',
    't3-code',
    't3-ocean',
  ]) {
    assert.ok(
      themeRegistry.some((palette) => palette.id === paletteId),
      `${paletteId} is available in the theme picker`,
    );
  }
  for (const removedPalette of [
    'abyss',
    'night-blue',
    'claude',
    'brutalist',
    'sakura',
    'chalk',
    'parchment',
    'solarized-dark',
    'solarized-light',
    'cursor-light',
    'vscode-dark-modern',
    'raycast',
  ]) {
    assert.equal(
      themeRegistry.some((palette) => palette.id === removedPalette),
      false,
      `${removedPalette} has been removed from the theme picker`,
    );
  }
  assert.equal(
    normalizeThemePreferences({ palette: 'slate' }).palette,
    'plain',
    'legacy Slate preferences migrate to Plain',
  );
  for (const [oldPalette, replacement] of Object.entries({
    clay: 'tobacco',
    claude: 'tobacco',
    abyss: 'aurora',
    'night-blue': 't3-ocean',
    'solarized-dark': 't3-ocean',
    'solarized-light': 'tobacco',
    'cursor-light': 't3-code',
    'vscode-dark-modern': 'vscode-dark-vs',
    brutalist: 'plain',
    sakura: 'catppuccin',
    chalk: 't3-code',
    parchment: 'tobacco',
  })) {
    assert.equal(
      normalizeThemePreferences({ palette: oldPalette }).palette,
      replacement,
      `${oldPalette} preference migrates to ${replacement}`,
    );
  }
  assert.match(previewHtml, /data-palette="plain"/, 'the design preview opens on the default palette');
  assert.match(previewHtml, /data-palette="t3-ocean"/, 'the design preview includes the requested Ocean palette');
  assert.equal(isOverlayPage('https://example.com'), true, 'regular websites support the injected command surfaces');
  assert.equal(isOverlayPage('chrome://settings/'), false, 'Chrome settings cannot host an injected surface');
  assert.equal(
    isOverlayPage('https://chromewebstore.google.com/'),
    false,
    'Chrome Web Store pages cannot host an injected surface',
  );
  assert.equal(
    isOverlayPage('https://chrome.google.com/webstore/category/extensions'),
    false,
    'legacy Chrome Web Store pages cannot host an injected surface',
  );
  assert.equal(
    displayDetails({
      type: 'command',
      id: 'reload',
      title: 'Reload tab',
      description: 'Reload page',
      category: 'Browser',
      action: 'tabs:reload',
      icon: '↻',
    }),
    '',
    'browser actions show their title without a description',
  );
  assert.equal(
    displayDetails({
      type: 'bookmark',
      id: 'bookmark',
      title: 'Saved page',
      subtitle: 'https://example.com/path',
      url: 'https://example.com/path',
      icon: '☆',
    }),
    '',
    'bookmarks omit their full address from the secondary line',
  );
  assert.match(
    resultsSource,
    /aria-description=\{item\.type === 'bookmark'/,
    'bookmarks expose their saved address to assistive technology without adding a visible subtitle',
  );
  assert.match(
    resultsSource,
    /title=\{item\.type === 'bookmark'/,
    'bookmarks expose their saved address in a hover tooltip',
  );
  assert.equal(
    displayDetails({ type: 'url', id: 'url', title: 'example.com', url: 'https://example.com/', icon: '↗' }),
    '',
    'direct navigation does not repeat the address',
  );
  assert.match(settingsSource, /role="radiogroup"/, 'palette options are a single accessible radio group');
  assert.match(settingsSource, /role="radio"/, 'palette choices expose radio semantics');
  assert.match(settingsSource, /aria-checked=\{active\}/, 'palette radios announce the selected choice');
  assert.match(settingsSource, /tabIndex=\{active \? 0 : -1\}/, 'palette radios use one roving keyboard tab stop');
  assert.match(settingsSource, /legend>Window mode</, 'Appearance settings expose the window mode choice');
  assert.match(
    settingsSource,
    /Show results after you start typing/,
    'Compact mode explains that results wait for a query',
  );
  assert.match(settingsSource, /Show suggestions when it opens/, 'Expanded mode explains that results appear on open');
  assert.match(globalStyles, /--cc-settings-inset:\s*16px;/, 'Compact settings use a slightly increased inset');
  assert.match(globalStyles, /--cc-settings-inset:\s*18px;/, 'Standard settings use a restrained inset');
  assert.match(globalStyles, /--cc-settings-inset:\s*20px;/, 'Wide settings use a 20px inset');
  assert.match(
    globalStyles,
    /@media \(max-width: 520px\)[\s\S]*?--cc-settings-inset:\s*16px;/,
    'narrow settings keep a modest inset',
  );
  assert.doesNotMatch(globalStyles, /\.settings-topbar/, 'Appearance no longer has a separate Back/Close topbar');
  assert.match(
    settingsSource,
    /className="mode-icon-button settings-back-icon"[\s\S]*?aria-label="Back to command search"/,
    'Appearance starts with an icon-only Back button',
  );
  assert.match(
    globalStyles,
    /\.settings-view\s*\{[^}]*padding:\s*var\(--cc-settings-inset\)/,
    'settings content aligns to the slightly expanded inset',
  );
  assert.match(
    globalStyles,
    /\.search-area\s*\{[^}]*padding:\s*0 var\(--cc-row-inset\)/,
    'the search header has matching 14px horizontal insets',
  );
  assert.match(
    globalStyles,
    /\.result-row\s*\{[^}]*margin:\s*0 0 4px;[^}]*padding:\s*10px 12px;/,
    'result rows use the requested inset and vertical gap',
  );
  assert.doesNotMatch(globalStyles, /\.search-area:focus-within/, 'focus does not accent the search separator');
  assert.match(
    globalStyles,
    /\.command-center\.is-overlay-surface\.is-compact-empty \.search-area\s*\{[^}]*border-bottom-color:\s*transparent/,
    'compact overlays show only the outer natural border',
  );
  assert.doesNotMatch(
    globalStyles,
    /border-bottom:\s*2px solid var\(--cc-focus\)/,
    'focus does not make the bottom border thicker',
  );
  assert.doesNotMatch(
    globalStyles,
    /\b\d*\.?\d+rem\b/,
    'shadow-root typography uses fixed CSS pixels, not the host page root font size',
  );
  assert.doesNotMatch(
    commandPaletteSource,
    /className="clear-search"|aria-label="Close command bar"/,
    'the search and Appearance headers no longer show X controls',
  );
  assert.doesNotMatch(
    previewHtml,
    /data-clear|data-close-preview|data-palette="claude"/,
    'the design preview matches the reduced header and palette list',
  );
  assert.doesNotMatch(
    previewHtml,
    /document\.querySelector\('\[data-clear\]'\)|document\.querySelector\('\[data-close-preview\]'\)/,
    'the design preview has no handlers for removed controls',
  );
  assert.match(
    commandPaletteSource,
    /preferences\.windowMode === 'compact' && !query\.trim\(\) && !activeProvider/,
    'Compact mode hides the initial unfiltered results',
  );
  assert.match(commandPaletteSource, /\{model\.showResults && \(/, 'results appear after typing in Compact mode');
  assert.match(
    commandPaletteSource,
    /!query\.trim\(\) && !activeProvider && !tabsReady/,
    'Expanded mode waits for the initial tab list before showing pinned tabs',
  );
  assert.match(
    commandPaletteSource,
    /isLoadingInitialTabs\s*=\s*mode === 'commands'/,
    'the expanded initial tab load has a visible loading state',
  );
  assert.match(
    commandPaletteSource,
    /onKeyDownCapture=\{model\.handleSurfaceEscape\}/,
    'Escape handling runs before focused child controls',
  );
  assert.match(
    commandPaletteSource,
    /if \(mode !== 'commands' \|\| activeProvider \|\| query\.trim\(\)\) \{\s*changeMode\('commands'\);\s*return;\s*\}\s*closeSurface\(\);/,
    'Escape resets a search mode before closing the Command Bar surface',
  );
  assert.match(
    popupHtml,
    /<script src="\/escape-guard\.js"><\/script>\s*<script type="module"/,
    'the popup Escape guard loads synchronously before the asynchronous React entry point',
  );
  assert.match(
    popupEscapeGuard,
    /event\.key !== 'Escape' \|\| document\.querySelector\('dialog\[open\]'\)[\s\S]*?setTimeout\(\(\) => \{[\s\S]*?event\.defaultPrevented[\s\S]*?window\.close\(\)/,
    'the early popup Escape guard defers to the Command Bar before closing',
  );
  assert.match(
    overlayListenersSource,
    /window\.addEventListener\('keydown', closeOnEscape, true\)/,
    'the page overlay catches Escape before its React surface finishes mounting',
  );
  assert.match(
    overlayListenersSource,
    /mountPoint\.querySelector\('dialog\[open\]'\)[\s\S]*?bridge\.pendingOpen/,
    'the early overlay Escape listener lets nested dialogs handle Escape and can cancel a pending open',
  );
  assert.match(previewHtml, /data-window-mode="compact"/, 'the design preview includes Compact window mode');
  assert.match(previewHtml, /data-window-mode="expanded"/, 'the design preview includes Expanded window mode');
  assert.match(
    globalStyles,
    /\.cc-overlay-stage \{[^}]*align-items: center;[^}]*justify-content: center;/,
    'the page overlay centers the Command Bar vertically and horizontally',
  );
  assert.doesNotMatch(
    globalStyles,
    /\.cc-overlay-stage:has\(>\s*\.command-center\)/,
    'the Command Bar no longer overrides centered overlay alignment',
  );
  assert.match(
    globalStyles,
    /--cc-bar-available:\s*min\(var\(--cc-bar-max-height\),\s*calc\(100dvh - 48px\)\)/,
    'the centered overlay retains equal viewport breathing room above and below',
  );
  assert.match(
    previewHtml,
    /\.stage \{[^}]*place-items:\s*center/,
    'the web-page design preview centers the Command Bar',
  );
  assert.doesNotMatch(
    previewHtml,
    /^\s*#command-surface \{[^}]*align-self:\s*start/m,
    'the web-page preview does not top-anchor the Command Bar',
  );
  assert.match(
    previewHtml,
    /\.stage\[data-location=['"]popup['"]\]\s+#command-surface\s*{[^}]*align-self:\s*flex-start/,
    'the native extension popup remains anchored at its top edge',
  );
  assert.doesNotMatch(previewHtml, /data-open="tabs"/, 'the Command Bar preview does not show the removed Tabs button');
  assert.match(
    previewHtml,
    /queryInput\.value = providerOriginQuery/,
    'the provider preview restores the command query when going back',
  );
  assert.doesNotMatch(
    previewHtml,
    /maps\.google\.com|drive\.google\.com|Navigate to this address/,
    'website and bookmark preview rows hide redundant addresses',
  );
  assert.match(
    productDoc,
    /opened with its keyboard shortcut on supported web pages/,
    'product docs describe the shortcut-only Tab Switcher',
  );
  for (const token of themeTokenNames) {
    const fallback = globalStyles.match(new RegExp(`${token}:\\s*([^;]+);`));
    assert.ok(fallback, `${token} has a CSS first-paint fallback`);
    assert.equal(
      fallback[1].trim(),
      themeRegistry[0].dark[token],
      `${token} fallback matches the default dark palette`,
    );
  }
  assert.match(globalStyles, /@media \(prefers-reduced-motion: reduce\)/, 'theme styling respects reduced motion');
  assert.match(globalStyles, /@media \(forced-colors: active\)/, 'theme styling supports forced colors');
  assert.match(
    globalStyles,
    /\.command-center\.is-overlay-surface \.settings-view\s*\{[^}]*max-height:\s*calc\(var\(--cc-bar-available\) - 2px\)/,
    'the settings view uses the overlay height without reserving a removed topbar',
  );

  const makeEvent = () => ({
    listeners: [],
    addListener(listener) {
      this.listeners.push(listener);
    },
    removeListener(listener) {
      this.listeners = this.listeners.filter((candidate) => candidate !== listener);
    },
  });
  const localStore = {};
  const sessionStore = {};
  const localWrites = [];
  const readStore = (store, keys) => {
    const requested = typeof keys === 'string' ? [keys] : keys;
    return structuredClone(Object.fromEntries(requested.map((key) => [key, store[key]])));
  };
  const writeStore = (store, values) => {
    Object.assign(store, structuredClone(values));
    if (store === localStore) localWrites.push(values);
    return Promise.resolve();
  };
  const browserEvents = {
    onActivated: makeEvent(),
    onRemoved: makeEvent(),
    onUpdated: makeEvent(),
    onCreated: makeEvent(),
    onMoved: makeEvent(),
    onAttached: makeEvent(),
    onDetached: makeEvent(),
  };
  const permissionEvents = { onAdded: makeEvent(), onRemoved: makeEvent() };
  const runtimeMessages = makeEvent();
  const installedEvents = { onInstalled: makeEvent(), onStartup: makeEvent() };
  const actionCalls = [];
  let activeTabQuery;
  const privilegedMutations = [];
  let permissionWindowOptions;
  let activeBackgroundTab = { id: 42, title: 'Shortcut settings', url: 'chrome://extensions/shortcuts', windowId: 1 };
  globalThis.chrome = {
    action: {
      onClicked: makeEvent(),
      openPopup: async () => {
        actionCalls.push({ type: 'openPopup' });
      },
      setPopup: async (details) => {
        actionCalls.push({ type: 'setPopup', ...details });
      },
    },
    commands: { onCommand: makeEvent() },
    runtime: {
      ...installedEvents,
      id: 'test',
      onMessage: runtimeMessages,
      getURL: (url) => `chrome-extension://test/${url}`,
      sendMessage: async () => undefined,
    },
    storage: {
      local: { get: async (keys) => readStore(localStore, keys), set: (values) => writeStore(localStore, values) },
      session: {
        get: async (keys) => readStore(sessionStore, keys),
        set: (values) => writeStore(sessionStore, values),
        remove: async () => undefined,
      },
    },
    tabs: {
      ...browserEvents,
      update: async (...args) => {
        privilegedMutations.push(args);
      },
      remove: async (...args) => {
        privilegedMutations.push(args);
      },
      get: async (id) =>
        id === activeBackgroundTab.id
          ? activeBackgroundTab
          : { id, url: 'https://example.test/old', title: 'Old title', windowId: 1, index: 0 },
      query: async (queryInfo) => {
        if (queryInfo?.active) {
          activeTabQuery = queryInfo;
          return [activeBackgroundTab];
        }
        return [];
      },
    },
    permissions: { ...permissionEvents, getAll: async () => ({ permissions: [] }) },
    scripting: { executeScript: async () => undefined },
    windows: {
      getLastFocused: async (filter) => {
        assert.deepEqual(filter, { windowTypes: ['normal'] }, 'active-tab lookup excludes extension popup windows');
        return { id: 1, type: 'normal' };
      },
      create: async (options) => {
        permissionWindowOptions = options;
        return { id: 99 };
      },
    },
  };
  await server.ssrLoadModule('/src/background/index.ts');
  await new Promise((resolve) => setTimeout(resolve, 0));
  browserEvents.onActivated.listeners[0]({ tabId: activeBackgroundTab.id });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(
    actionCalls.some(
      (call) =>
        call.type === 'setPopup' && call.tabId === activeBackgroundTab.id && call.popup === 'src/popup/index.html',
    ),
    'Chrome-native pages configure the extension action to open the Command Bar popup',
  );

  actionCalls.length = 0;
  const commandListener = globalThis.chrome.commands.onCommand.listeners[0];
  commandListener('open-tab-switcher', activeBackgroundTab);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(actionCalls, [], 'the Tab Switcher shortcut has no effect on Chrome-native pages');
  assert.equal(
    sessionStore.nextPaletteMode,
    undefined,
    'a blocked native-page Tab Switcher launch does not queue a popup',
  );

  commandListener('open-command-palette', activeBackgroundTab);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(
    actionCalls.some((call) => call.type === 'openPopup'),
    'the Command Bar shortcut opens its popup on Chrome-native pages',
  );
  assert.equal(sessionStore.nextPaletteMode, 'commands', 'the native-page popup receives Command Bar mode');

  const updatedListener = browserEvents.onUpdated.listeners.at(-1);
  updatedListener(
    9,
    { title: 'Unrenamed tab changed' },
    { id: 9, title: 'Unrenamed tab changed', url: 'https://example.test/' },
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(localWrites.length, 0, 'unrenamed tab title changes do not write extension storage');

  const messageHandler = runtimeMessages.listeners[0];
  const currentTabResponse = await new Promise((resolve) => {
    messageHandler({ action: 'tabs:current' }, { id: 'test' }, resolve);
  });
  assert.equal(
    currentTabResponse.success && currentTabResponse.data.id,
    activeBackgroundTab.id,
    'the active-tab lookup reads from the last normal browser window',
  );
  assert.deepEqual(
    activeTabQuery,
    { active: true, windowId: 1 },
    'the active-tab query is scoped to the normal browser window',
  );

  for (const [action, field] of [
    ['tabs:copy-url', 'url'],
    ['tabs:copy-title', 'title'],
  ]) {
    const copyResponse = await new Promise((resolve) => messageHandler({ action }, { id: 'test' }, resolve));
    assert.equal(copyResponse.success, true, `${action} accepts the active-tab command without an ID`);
    assert.equal(copyResponse.data, activeBackgroundTab[field] ?? '', `${action} resolves the active tab`);
    const explicitCopyResponse = await new Promise((resolve) =>
      messageHandler({ action, tabId: 7 }, { id: 'test' }, resolve),
    );
    assert.equal(explicitCopyResponse.success, true, `${action} still supports an explicit tab`);
    assert.equal(explicitCopyResponse.data, field === 'url' ? 'https://example.test/old' : 'Old title');
    const invalidCopyResponse = await new Promise((resolve) =>
      messageHandler({ action, tabId: '7' }, { id: 'test' }, resolve),
    );
    assert.equal(invalidCopyResponse.success, false, `${action} rejects invalid explicit IDs`);
  }

  const permissionPromptResponse = await new Promise((resolve) => {
    messageHandler({ action: 'permissions:open-request', permissions: ['history'] }, { id: 'test' }, resolve);
  });
  assert.equal(
    permissionPromptResponse.success && permissionPromptResponse.data,
    true,
    'overlay permission requests open an extension-owned prompt',
  );
  assert.match(
    permissionWindowOptions.url,
    /mode=permission-request&permissions=history/,
    'the permission prompt receives only the requested optional permissions',
  );

  for (const [payload, sender] of [
    [null, { id: 'test' }],
    [[], { id: 'test' }],
    [{ action: 'tabs:current' }, { id: 'other' }],
    [{ action: 'tabs:current' }, { id: 'test', tab: { id: 7 }, frameId: 1 }],
    [{ action: 'tabs:rename', tabId: '7', name: 'Bad' }, { id: 'test' }],
    [{ action: 'tabs:rename', tabId: -1, name: 'Bad' }, { id: 'test' }],
    [{ action: 'tabs:pin', tabId: 7, pinned: 'false' }, { id: 'test' }],
    [{ action: 'permissions:open-request', permissions: ['tabs'] }, { id: 'test' }],
    [{ action: 'permissions:remove', permissions: ['history'], origins: ['<all_urls>'] }, { id: 'test' }],
  ]) {
    const response = await new Promise((resolve) => messageHandler(payload, sender, resolve));
    assert.equal(response.success, false, 'invalid messages are rejected before any privileged operation');
  }

  assert.equal(privilegedMutations.length, 0, 'rejected payloads never reach tab mutations');

  const renameResponse = await new Promise((resolve) => {
    messageHandler({ action: 'tabs:rename', tabId: 7, name: 'Research' }, { id: 'test' }, resolve);
  });
  assert.equal(renameResponse.success, true, 'the background accepts a tab rename');
  assert.equal(localStore.renamedTabs['7'].customName, 'Research', 'custom names are stored as extension metadata');

  updatedListener(
    7,
    { title: 'Updated title', url: 'https://example.test/new' },
    {
      id: 7,
      title: 'Updated title',
      url: 'https://example.test/new',
    },
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(localStore.renamedTabs['7'].customName, 'Research', 'navigation keeps the custom tab name');
  assert.equal(
    localStore.renamedTabs['7'].originalTitle,
    'Updated title',
    'navigation updates the stored original title',
  );
  assert.equal(
    localStore.renamedTabs['7'].url,
    'https://example.test/new',
    'navigation updates the stored original URL',
  );

  const browserCalls = [];
  const recordBrowserCall = async (...args) => {
    browserCalls.push(args);
    return true;
  };
  Object.assign(chrome.tabs, {
    create: recordBrowserCall,
    reload: recordBrowserCall,
    goBack: recordBrowserCall,
    goForward: recordBrowserCall,
    getZoom: async () => 1,
    setZoom: recordBrowserCall,
    duplicate: async () => ({ id: 100 }),
    unsplit: recordBrowserCall,
    ungroup: recordBrowserCall,
  });
  chrome.windows.update = recordBrowserCall;
  chrome.sessions = { restore: recordBrowserCall };
  chrome.tabGroups = { update: recordBrowserCall };
  const dispatchedCommands = new Set();
  for (const toggled of [false, true]) {
    activeBackgroundTab = {
      id: 42,
      title: 'Contract tab',
      url: 'https://contract.test/',
      windowId: 1,
      index: 0,
      groupId: 3,
      splitViewId: 4,
      pinned: toggled,
      mutedInfo: { muted: toggled },
    };
    const group = { id: 3, windowId: 1, title: 'Contract group', color: 'blue', collapsed: toggled };
    const registeredCommands = getCommands({
      activeTab: activeBackgroundTab,
      activeGroup: group,
      tabCountInWindow: 2,
      tabsToRightCount: 1,
      activeGroupTabCount: 2,
      canUnsplitTabs: true,
    });
    for (const item of registeredCommands.filter((item) => item.action)) {
      // Interactive flows supply their fields later; these commands dispatch directly or after confirmation.
      assert.ok(!item.flow || item.flow === 'confirm-close', `${item.id}: add a contract for its new flow`);
      const payload = item.id === 'toggle-tab-group' ? { groupId: group.id, collapsed: !group.collapsed } : {};
      const response = await new Promise((resolve) =>
        messageHandler({ action: item.action, ...payload }, { id: 'test' }, resolve),
      );
      assert.equal(response.success, true, `${item.id} reaches its background handler: ${response.error ?? ''}`);
      dispatchedCommands.add(item.action);
    }
  }
  assert.ok(browserCalls.length > 0, 'registered commands exercise Chrome API adapters');
  console.log(`Command contracts passed for ${dispatchedCommands.size} background actions from the registry.`);

  const contextualTabs = toTabItems(
    [
      { id: 1, title: 'Current', url: 'https://current.test/', windowId: 1, index: 0, active: true, groupId: -1 },
      {
        id: 2,
        title: 'Grouped',
        url: 'https://grouped.test/',
        windowId: 1,
        index: 1,
        active: false,
        groupId: 4,
        groupTitle: '   ',
      },
      {
        id: 3,
        title: 'Other window',
        url: 'https://other.test/',
        windowId: 2,
        index: 0,
        active: true,
        groupId: -1,
        windowTitle: 'Window · Other window',
      },
    ],
    1,
  );
  assert.equal(contextualTabs[0].windowTitle, undefined, 'tabs in the current window do not repeat the window label');
  assert.equal(contextualTabs[1].groupTitle, 'Tab group', 'unnamed tab groups keep a visible, searchable label');
  assert.equal(
    contextualTabs[2].windowTitle,
    'Window · Other window',
    'tabs in another window retain their window context',
  );
  const extensionPageTabs = toTabItems(
    [
      {
        id: 2,
        title: 'Grouped',
        url: 'https://grouped.test/',
        windowId: 1,
        index: 0,
        active: false,
        groupId: -1,
        windowTitle: 'Window · Extension page',
      },
    ],
    99,
    1,
  );
  assert.equal(
    extensionPageTabs[0].windowTitle,
    undefined,
    'an active extension page does not mislabel same-window tabs as external-window tabs',
  );

  const synthetic = (count) =>
    toTabItems(
      Array.from({ length: count }, (_, index) => ({
        id: index,
        title: `Design workspace ${index}`,
        url: `https://example${index}.com/planning`,
        windowId: 1,
        index,
        active: false,
        pinned: index % 17 === 0,
      })),
      null,
    );
  const measureSearch = (items) => {
    const timings = [];
    const queries = ['design planning', 'desgn plannng', 'zzqxv no-such-page'];
    const coldStart = performance.now();
    const coldMatches = searchItems(items, queries[0], true);
    const coldMs = performance.now() - coldStart;
    assert.equal(coldMatches.length, 100, 'the cold realistic query returns a ranked result page');
    for (let index = 0; index < 5; index++) {
      for (const query of queries) searchItems(items, query, true);
    }
    for (let index = 0; index < 35; index++) {
      const query = queries[index % queries.length];
      const start = performance.now();
      const matches = searchItems(items, query, true);
      assert.equal(
        matches.length,
        query === queries[2] ? 0 : 100,
        'exact, fuzzy, and no-match benchmark queries exercise real search work',
      );
      timings.push(performance.now() - start);
    }
    timings.sort((a, b) => a - b);
    return {
      coldMs,
      p50: timings[Math.floor(timings.length * 0.5)],
      p95: timings[Math.ceil(timings.length * 0.95) - 1],
    };
  };
  const syntheticTabs = synthetic(2300);
  const syntheticStressTabs = synthetic(10000);
  const ordinaryTiming = measureSearch(syntheticTabs);
  const stressTiming = measureSearch(syntheticStressTabs);
  const ordinarySearchBudgetMs = 30;
  const stressSearchBudgetMs = 100;
  if (process.argv.includes('--benchmark')) {
    assert.ok(
      ordinaryTiming.p95 < ordinarySearchBudgetMs,
      `search over 2,300 realistic tabs stays under the ${ordinarySearchBudgetMs} ms p95 budget (actual: ${ordinaryTiming.p95.toFixed(2)} ms)`,
    );
    assert.ok(
      stressTiming.p95 < stressSearchBudgetMs,
      `stress search over 10,000 realistic tabs stays under the ${stressSearchBudgetMs} ms p95 budget (actual: ${stressTiming.p95.toFixed(2)} ms)`,
    );
  }

  console.log(`Search, tab-name persistence, and theme contrast checks passed.`);
  console.log(
    `Realistic tab search, 2,300 entries: cold ${ordinaryTiming.coldMs.toFixed(2)} ms, warm p50 ${ordinaryTiming.p50.toFixed(2)} ms, p95 ${ordinaryTiming.p95.toFixed(2)} ms.`,
  );
  console.log(
    `Realistic tab search, 10,000 entries: cold ${stressTiming.coldMs.toFixed(2)} ms, warm p50 ${stressTiming.p50.toFixed(2)} ms, p95 ${stressTiming.p95.toFixed(2)} ms.`,
  );
} finally {
  await server.close();
}
