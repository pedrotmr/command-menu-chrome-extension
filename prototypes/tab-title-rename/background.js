const OVERRIDES_KEY = 'titleOverrides';

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    void applySavedTitle(tabId, tab.url);
  }
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.tabs.query({}).then((tabs) => Promise.all(tabs.map((tab) => applySavedTitle(tab.id, tab.url))));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === 'title:apply') {
    void applyTitle(message.tabId, message.customName).then(sendResponse);
    return true;
  }

  if (message?.action === 'title:restore') {
    void restoreTitle(message.tabId).then(sendResponse);
    return true;
  }
});

async function applyTitle(tabId, customName) {
  const tab = await chrome.tabs.get(tabId);
  const origin = getOrigin(tab.url);
  const hasAccess = origin && (await chrome.permissions.contains({ origins: [`${origin}/*`] }));

  if (!hasAccess) return { success: false, reason: 'site-access-required' };

  const { [OVERRIDES_KEY]: overrides = {} } = await chrome.storage.local.get(OVERRIDES_KEY);
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: setPageTitle,
    args: [customName],
  });
  const originalTitle = result?.result?.originalTitle;
  overrides[String(tabId)] = { origin, customName, originalTitle };
  await chrome.storage.local.set({ [OVERRIDES_KEY]: overrides });
  return { success: true, originalTitle };
}

async function applySavedTitle(tabId, url) {
  if (tabId === undefined) return;

  const { [OVERRIDES_KEY]: overrides = {} } = await chrome.storage.local.get(OVERRIDES_KEY);
  const override = overrides[String(tabId)];
  const origin = getOrigin(url);

  if (!override || origin !== override.origin) return;

  try {
    await applyTitle(tabId, override.customName);
  } catch {
    // The site may not have been granted after a session restore.
  }
}

async function restoreTitle(tabId) {
  const { [OVERRIDES_KEY]: overrides = {} } = await chrome.storage.local.get(OVERRIDES_KEY);
  const override = overrides[String(tabId)];

  if (!override) return { success: false, reason: 'no-saved-title' };

  const tab = await chrome.tabs.get(tabId);

  if (getOrigin(tab.url) !== override.origin) {
    return { success: false, reason: 'origin-mismatch' };
  }

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: restorePageTitle,
      args: [override.originalTitle ?? '', override.customName],
    });

    if (!result?.result?.restored) {
      return { success: false, reason: 'title-not-overridden' };
    }
  } catch {
    return { success: false, reason: 'restore-failed' };
  }

  delete overrides[String(tabId)];
  await chrome.storage.local.set({ [OVERRIDES_KEY]: overrides });
  return { success: true };
}

function getOrigin(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : null;
  } catch {
    return null;
  }
}

function setPageTitle(customName) {
  const stateKey = '__keybarTitleRenamePrototype';
  const state = window[stateKey] ?? {
    originalTitle: document.title,
    observer: null,
  };
  state.customName = customName;
  window[stateKey] = state;
  document.title = customName;

  if (!state.observer) {
    state.observer = new MutationObserver(() => {
      if (document.title !== state.customName) document.title = state.customName;
    });
    state.observer.observe(document.head, { childList: true, characterData: true, subtree: true });
  }

  return { originalTitle: state.originalTitle };
}

function restorePageTitle(originalTitle, customName) {
  const stateKey = '__keybarTitleRenamePrototype';
  const state = window[stateKey];

  if (!state || state.customName !== customName) return { restored: false };

  state?.observer?.disconnect();
  delete window[stateKey];
  document.title = originalTitle;
  return { restored: true };
}
