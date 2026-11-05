const HOST = 'com.keybar.tab_organizer';
const CLOSED_KEY = 'recentClosedTabs';
const MAX_TABS = 100;
const HOST_REQUEST_TIMEOUT_MS = 2 * 60 * 1000;
const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000;
let activeAnalysis;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return false;

  if (message.type === 'cancel-analysis') {
    cancelActiveAnalysis();
    sendResponse({ ok: true });
    return false;
  }

  void handleMessage(message).then(
    (result) => sendResponse({ ok: true, result }),
    (error) => sendResponse({ ok: false, error: safeError(error) }),
  );
  return true;
});

async function handleMessage(message) {
  switch (message.type) {
    case 'session':
      return requestHost({ action: 'session' });
    case 'connect':
      return requestHost({ action: 'sign-in' }, { timeoutMs: SIGN_IN_TIMEOUT_MS });
    case 'disconnect':
      return requestHost({ action: 'disconnect' });
    case 'analyze':
      return analyzeTabs();
    case 'has-reopenable-tabs': {
      const stored = await chrome.storage.session.get(CLOSED_KEY);
      return Array.isArray(stored[CLOSED_KEY]) && stored[CLOSED_KEY].length > 0;
    }
    case 'apply':
      return applyProposal(message.selection);
    case 'load-sample':
      return loadSampleTabs();
    case 'reopen':
      return reopenLastClosedTabs();
    default:
      throw new Error('Unknown prototype action.');
  }
}

async function analyzeTabs() {
  if (activeAnalysis) throw new Error('An analysis is already running.');
  const analysis = { cancelled: false, cancelHostRequest: undefined };
  activeAnalysis = analysis;
  try {
    const tabs = await getEligibleTabs();
    if (analysis.cancelled) throw new Error('Analysis cancelled. No tabs were changed.');
    if (tabs.length < 2) throw new Error('Open at least two web tabs, or load the sample tabs first.');
    if (tabs.length > MAX_TABS) throw new Error(`This prototype analyzes up to ${MAX_TABS} tabs at a time.`);
    const result = await requestHost({ action: 'analyze', tabs }, { analysis, timeoutMs: HOST_REQUEST_TIMEOUT_MS });
    if (analysis.cancelled) throw new Error('Analysis cancelled. No tabs were changed.');
    return result;
  } finally {
    if (activeAnalysis === analysis) activeAnalysis = undefined;
  }
}

function cancelActiveAnalysis() {
  if (!activeAnalysis) return;
  activeAnalysis.cancelled = true;
  activeAnalysis.cancelHostRequest?.();
}

async function getEligibleTabs() {
  const [tabs, groups] = await Promise.all([chrome.tabs.query({}), chrome.tabGroups.query({})]);
  const groupById = new Map(groups.map((group) => [group.id, group.title || 'Untitled group']));
  return tabs
    .filter((tab) => {
      const url = tab.url || '';
      return tab.id !== undefined && (/^https?:\/\//i.test(url) || url.startsWith(chrome.runtime.getURL('sample/')));
    })
    .map((tab) => ({
      id: tab.id,
      title: String(tab.title || 'Untitled tab').slice(0, 300),
      url: String(tab.url),
      pinned: Boolean(tab.pinned),
      group: tab.groupId >= 0 ? groupById.get(tab.groupId) || 'Existing group' : '',
    }));
}

function requestHost(payload, { analysis, timeoutMs = HOST_REQUEST_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout;
    let port;

    const settle = (callback, value) => {
      if (settled) return false;
      settled = true;
      clearTimeout(timeout);
      if (analysis?.cancelHostRequest === cancel) analysis.cancelHostRequest = undefined;
      callback(value);
      return true;
    };

    const cancel = () => {
      if (!settle(reject, new Error('Analysis cancelled. No tabs were changed.'))) return;
      port.disconnect();
    };

    try {
      port = chrome.runtime.connectNative(HOST);
    } catch {
      reject(new Error('Local AI host is unavailable. Follow the setup steps in the prototype README.'));
      return;
    }

    port.onMessage.addListener((reply) => {
      if (settled) return;
      if (reply?.ok) settle(resolve, reply.data);
      else settle(reject, new Error(reply?.error || 'The local AI host could not complete the request.'));
      port.disconnect();
    });
    port.onDisconnect.addListener(() => {
      if (settled) return;
      const detail = chrome.runtime.lastError?.message;
      settle(
        reject,
        new Error(
          detail
            ? `Local AI host failed to start (${detail}). Follow the prototype README setup steps.`
            : 'The local AI host disconnected before replying. No tabs were changed; try again.',
        ),
      );
    });

    timeout = setTimeout(() => {
      const didTimeout = settle(
        reject,
        new Error('The local AI host did not reply in time. No tabs were changed; try again.'),
      );
      if (didTimeout) port.disconnect();
    }, timeoutMs);

    if (analysis) {
      analysis.cancelHostRequest = cancel;
      if (analysis.cancelled) {
        cancel();
        return;
      }
    }

    try {
      port.postMessage(payload);
    } catch {
      const didFail = settle(reject, new Error('The local AI host could not receive the request. Try again.'));
      if (didFail) port.disconnect();
    }
  });
}

