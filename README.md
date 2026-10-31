# Command Menu (working name)

A keyboard-first command surface for Chrome, built with React, TypeScript, and Manifest V3. The name is a working label; product branding is still open.

## Open it

- On a regular web page, click the extension action or press **Ctrl+Shift+Y** (Windows/Linux) / **Command+Shift+Y** (macOS) to open the compact, centered Command Bar overlay.
- On Chrome and extension pages, the same action opens the extension popup because Chrome does not allow injected overlays on those pages.
- Open the separate Tab Switcher with **Ctrl+Shift+U** / **Command+Shift+U** on regular web pages. It has no button in the Command Bar, and its shortcut does nothing on Chrome or extension pages.
- Use **↑ / ↓** and **Enter** in the Command Bar. In the Tab Switcher, use **← / →** or **↑ / ↓** to cycle, then **Enter** to switch. **Escape** closes either surface. Chrome lets users change both shortcuts at `chrome://extensions/shortcuts`.

## Command Bar

Search commands, open tabs, direct addresses, and provider shortcuts in one place. Commands include tab renaming, moving, pinning, muting, grouping, copying a title or URL, closing and duplicating tabs, browser navigation, zoom, window actions, and Chrome's native Split View when the API is available.

Search prefixes such as `yt`, `g`, `ai`, `cl`, `p`, `x`, and `y` open the corresponding provider's search page with the query. These are URL-based handoffs, not API-backed search or embedded results. A normal unmatched query offers a Google web search. Local commands and tabs stay available without waiting for network requests.

To search bookmarks and history, choose the saved-pages result. Chrome requests optional access only after that choice. History search is limited to 500 visits from the last 30 days.

Appearance settings include **Compact** and **Expanded** window modes. Compact opens to the search bar and reveals results as you type; Expanded shows suggestions immediately, with pinned tabs first, followed by browser commands and recent unpinned tabs.

## Tab Switcher and custom names

The Tab Switcher is a centered, horizontal strip of the five most recently accessed tabs in the current window. It shows favicons and titles, cycles with the keyboard, and supports the modifier-release behavior when opened from its shortcut. Search all tabs, rename one, or run additional tab actions from the Command Bar.

Chrome only exposes a screenshot of the currently visible tab. When you explicitly open the Command Bar or Tab Switcher on a regular web page, the extension starts a non-blocking capture using the temporary `activeTab` grant. Other cards use a favicon-and-host fallback until a preview is available. The cache is limited to five tabs, cleared when a tab navigates or closes, and never uploaded. No broad website permission is requested.

Custom tab names are extension metadata in `chrome.storage.local`; the extension never changes a website's `document.title` or favicon. Names survive reloads and navigation, and a duplicate tab inherits its name. Chrome may assign a different tab ID during session restore, so a name is reattached only when its saved URL/title identity is unique. Ambiguous matches stay unattached. Closed-tab names expire after 90 days. Names remain local and are not synced.

## Themes and design

Choose **System**, **Light**, or **Dark**, then select a palette. **Plain** is the default black-and-white palette. The picker includes Cursor Dark, Cursor Midnight, VS Code Dark, Tobacco, Dracula, Catppuccin, Aurora, Gruvbox, and Nordic, plus T3 Code and Ocean. Appearance settings offer Open Sans, Outfit, Nunito Sans, Sora, and IBM Plex Mono font families. Preferences persist across the Command Bar, Tab Switcher, and popup. Choose Compact, Standard, or Wide to set the Command Bar width.

To add a palette, add its light/dark source colors and lightweight swatch colors to the theme definitions in `src/themes/index.ts`. Settings discovers palettes from the registry; full contrast-adjusted token maps are memoized on first use, and components do not need palette-specific styles.

Chrome's extension Commands API excludes **Tab** from supported shortcut keys, so the Tab Switcher uses a configurable shortcut instead of **Ctrl+Tab**. Its suggested shortcut is **Ctrl+Shift+U** / **Command+Shift+U**; users can choose another supported shortcut at `chrome://extensions/shortcuts`.

The Command Bar and Tab Switcher use the same tokens and typography, with separate layouts. Web-page overlays render in a closed Shadow DOM inside a browser top-layer popover so site CSS does not style the extension UI. Native Chrome pages use the extension popup.

## Privacy and permissions

- Required permissions are `activeTab`, `scripting`, `tabs`, and `storage`. There are no host permissions, analytics, or background network requests.
- Choosing a provider sends the query in that provider's URL and opens its website. Favicon images use the URLs already reported by Chrome.
- Optional `bookmarks` and `history` access enables saved-page search; `tabGroups` enables group commands; `sessions` restores a closed tab; `clipboardWrite` enables copy commands. Each is requested only when a user chooses the feature.
- A tab preview is captured only after the user explicitly opens the Command Bar or Tab Switcher on a regular web page and Chrome grants access to the visible tab. It stays in session storage and is never transmitted.

## Development

For browser connection checks, build-directory verification, and the reusable CSS/focus fixture, see [Extension validation](docs/extension-validation.md).

Requires Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run build
npm test
```

`npm test` exercises background message contracts, concurrent mutations, failed storage writes, safe bulk-close confirmations, search ranking, tab-name recovery, provider URLs, navigation parsing, theme completeness, and WCAG AA contrast for built-in light/dark palettes. It also reports p50/p95 local-search timings for synthetic sets of 2,300 and 10,000 tabs. These algorithm timings do not replace profiling the extension in Chrome. Hard performance budgets run separately with `npm run test:benchmark`.

Install the isolated test browser with `npx playwright install chromium`, then run `npm run test:e2e`. Browser tests load the production extension and cover the overlay, keyboard activation, focus restoration, saved-page failure/retry/revocation, stale responses, bulk-close recovery, worker restart, and a complete browser restart with restored tab names. Permission/data failures and response ordering use controlled boundary simulations; real toolbar action and ordinary Chrome APIs run unchanged. No personal browser profile is used.

To prepare a distributable ZIP, run `npm run package:extension`. This requires the `zip` command and runs lint, formatting, type checks, unit/integration tests, the production build, and browser tests before creating `release/command-menu-<version>.zip`. Third-party notices and font licenses ship inside the package. The command prints its SHA-256 checksum. CI runs the browser suite after building as well. Publishing to the Chrome Web Store remains a separate account and listing operation.

`npm test` also checks registered commands against the background listener and runs React lifecycle regressions with jsdom: stale replies, duplicate Enter, retry after API failure, permission revocation, IME/dialog keys, and subscription cleanup. jsdom is a development-only dependency; rendering and Chrome integration still require the browser procedure linked above.

To load the built extension, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist/`.

## Code map

```text
src/
├── background/index.ts       Chrome APIs, tab names, screenshot cache, messages
├── components/               Command Bar, result list, settings, Tab Switcher
├── overlay/                  Shadow DOM surfaces for regular web pages
├── popup/                    Extension popup for Chrome-native pages
├── themes/index.ts           Shared light/dark palette registry
├── utils/commands.ts         Searchable browser command registry
├── utils/fuzzySearch.ts      Local ranking, provider prefixes, URL parsing
├── styles/global.css         Shared tokens and component styling
└── manifest.json             MV3 permissions and shortcuts
```
