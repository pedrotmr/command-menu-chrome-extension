import { Command } from '@/types';

export async function executeCommand(command: Command): Promise<void> {
  const commandMap: Record<string, () => Promise<void>> = {
    'reload-page': async () => {
      await chrome.runtime.sendMessage({ action: 'reload-tab' });
    },
    'new-tab': async () => {
      await chrome.runtime.sendMessage({ action: 'create-tab', url: 'chrome://newtab/' });
    },
    'go-back': async () => {
      await chrome.runtime.sendMessage({ action: 'go-back' });
    },
    'go-forward': async () => {
      await chrome.runtime.sendMessage({ action: 'go-forward' });
    },
    'extensions-page': async () => {
      await chrome.runtime.sendMessage({ action: 'create-tab', url: 'chrome://extensions/' });
    },
    'shortcuts-page': async () => {
      await chrome.runtime.sendMessage({ action: 'create-tab', url: 'chrome://extensions/shortcuts' });
    },
    'history-page': async () => {
      await chrome.runtime.sendMessage({ action: 'create-tab', url: 'chrome://history/' });
    },
    'downloads-page': async () => {
      await chrome.runtime.sendMessage({ action: 'create-tab', url: 'chrome://downloads/' });
    },
    'settings-page': async () => {
      await chrome.runtime.sendMessage({ action: 'create-tab', url: 'chrome://settings/' });
    },
    'new-incognito-window': async () => {
      await chrome.runtime.sendMessage({ action: 'new-incognito-window' });
    },
    'chrome-web-store': async () => {
      await chrome.runtime.sendMessage({ action: 'create-tab', url: 'https://chromewebstore.google.com/' });
    },
  };

  const executor = commandMap[command.id];
  if (executor) {
    await executor();
  } else {
    console.error('Unknown command:', command.id);
  }
}

export function isInjectableUrl(url: string): boolean {
  if (!url) return false;

  const restrictedProtocols = [
    'chrome:',
    'chrome-extension:',
    'chrome-search:',
    'chrome-devtools:',
    'moz-extension:',
    'edge:',
    'about:',
    'moz:',
    'resource:',
  ];

  const restrictedUrls = [
    'chrome://newtab/',
    'chrome://new-tab-page/',
    'chrome://extensions/',
    'chrome://settings/',
    'chrome://history/',
    'chrome://downloads/',
    'chrome://bookmarks/',
    'chrome://flags/',
    'edge://newtab/',
    'about:blank',
    'about:newtab',
  ];

  const normalizedUrl = url.toLowerCase().trim();

  if (restrictedProtocols.some((protocol) => normalizedUrl.startsWith(protocol))) {
    return false;
  }

  if (restrictedUrls.some((restrictedUrl) => normalizedUrl.startsWith(restrictedUrl))) {
    return false;
  }

  if (normalizedUrl.startsWith('data:') || normalizedUrl.startsWith('javascript:')) {
    return false;
  }

  return true;
}
