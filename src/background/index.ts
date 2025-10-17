import { isInjectableUrl } from '@/utils/chromeHelpers';

console.log('Command Palette: Background service worker loaded');

// Track the previously active tab
let previousTabId: number | null = null;
let currentTabId: number | null = null;

// Track tab changes to remember the previous tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (currentTabId !== null && currentTabId !== activeInfo.tabId) {
    previousTabId = currentTabId;
  }
  currentTabId = activeInfo.tabId;
});

// Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-command-palette') {
    await handleOpenCommandPalette();
  } else if (command === 'copy-url') {
    await handleCopyUrl();
  } else if (command === 'toggle-previous-tab') {
    await handleTogglePreviousTab();
  }
});

async function handleOpenCommandPalette() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) return;

    // Check if we can inject into this URL
    if (!isInjectableUrl(tab.url || '')) {
      console.log('Cannot inject into this page, opening popup fallback:', tab.url);
      try {
        await chrome.action.openPopup();
      } catch (popupError) {
        console.log('Popup failed, trying window approach:', popupError);
        await chrome.windows.create({
          url: chrome.runtime.getURL('src/popup/index.html'),
          type: 'popup',
          width: 680,
          height: 520,
          focused: true,
        });
      }
      return;
    }

    console.log('Attempting to inject into:', tab.url);

    try {
      // Try to send message to content script
      await chrome.tabs.sendMessage(tab.id, { action: 'toggle-modal' });
    } catch (messageError) {
      console.log('Content script not ready, injecting...', messageError);

      // If content script is not ready, inject it manually
      try {
        if (!isInjectableUrl(tab.url || '')) {
          console.log('URL became restricted, cannot inject:', tab.url);
          return;
        }

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/index.tsx'],
        });

        // Wait for script to initialize
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id!, { action: 'toggle-modal' });
          } catch (retryError) {
            console.error('Failed to send message after injection:', retryError);
          }
        }, 100);
      } catch (injectionError: any) {
        if (injectionError.message?.includes('chrome://')) {
          console.log('Cannot inject into chrome:// URL:', tab.url);
          try {
            await chrome.notifications?.create({
              type: 'basic',
              iconUrl: chrome.runtime.getURL('icon-48.png'),
              title: 'Command Palette',
              message: 'Cannot open on this page. Try on a regular webpage.',
            });
          } catch (notificationError) {
            console.log('Notification failed:', notificationError);
          }
        } else {
          console.error('Failed to inject content script:', injectionError);
        }
      }
    }
  } catch (error) {
    console.error('Error handling command:', error);
  }
}

async function handleCopyUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) return;

    if (!isInjectableUrl(tab.url || '')) {
      console.log('Cannot inject into this page:', tab.url);
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'copy-url' });
    } catch (messageError) {
      console.log('Content script not ready for copy-url');
    }
  } catch (error) {
    console.error('Error handling copy-url command:', error);
  }
}

async function handleTogglePreviousTab() {
  try {
    if (previousTabId !== null) {
      await chrome.tabs.update(previousTabId, { active: true });
    }
  } catch (error) {
    console.error('Error toggling to previous tab:', error);
    previousTabId = null;
  }
}

// Listen for browser action click (fallback method)
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Browser action clicked');

  if (!tab || !tab.id) return;

  if (!isInjectableUrl(tab.url || '')) {
    console.log('Cannot inject into this page, opening window fallback:', tab.url);
    await chrome.windows.create({
      url: chrome.runtime.getURL('src/popup/index.html'),
      type: 'popup',
      width: 680,
      height: 520,
      focused: true,
    });
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'toggle-modal' });
  } catch (error) {
    console.log('Content script not ready, injecting...', error);

    try {
      if (!isInjectableUrl(tab.url || '')) {
        console.log('URL became restricted, cannot inject:', tab.url);
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/index.tsx'],
      });

      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id!, { action: 'toggle-modal' });
        } catch (retryError) {
          console.error('Failed to send message after injection:', retryError);
        }
      }, 100);
    } catch (injectionError) {
      console.error('Failed to inject content script:', injectionError);
    }
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background: Received message:', message.action);

  (async () => {
    try {
      switch (message.action) {
        case 'get-bookmarks':
          console.log('Background: Received get-bookmarks request');
          const bookmarks = await chrome.bookmarks.getTree();
          console.log('Background: Retrieved bookmarks:', bookmarks.length, 'root nodes');
          sendResponse({ bookmarks });
          break;

        case 'create-tab':
          await chrome.tabs.create({ url: message.url });
          sendResponse({ success: true });
          break;

        case 'reload-tab':
          if (sender.tab?.id) {
            await chrome.tabs.reload(sender.tab.id);
          }
          sendResponse({ success: true });
          break;

        case 'go-back':
          if (sender.tab?.id) {
            await chrome.tabs.goBack(sender.tab.id);
          }
          sendResponse({ success: true });
          break;

        case 'go-forward':
          if (sender.tab?.id) {
            await chrome.tabs.goForward(sender.tab.id);
          }
          sendResponse({ success: true });
          break;

        case 'new-incognito-window':
          await chrome.windows.create({ incognito: true });
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error: any) {
      console.error('Error in background script:', error);
      sendResponse({ error: error.message });
    }
  })();

  // Return true to indicate we'll send a response asynchronously
  return true;
});
