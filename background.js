// Background service worker for Command Palette
console.log("Command Palette: Background service worker loaded");

// Helper function to check if URL is injectable
function isInjectableUrl(url) {
  if (!url) return false;

  // Chrome internal pages that cannot be injected
  const restrictedProtocols = [
    "chrome:",
    "chrome-extension:",
    "chrome-search:",
    "chrome-devtools:",
    "moz-extension:",
    "edge:",
    "about:",
    "moz:",
    "resource:",
  ];

  const restrictedUrls = [
    "chrome://newtab/",
    "chrome://new-tab-page/",
    "chrome://extensions/",
    "chrome://settings/",
    "chrome://history/",
    "chrome://downloads/",
    "chrome://bookmarks/",
    "chrome://flags/",
    "edge://newtab/",
    "about:blank",
    "about:newtab",
  ];

  // Normalize URL for comparison
  const normalizedUrl = url.toLowerCase().trim();

  // Check if URL starts with restricted protocols
  if (
    restrictedProtocols.some((protocol) => normalizedUrl.startsWith(protocol))
  ) {
    return false;
  }

  // Check if URL is in restricted list
  if (
    restrictedUrls.some((restrictedUrl) =>
      normalizedUrl.startsWith(restrictedUrl)
    )
  ) {
    return false;
  }

  // Additional check for data URLs and other edge cases
  if (
    normalizedUrl.startsWith("data:") ||
    normalizedUrl.startsWith("javascript:")
  ) {
    return false;
  }

  return true;
}

// Listen for keyboard command
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-command-palette") {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (tab && tab.id) {
        // Check if we can inject into this URL
        if (!isInjectableUrl(tab.url)) {
          console.log(
            "Cannot inject into this page, opening popup fallback:",
            tab.url
          );
          // Open popup as fallback for restricted pages
          try {
            await chrome.action.openPopup();
          } catch (popupError) {
            console.log("Popup failed, trying window approach:", popupError);
            // Fallback: create a new window with the popup content
            await chrome.windows.create({
              url: chrome.runtime.getURL("popup.html"),
              type: "popup",
              width: 680,
              height: 520,
              focused: true,
            });
          }
          return;
        }

        console.log("Attempting to inject into:", tab.url);

        try {
          // Try to send message to content script
          await chrome.tabs.sendMessage(tab.id, { action: "toggle-modal" });
        } catch (messageError) {
          console.log("Content script not ready, injecting...", messageError);

          // If content script is not ready, inject it manually
          try {
            // Double-check URL before injection
            if (!isInjectableUrl(tab.url)) {
              console.log("URL became restricted, cannot inject:", tab.url);
              return;
            }

            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["content.js"],
            });

            // Wait a bit for the script to initialize
            setTimeout(async () => {
              try {
                await chrome.tabs.sendMessage(tab.id, {
                  action: "toggle-modal",
                });
              } catch (retryError) {
                console.error(
                  "Failed to send message after injection:",
                  retryError
                );
              }
            }, 100);
          } catch (injectionError) {
            if (injectionError.message?.includes("chrome://")) {
              console.log("Cannot inject into chrome:// URL:", tab.url);
              try {
                chrome.notifications?.create({
                  type: "basic",
                  iconUrl:
                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                  title: "Command Palette",
                  message:
                    "Cannot open on this page. Try on a regular webpage.",
                });
              } catch (notificationError) {
                console.log("Notification failed:", notificationError);
              }
            } else {
              console.error("Failed to inject content script:", injectionError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error handling command:", error);
    }
  }
});

// Listen for browser action click (fallback method)
// Note: This will only trigger if no popup is configured or popup fails to open
chrome.action.onClicked.addListener(async (tab) => {
  console.log(
    "Browser action clicked - this should not happen with popup configured"
  );

  if (tab && tab.id) {
    // Check if we can inject into this URL
    if (!isInjectableUrl(tab.url)) {
      console.log(
        "Cannot inject into this page, opening window fallback:",
        tab.url
      );
      // Create a new window with the popup content as fallback
      await chrome.windows.create({
        url: chrome.runtime.getURL("popup.html"),
        type: "popup",
        width: 680,
        height: 520,
        focused: true,
      });
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { action: "toggle-modal" });
    } catch (error) {
      console.log("Content script not ready, injecting...", error);

      try {
        // Double-check URL before injection
        if (!isInjectableUrl(tab.url)) {
          console.log("URL became restricted, cannot inject:", tab.url);
          return;
        }

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        });

        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id, { action: "toggle-modal" });
          } catch (retryError) {
            console.error(
              "Failed to send message after injection:",
              retryError
            );
          }
        }, 100);
      } catch (injectionError) {
        console.error("Failed to inject content script:", injectionError);
      }
    }
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background: Received message:", message.action);

  (async () => {
    try {
      switch (message.action) {
        case "get-bookmarks":
          console.log("Background: Received get-bookmarks request");
          const bookmarks = await chrome.bookmarks.getTree();
          console.log(
            "Background: Retrieved bookmarks:",
            bookmarks.length,
            "root nodes"
          );
          sendResponse({ bookmarks });
          break;

        case "create-tab":
          await chrome.tabs.create({ url: message.url });
          sendResponse({ success: true });
          break;

        case "reload-tab":
          await chrome.tabs.reload(sender.tab.id);
          sendResponse({ success: true });
          break;

        case "go-back":
          await chrome.tabs.goBack(sender.tab.id);
          sendResponse({ success: true });
          break;

        case "go-forward":
          await chrome.tabs.goForward(sender.tab.id);
          sendResponse({ success: true });
          break;

        case "new-incognito-window":
          await chrome.windows.create({ incognito: true });
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ error: "Unknown action" });
      }
    } catch (error) {
      console.error("Error in background script:", error);
      sendResponse({ error: error.message });
    }
  })();

  // Return true to indicate we'll send a response asynchronously
  return true;
});
