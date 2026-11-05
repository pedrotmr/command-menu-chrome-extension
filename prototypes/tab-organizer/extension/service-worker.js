const HOST = 'com.keybar.tab_organizer';
const CLOSED_KEY = 'recentClosedTabs';
const MAX_TABS = 100;
let activeHostPort;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return false;

  if (message.type === 'cancel-analysis') {
    activeHostPort?.disconnect();
    activeHostPort = undefined;
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
      return requestHost({ action: 'sign-in' });
    case 'disconnect':
      return requestHost({ action: 'disconnect' });
    case 'analyze': {
      const tabs = await getEligibleTabs();
      if (tabs.length < 2) throw new Error('Open at least two web tabs, or load the sample tabs first.');
      if (tabs.length > MAX_TABS) throw new Error(`This prototype analyzes up to ${MAX_TABS} tabs at a time.`);
      return requestHost({ action: 'analyze', tabs });
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
      url: String(tab.url).slice(0, 2048),
      pinned: Boolean(tab.pinned),
      group: tab.groupId >= 0 ? groupById.get(tab.groupId) || 'Existing group' : '',
    }));
}

function requestHost(payload) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let port;
    try {
      port = chrome.runtime.connectNative(HOST);
    } catch {
      reject(new Error('Local AI host is unavailable. Follow the setup steps in the prototype README.'));
      return;
    }
    activeHostPort = port;
    port.onMessage.addListener((reply) => {
      if (settled) return;
      settled = true;
      activeHostPort = undefined;
      port.disconnect();
      if (reply?.ok) resolve(reply.data);
      else reject(new Error(reply?.error || 'The local AI host could not complete the request.'));
    });
    port.onDisconnect.addListener(() => {
      if (activeHostPort === port) activeHostPort = undefined;
      if (!settled) {
        const detail = chrome.runtime.lastError?.message;
        reject(
          new Error(
            detail
              ? `Local AI host failed to start (${detail}). Follow the prototype README setup steps.`
              : 'The local AI host disconnected before replying. No tabs were changed; try again.',
          ),
        );
      }
    });
    port.postMessage(payload);
  });
}

async function applyProposal(selection) {
  if (!selection || !Array.isArray(selection.groups) || !Array.isArray(selection.closeIds)) {
    throw new Error('The selected proposal is invalid. Analyze the tabs again.');
  }
  const liveTabs = await chrome.tabs.query({});
  const liveById = new Map(liveTabs.filter((tab) => tab.id !== undefined).map((tab) => [tab.id, tab]));
  const closed = [];
  const skipped = [];
  const appliedGroups = [];

  for (const group of selection.groups) {
    const groupsByWindow = new Map();
    for (const original of group.tabs) {
      const current = liveById.get(original.id);
      if (!current || current.url !== original.url || current.windowId === undefined) {
        skipped.push(original.title);
        continue;
      }
      const windowTabs = groupsByWindow.get(current.windowId) || [];
      windowTabs.push(current.id);
      groupsByWindow.set(current.windowId, windowTabs);
    }
    for (const tabIds of groupsByWindow.values()) {
      if (tabIds.length < 2) {
        skipped.push(group.name);
        continue;
      }
      try {
        const groupId = await chrome.tabs.group({ tabIds });
        await chrome.tabGroups.update(groupId, { title: group.name.slice(0, 60) });
        appliedGroups.push(group.name);
      } catch {
        skipped.push(group.name);
      }
    }
  }

  const toClose = [];
  for (const original of selection.closeIds) {
    const current = liveById.get(original.id);
    if (!current || current.url !== original.url || current.pinned || original.pinned) {
      skipped.push(original.title);
      continue;
    }
    toClose.push(current);
  }
  for (const tab of toClose) {
    try {
      await chrome.tabs.remove(tab.id);
      closed.push({ title: tab.title || 'Untitled tab', url: tab.url, windowId: tab.windowId });
    } catch {
      skipped.push(tab.title || 'Untitled tab');
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
  for (const tab of tabs) {
    try {
      await chrome.tabs.create({ url: tab.url, windowId: tab.windowId, active: false });
      reopened.push(tab.title);
    } catch {
      reopened.push(`${tab.title} (opened in the current window)`);
      await chrome.tabs.create({ url: tab.url, active: false });
    }
  }
  await chrome.storage.session.remove(CLOSED_KEY);
  return { reopened };
}

function safeError(error) {
  return error instanceof Error ? error.message : 'The browser action failed.';
}