async function applyProposal(selection) {
  if (!selection || !Array.isArray(selection.groups) || !Array.isArray(selection.closeIds)) {
    throw new Error('The selected proposal is invalid. Analyze the tabs again.');
  }
  const closed = [];
  const skipped = [];
  const appliedGroups = [];

  for (const group of selection.groups) {
    const groupsByWindow = new Map();
    const initialTabs = await Promise.all(
      group.tabs.map(async (original) => {
        try {
          return { original, current: await chrome.tabs.get(original.id) };
        } catch {
          return { original, current: undefined };
        }
      }),
    );
    for (const { original, current } of initialTabs) {
      if (
        !current ||
        original.pinned ||
        current.pinned ||
        current.url !== original.url ||
        current.windowId === undefined
      ) {
        skipped.push(original.title);
        continue;
      }
      const windowTabs = groupsByWindow.get(current.windowId) || [];
      windowTabs.push(original);
      groupsByWindow.set(current.windowId, windowTabs);
    }

    for (const [windowId, originals] of groupsByWindow) {
      const latestTabs = await Promise.all(
        originals.map(async (original) => {
          try {
            return { original, current: await chrome.tabs.get(original.id) };
          } catch {
            return { original, current: undefined };
          }
        }),
      );
      const tabIds = [];
      for (const { original, current } of latestTabs) {
        if (
          !current ||
          original.pinned ||
          current.pinned ||
          current.url !== original.url ||
          current.windowId !== windowId
        ) {
          skipped.push(original.title);
          continue;
        }
        tabIds.push(current.id);
      }
      if (tabIds.length < 2) {
        skipped.push(group.name);
        continue;
      }
      try {
        const groupId = await chrome.tabs.group({ tabIds, createProperties: { windowId } });
        await chrome.tabGroups.update(groupId, { title: group.name.slice(0, 60) });
        appliedGroups.push(group.name);
      } catch {
        skipped.push(group.name);
      }
    }
  }

  for (const original of selection.closeIds) {
    if (!original || !Number.isSafeInteger(original.id) || typeof original.url !== 'string' || original.pinned) {
      skipped.push(original?.title || 'Unknown tab');
      continue;
    }
    let current;
    try {
      current = await chrome.tabs.get(original.id);
    } catch {
      skipped.push(original.title || 'Untitled tab');
      continue;
    }
    if (current.url !== original.url || current.pinned) {
      skipped.push(original.title || 'Untitled tab');
      continue;
    }
    try {
      await chrome.tabs.remove(current.id);
      closed.push({ title: current.title || 'Untitled tab', url: current.url, windowId: current.windowId });
    } catch {
      skipped.push(current.title || 'Untitled tab');
    }
  }

  if (closed.length) await chrome.storage.session.set({ [CLOSED_KEY]: closed });
  return { appliedGroups, closedCount: closed.length, skipped };
}

async function loadSampleTabs() {
  const definitions = [
    ['Product docs', 'Getting started with Keybar', 'product-a'],
    ['Product docs', 'Keybar keyboard shortcuts', 'product-b'],
    ['Product docs', 'Getting started with Keybar', 'product-a'],
    ['Research notes', 'Chrome tab grouping research', 'research-a'],
    ['Research notes', 'Native messaging overview', 'research-b'],
    ['Trip planning', 'Lisbon weekend itinerary', 'travel-a'],
    ['Trip planning', 'Lisbon transit and neighborhoods', 'travel-b'],
  ];
  const samplePrefix = chrome.runtime.getURL('sample/page.html');
  const currentWindowTabs = await chrome.tabs.query({ currentWindow: true });
  if (currentWindowTabs.some((tab) => (tab.url || '').startsWith(samplePrefix))) {
    return { opened: 0, alreadyLoaded: true };
  }
  for (const [topic, title, page] of definitions) {
    const url = samplePrefix;
    await chrome.tabs.create({
      url: `${url}?page=${encodeURIComponent(page)}&topic=${encodeURIComponent(topic)}&title=${encodeURIComponent(title)}`,
      active: false,
    });
  }
  return { opened: definitions.length };
}

async function reopenLastClosedTabs() {
  const stored = await chrome.storage.session.get(CLOSED_KEY);
  const tabs = Array.isArray(stored[CLOSED_KEY]) ? stored[CLOSED_KEY] : [];
  const reopened = [];
  const failed = [];
  for (const tab of tabs) {
    try {
      await chrome.tabs.create({ url: tab.url, windowId: tab.windowId, active: false });
      reopened.push(tab.title);
    } catch {
      try {
        await chrome.tabs.create({ url: tab.url, active: false });
        reopened.push(`${tab.title} (opened in the current window)`);
      } catch {
        failed.push(tab);
      }
    }
  }
  if (failed.length) await chrome.storage.session.set({ [CLOSED_KEY]: failed });
  else await chrome.storage.session.remove(CLOSED_KEY);
  return { reopened, failed: failed.map((tab) => tab.title), hasMore: failed.length > 0 };
}

function safeError(error) {
  return error instanceof Error ? error.message : 'The browser action failed.';
}
