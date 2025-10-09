// Enhanced popup with bookmarks and fuzzy search
console.log("Command Palette: Enhanced popup loaded");

let selectedIndex = 0;
let allItems = [];
let filteredItems = [];
let bookmarks = [];

// Default commands (removed developer tools)
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
  { id: "settings-page", title: "Open Settings", icon: "⚙️", type: "command" },
  {
    id: "new-incognito-window",
    title: "New Incognito Window",
    icon: "🕵️",
    type: "command",
  },
];

// Initialize when popup opens
document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.getElementById("searchInput");
  const results = document.getElementById("results");

  // Load bookmarks
  await loadBookmarks();

  // Combine commands and bookmarks
  allItems = [...commands, ...bookmarks];
  filteredItems = allItems;

  // Render initial items
  renderItems();

  // Focus the search input
  searchInput.focus();

  // Handle keyboard navigation
  document.addEventListener("keydown", handleKeyDown);

  // Handle search input
  searchInput.addEventListener("input", (e) => {
    handleSearch(e.target.value);
  });
});

async function loadBookmarks() {
  try {
    const bookmarkTree = await chrome.bookmarks.getTree();
    bookmarks = extractBookmarks(bookmarkTree);
    console.log("Loaded bookmarks:", bookmarks.length);
  } catch (error) {
    console.error("Error loading bookmarks:", error);
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

function handleKeyDown(e) {
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
      window.close();
      break;
  }
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
  const results = document.getElementById("results");

  if (filteredItems.length === 0) {
    results.innerHTML = '<div class="no-results">No results found</div>';
    return;
  }

  const itemsHtml = filteredItems
    .map(
      (item, index) => `
    <div class="result-item" data-index="${index}" data-type="${item.type}">
      <span class="item-icon">${item.icon}</span>
      <div class="item-content">
        <div class="item-title">${item.title}</div>
        ${item.url ? `<div class="item-url">${item.url}</div>` : ""}
      </div>
      <span class="item-type">${item.type}</span>
    </div>
  `
    )
    .join("");

  results.innerHTML = itemsHtml;

  // Add click listeners
  results.querySelectorAll(".result-item").forEach((element, index) => {
    element.addEventListener("click", () => {
      selectedIndex = index;
      executeSelected();
    });
  });
}

function updateSelection() {
  const items = document.querySelectorAll(".result-item");
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
      await chrome.tabs.create({ url: selectedItem.url });
    } else if (selectedItem.type === "command") {
      // Execute command
      await executeCommand(selectedItem);
    } else if (selectedItem.type === "web-search") {
      // Perform web search
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
        selectedItem.query
      )}`;
      await chrome.tabs.create({ url: searchUrl });
    }
  } catch (error) {
    console.error("Error executing item:", error);
  }

  // Close popup after execution
  window.close();
}

async function executeCommand(command) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  switch (command.id) {
    case "reload-page":
      await chrome.tabs.reload(tab.id);
      break;
    case "new-tab":
      await chrome.tabs.create({});
      break;
    case "go-back":
      await chrome.tabs.goBack(tab.id);
      break;
    case "go-forward":
      await chrome.tabs.goForward(tab.id);
      break;
    case "extensions-page":
      await chrome.tabs.create({ url: "chrome://extensions/" });
      break;
    case "shortcuts-page":
      await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
      break;
    case "history-page":
      await chrome.tabs.create({ url: "chrome://history/" });
      break;
    case "downloads-page":
      await chrome.tabs.create({ url: "chrome://downloads/" });
      break;
    case "settings-page":
      await chrome.tabs.create({ url: "chrome://settings/" });
      break;
    case "new-incognito-window":
      await chrome.windows.create({ incognito: true });
      break;
  }
}
