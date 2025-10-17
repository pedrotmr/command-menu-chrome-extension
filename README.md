# Command Palette Chrome Extension

A VS Code-style command palette for Chrome, built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- **Command Palette**: Quick access to browser commands (Cmd+T / Ctrl+T)
- **Bookmark Search**: Fuzzy search through all your bookmarks
- **Web Search Fallback**: Search Google when no results found
- **Copy URL**: Copy current page URL (Cmd+Shift+C / Ctrl+Shift+C)
- **Tab Switcher**: Toggle between current and previous tab (Alt+Tab / Ctrl+Tab)
- **Toast Notifications**: Vercel-style feedback for actions

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Styling
- **Chrome Extension Manifest V3** - Latest extension format

## Development

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
npm install
```

### Build

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build
```

The built extension will be in the `dist/` directory.

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` directory

## Project Structure

```
src/
├── background/          # Background service worker
│   └── index.ts
├── content/             # Content script (modal)
│   ├── index.tsx       # Entry point + message handlers
│   ├── index.html
│   └── Modal.tsx       # Modal component
├── popup/              # Popup UI (fallback for restricted pages)
│   ├── index.tsx
│   ├── index.html
│   └── Popup.tsx
├── components/         # Shared React components
│   ├── CommandPalette.tsx
│   ├── SearchInput.tsx
│   ├── ResultsList.tsx
│   ├── ResultItem.tsx
│   └── Toast.tsx
├── hooks/             # Custom React hooks
│   ├── useBookmarks.ts
│   ├── useFuzzySearch.ts
│   ├── useKeyboardNavigation.ts
│   └── useToast.ts
├── utils/             # Utility functions
│   ├── commands.ts
│   ├── fuzzySearch.ts
│   ├── bookmarkExtractor.ts
│   └── chromeHelpers.ts
├── types/             # TypeScript types
│   └── index.ts
├── styles/            # Global styles
│   └── global.css
└── manifest.json      # Extension manifest
```

## Keyboard Shortcuts

- **Cmd+T (Mac) / Ctrl+T (Windows)**: Open command palette
- **Cmd+Shift+C / Ctrl+Shift+C**: Copy current page URL
- **Alt+Tab (Mac) / Ctrl+Tab (Windows)**: Toggle between current and previous tab
- **↑↓ Arrow Keys**: Navigate results
- **Enter**: Execute selected item
- **Escape**: Close palette

## Commands

- Reload Page
- Open New Tab
- Go Back / Forward
- Open Extensions
- Open Keyboard Shortcuts
- Open History
- Open Downloads
- Open Settings
- New Incognito Window

## Architecture Notes

### Content Script

The content script renders a React app that:
- Listens for messages from the background script
- Manages modal state
- Handles copy-url functionality
- Shows toast notifications

### Background Script

The background service worker:
- Handles keyboard shortcuts
- Injects content script when needed
- Routes messages between content scripts and Chrome APIs
- Tracks tab history for quick switching

### Component Architecture

- **CommandPalette**: Main search and results component (shared between modal and popup)
- **Modal**: Full-screen overlay for content script
- **Popup**: Standalone UI for restricted pages
- **Toast**: Notification system

## Adding New Features

### Add a New Command

1. Add command definition to `src/utils/commands.ts`
2. Add command handler to `src/utils/chromeHelpers.ts` in `executeCommand()`
3. Rebuild

### Add a New Custom Hook

1. Create hook file in `src/hooks/`
2. Export the hook
3. Use in components

### Modify Styles

Tailwind CSS v4 is configured. Use Tailwind utility classes in components.

Global styles and custom CSS can be added to `src/styles/global.css`.

## Build Process

1. **TypeScript compilation**: `tsc` checks types
2. **Vite build**: Bundles popup, content script, and background worker separately
3. **Post-build script**: Moves background.js to correct location and updates manifest

## License

ISC
