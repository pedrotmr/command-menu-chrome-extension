const nameInput = document.querySelector('#custom-name');
const status = document.querySelector('#status');
const tabIdParameter = new URLSearchParams(location.search).get('tabId');
const targetTab = tabIdParameter
  ? chrome.tabs.get(Number(tabIdParameter))
  : chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => tab);

document.querySelector('#apply').addEventListener('click', async () => {
  const tab = await targetTab;

  if (!tab?.id) {
    status.textContent = 'No regular tab is available.';
    return;
  }

  const url = new URL(tab.url);

  if (!['http:', 'https:'].includes(url.protocol)) {
    status.textContent = 'Chrome does not allow access to this page.';
    return;
  }

  const origin = `${url.origin}/*`;
  const granted = await chrome.permissions.request({ origins: [origin] });

  if (!granted) {
    status.textContent = 'Site access was not granted.';
    return;
  }

  const result = await chrome.runtime.sendMessage({
    action: 'title:apply',
    tabId: tab.id,
    customName: nameInput.value.trim(),
  });
  status.textContent = result.success ? 'Custom title applied.' : 'Could not apply the title.';
});

document.querySelector('#restore').addEventListener('click', async () => {
  const tab = await targetTab;

  if (!tab?.id) {
    status.textContent = 'No regular tab is available.';
    return;
  }

  const result = await chrome.runtime.sendMessage({ action: 'title:restore', tabId: tab.id });
  status.textContent = result.success ? 'Original title restored.' : 'No active custom title on this page.';
});
