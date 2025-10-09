// Content script for Command Palette Modal
console.log("Command Palette: Content script loaded");

// Prevent multiple injections
if (window.commandPaletteInjected) {
  console.log("Command Palette: Already injected, skipping...");
} else {
  window.commandPaletteInjected = true;

  let selectedIndex = 0;
  let allItems = [];
  let filteredItems = [];
  let bookmarks = [];
  let modalElement = null;
  let isModalOpen = false;

  // Default commands
  const commands = [
    { id: "reload-page", title: "Reload Page", icon: "🔄", type: "command" },
    { id: "new-tab", title: "Open New Tab", icon: "📄", type: "command" },
    { id: "go-back", title: "Go Back", icon: "⬅️", type: "command" },
    { id: "go-forward", title: "Go Forward", icon: "➡️", type: "command" },
    {
      id: "extensions-page",
      title: "Open Extensions",
      icon: "🧩",
      type: "command",
    },
    {
      id: "shortcuts-page",
      title: "Open Keyboard Shortcuts",
      icon: "⌨️",
      type: "command",
    },
    { id: "history-page", title: "Open History", icon: "📚", type: "command" },
    {
      id: "downloads-page",
      title: "Open Downloads",
      icon: "⬇️",
      type: "command",
    },
    {
      id: "settings-page",
      title: "Open Settings",
      icon: "⚙️",
      type: "command",
    },
    {
      id: "new-incognito-window",
      title: "New Incognito Window",
      icon: "🕵️",
      type: "command",
    },
  ];

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggle-modal") {
      toggleModal();
      sendResponse({ success: true });
    }
  });

  // Initialize modal
  async function initModal() {
    if (modalElement) return;

    try {
      // Fetch modal HTML
      const modalUrl = chrome.runtime.getURL("modal.html");
      const response = await fetch(modalUrl);
      const modalHtml = await response.text();

      // Create modal element
      modalElement = document.createElement("div");
      modalElement.innerHTML = modalHtml;
      modalElement = modalElement.firstElementChild;

      // Append to body
      document.body.appendChild(modalElement);

      // Set up event listeners first
      setupEventListeners();

      // Load bookmarks
      await loadBookmarks();

      // Combine commands and bookmarks
      allItems = [...commands, ...bookmarks];
      filteredItems = allItems;

      console.log(
        "Command Palette: Modal initialized with",
        allItems.length,
        "total items"
      );
    } catch (error) {
      console.error("Error initializing modal:", error);
    }
  }

  function setupEventListeners() {
    const searchInput = document.getElementById("commandPaletteSearchInput");
    const backdrop = document.getElementById("commandPaletteBackdrop");
    const modal = document.getElementById("commandPaletteModal");

    // Search input
    searchInput.addEventListener("input", (e) => {
      handleSearch(e.target.value);
    });

    // Backdrop click to close
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        hideModal();
      }
    });

    // Prevent modal click from closing
    modal.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Global keyboard events
    document.addEventListener("keydown", handleKeyDown);
  }

  function handleKeyDown(e) {
    if (!isModalOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
        updateSelection();
        break;
      case "ArrowUp":
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection();
        break;
      case "Enter":
        e.preventDefault();
        executeSelected();
        break;
      case "Escape":
        e.preventDefault();
        hideModal();
        break;
    }
  }

  async function loadBookmarks() {
    try {
      console.log("Content script: Requesting bookmarks from background...");
      const response = await chrome.runtime.sendMessage({
        action: "get-bookmarks",
      });
      console.log("Content script: Received response:", response);
      if (response && response.bookmarks) {
        bookmarks = extractBookmarks(response.bookmarks);
        console.log("Content script: Loaded bookmarks:", bookmarks.length);
      } else {
        console.log(
          "Content script: No bookmarks in response or response is null"
        );
      }
    } catch (error) {
      console.error("Content script: Error loading bookmarks:", error);
    }
  }

  function extractBookmarks(bookmarkNodes, result = []) {
    for (const node of bookmarkNodes) {
      if (node.url) {
        result.push({
          id: node.id,
          title: node.title,
          url: node.url,
          icon: "🔖",
          type: "bookmark",
        });
      }
      if (node.children) {
        extractBookmarks(node.children, result);
      }
    }
    return result;
  }

  function handleSearch(query) {
    if (!query.trim()) {
      filteredItems = allItems;
    } else {
      filteredItems = fuzzySearch(allItems, query.trim());

      // If no results found, add web search option
      if (filteredItems.length === 0 && query.trim()) {
        filteredItems = [
          {
            id: "web-search",
            title: `Search the web for "${query.trim()}"`,
            icon: "🔍",
            type: "web-search",
            query: query.trim(),
          },
        ];
      }
    }

    selectedIndex = 0;
    renderItems();
    updateSelection();
  }

  function fuzzySearch(items, query) {
    const queryLower = query.toLowerCase();

    return items
      .map((item) => {
        const title = item.title.toLowerCase();
        let score = 0;

        // Exact match gets highest score
        if (title.includes(queryLower)) {
          score += 100;
        }

        // Title starts with query gets high score
        if (title.startsWith(queryLower)) {
          score += 50;
        }

        // Fuzzy matching
        let queryIndex = 0;
        let consecutiveMatches = 0;

        for (let i = 0; i < title.length && queryIndex < query.length; i++) {
          if (title[i] === queryLower[queryIndex]) {
            score += 1;
            consecutiveMatches++;
            queryIndex++;

            // Bonus for consecutive matches
            if (consecutiveMatches > 1) {
              score += consecutiveMatches;
            }
          } else {
            consecutiveMatches = 0;
          }
        }

        // Only return items that match all characters
        if (queryIndex === query.length) {
          return { ...item, score };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }

  function renderItems() {
    const results = document.getElementById("commandPaletteResults");

    if (filteredItems.length === 0) {
      results.innerHTML =
        '<div class="command-palette-no-results">No results found</div>';
      return;
    }

    const itemsHtml = filteredItems
      .map(
        (item, index) => `
    <div class="command-palette-result-item" data-index="${index}" data-type="${
          item.type
        }">
      <span class="command-palette-item-icon">${item.icon}</span>
      <div class="command-palette-item-content">
        <div class="command-palette-item-title">${item.title}</div>
        ${
          item.url
            ? `<div class="command-palette-item-url">${item.url}</div>`
            : ""
        }
      </div>
      <span class="command-palette-item-type">${item.type}</span>
    </div>
  `
      )
      .join("");

    results.innerHTML = itemsHtml;

    // Add click listeners
    results
      .querySelectorAll(".command-palette-result-item")
      .forEach((element, index) => {
        element.addEventListener("click", () => {
          selectedIndex = index;
          executeSelected();
        });
      });
  }

  function updateSelection() {
    const items = document.querySelectorAll(".command-palette-result-item");
    items.forEach((item, index) => {
      item.classList.toggle("selected", index === selectedIndex);
    });

    // Scroll selected item into view
    if (items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: "nearest" });
    }
  }

  async function executeSelected() {
    if (filteredItems.length === 0) return;

    const selectedItem = filteredItems[selectedIndex];
    console.log("Executing:", selectedItem);

    try {
      if (selectedItem.type === "bookmark") {
        // Open bookmark
        await chrome.runtime.sendMessage({
          action: "create-tab",
          url: selectedItem.url,
        });
      } else if (selectedItem.type === "command") {
        // Execute command
        await executeCommand(selectedItem);
      } else if (selectedItem.type === "web-search") {
        // Perform web search
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
          selectedItem.query
        )}`;
        await chrome.runtime.sendMessage({
          action: "create-tab",
          url: searchUrl,
        });
      }
    } catch (error) {
      console.error("Error executing item:", error);
    }

    // Close modal after execution
    hideModal();
  }

  async function executeCommand(command) {
    try {
      switch (command.id) {
        case "reload-page":
          await chrome.runtime.sendMessage({ action: "reload-tab" });
          break;
        case "new-tab":
          await chrome.runtime.sendMessage({
            action: "create-tab",
            url: "chrome://newtab/",
          });
          break;
        case "go-back":
          await chrome.runtime.sendMessage({ action: "go-back" });
          break;
        case "go-forward":
          await chrome.runtime.sendMessage({ action: "go-forward" });
          break;
        case "extensions-page":
          await chrome.runtime.sendMessage({
            action: "create-tab",
            url: "chrome://extensions/",
          });
          break;
        case "shortcuts-page":
          await chrome.runtime.sendMessage({
            action: "create-tab",
            url: "chrome://extensions/shortcuts",
          });
          break;
        case "history-page":
          await chrome.runtime.sendMessage({
            action: "create-tab",
            url: "chrome://history/",
          });
          break;
        case "downloads-page":
          await chrome.runtime.sendMessage({
            action: "create-tab",
            url: "chrome://downloads/",
          });
          break;
        case "settings-page":
          await chrome.runtime.sendMessage({
            action: "create-tab",
            url: "chrome://settings/",
          });
          break;
        case "new-incognito-window":
          await chrome.runtime.sendMessage({ action: "new-incognito-window" });
          break;
      }
    } catch (error) {
      console.error("Error executing command:", error);
    }
  }

  async function toggleModal() {
    if (!modalElement) {
      await initModal();
    }

    if (isModalOpen) {
      hideModal();
    } else {
      showModal();
    }
  }

  function showModal() {
    if (!modalElement) return;

    const backdrop = document.getElementById("commandPaletteBackdrop");
    const searchInput = document.getElementById("commandPaletteSearchInput");

    // Prevent page scroll
    document.body.classList.add("command-palette-no-scroll");

    // Show modal
    backdrop.classList.add("show");
    isModalOpen = true;

    // Refresh items in case bookmarks were loaded after init
    allItems = [...commands, ...bookmarks];
    filteredItems = allItems;

    // Reset search and render items
    searchInput.value = "";
    selectedIndex = 0;
    renderItems();
    updateSelection();

    console.log(
      "Modal opened with",
      allItems.length,
      "items (",
      bookmarks.length,
      "bookmarks)"
    );

    // Focus search input
    setTimeout(() => {
      searchInput.focus();
    }, 100);
  }

  function hideModal() {
    if (!modalElement) return;

    const backdrop = document.getElementById("commandPaletteBackdrop");

    // Allow page scroll
    document.body.classList.remove("command-palette-no-scroll");

    // Hide modal
    backdrop.classList.remove("show");
    isModalOpen = false;

    // Clear search
    const searchInput = document.getElementById("commandPaletteSearchInput");
    if (searchInput) {
      searchInput.blur();
    }
  }

  // Initialize when content script loads
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initModal);
  } else {
    initModal();
  }
} // End of injection check
