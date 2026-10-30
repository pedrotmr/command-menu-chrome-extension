---
name: Command Menu (working label)
description: A quiet, keyboard-first command surface for Chrome.
---

# Design system

## Direction

Quiet, precise, and distinctive through proportion rather than decoration. Pair warm paper and deep charcoal surfaces with bundled Open Sans, a generous search line, and result titles whose destinations sit on the same scan line. The selected result fills the row with a calm surface. Use recognizable marks for search providers and keep source labels legible and restrained; avoid ornamental icon tiles, ambient gradients, and rails.

The Command Bar and Tab Switcher have different layouts because they solve different tasks. They share the palette, typography, focus treatment, surface shape, and motion rules.

## Tokens and themes

`src/themes/index.ts` is the source of truth. Each `ThemePalette` exposes complete light and dark token maps through memoized getters, so only the active appearance is generated during startup. Settings swatches use lightweight preview colors without generating the full token maps. The appearance preference is Light, Dark, or System; the selected palette and appearance persist across the popup and injected surfaces. System mode follows `prefers-color-scheme`.

To add a palette, add its light/dark source colors and swatch previews to the registry definitions. Settings discovers registered palettes automatically. Components use semantic CSS variables rather than palette-specific colors. Check actual text/background pairings for WCAG AA contrast before adding a palette.

The default Plain palette is black and white. The registry includes Cursor Dark, Cursor Midnight, VS Code Dark, Tobacco, Dracula, Catppuccin, Aurora, Gruvbox, and Nordic, along with T3 Code and Ocean. Each palette has light and dark tokens; palettes originating in only one appearance receive a related companion appearance while keeping the characteristic accent hue. Accent values may shift slightly to meet contrast requirements, and the settings swatches show the exact rendered colors. Use the accent for selected, focused, or primary states; do not use it as ambient decoration.

## Typography and shape

- Offer Open Sans, Outfit, Nunito Sans, Sora, and IBM Plex Mono through Appearance settings. Load font files from extension assets only; never wait for them before rendering or fetch them from a network service. Keep interface copy at regular weight and use medium weights selectively; do not let the more geometric Outfit or Sora faces turn the whole surface bold.
- Set the overlay search query at 18px, result titles at 15px, and destination metadata at 13px. Keep the native popup slightly denser at 17px, 14.5px, and 12.5px; reduce only at narrow viewports.
- Align the input text with result titles. Keep title and destination metadata on one scan line, then use the right edge for a legible, quiet action/source label.
- Use a medium title weight instead of bold; rely on spacing, contrast, and alignment for hierarchy.
- Use a platform monospace stack for key hints.
- Keep small controls rounded and the primary overlay softly rounded at 18px. Avoid ornamental gradients, glass, and excessive shadows.
- Preserve comfortable hit areas and visible focus at browser zoom and text scaling.

## Surfaces

### Command Bar

The Command Bar opens as a centered overlay on supported web pages and as the extension popup on Chrome-native pages. Its width can be set to Compact, Standard, or Wide in Appearance settings. Window mode can be Compact, which opens only the search row until typing begins, or Expanded, which immediately shows pinned tabs first, browser commands next, then recent unpinned tabs. Its first row contains the search field and Appearance control; Appearance begins with an icon-only Back button above its title. There is no branded title bar, Tab Switcher button, close button, or persistent footer. Browser actions, bookmarks, and direct navigation show a title and concise source label without a repeated description or full URL. Escape closes the Command Bar, while a focused nested action dialog handles Escape first.

The search surface can find commands and open tabs, prioritize direct address navigation over matching saved pages, accept provider prefixes, and expose saved-page search after the user grants optional permission. External provider searches are URL handoffs, not embedded API results; choosing a handoff opens its destination and dismisses the Command Bar.

### Tab Switcher

The Tab Switcher is a separate centered horizontal strip modeled on the supplied Arc reference: up to five recently used tabs, a screenshot preview when Chrome has one, then favicon and title. When no screenshot is available, the card uses the site's favicon and host instead of a fake page skeleton. The selected card has a quiet blue emphasis. Arrow keys cycle, Home and End jump, Enter activates, Escape closes, and the shortcut activates on modifier release.

The Tab Switcher opens only from its keyboard shortcut on supported web pages. It shares theme and focus tokens but does not inherit the Command Bar's search row or results layout. Searching tabs and opening contextual actions remain in the Command Bar. Chrome-native pages keep the Command Bar in the extension popup; the Tab Switcher shortcut does nothing there. Chrome's extension Commands API excludes Tab from supported shortcut keys, so the switcher uses a configurable shortcut instead of Ctrl+Tab.

### Settings and nested actions

Appearance settings use the same panel and control tokens, with a modest inset around the Back button and content. The controls align to the content edge; narrow surfaces reduce the inset slightly. Keep clear space between option groups and their controls. Rename, move, group, and close-confirmation flows use labeled native dialogs with concise descriptions, visible errors, and predictable keyboard focus.

## Isolation and motion

Page overlays mount in a closed Shadow DOM inside a browser top-layer popover. Extension styles use a local reset and explicit font, color, sizing, and layout declarations. Keep the font-face rule inside the shadow root and do not add extension nodes or styles to the host page's document. Chrome-native pages use the extension popup because scripts cannot be injected there.

Use no backdrop blur. Keep the short surface entrance subtle, and respect `prefers-reduced-motion`. Avoid layout animations, staggered results, and perpetual motion. Browser page rendering can be GPU-heavy; opening and typing must stay responsive under load.

Chrome exposes a screenshot of the visible tab through the user's temporary `activeTab` access. After the user explicitly opens the Command Bar or Tab Switcher on a regular web page, start one capture without waiting for it before showing the interface. Cache at most five previews in session storage and clear one when its tab navigates or closes. Chrome does not provide screenshots for every background tab without broader site access, so other cards use the favicon-and-host fallback. Preview capture is throttled and never uploaded.

## Accessibility

- Keep focus in the Command Bar combobox and expose the active result with `aria-activedescendant`.
- Use listbox/option semantics for results and a horizontal listbox for the Tab Switcher.
- Announce selection changes, loading, and errors without moving focus unexpectedly.
- Use labeled buttons, visible focus, semantic dialogs, and focus restoration on close.
- Support keyboard-only operation, forced colors, reduced motion, zoom, and text scaling.
- Verify every built-in palette against WCAG 2.2 AA contrast; test workflows with a real screen reader before release.

## CSS conventions

- Shared component styles live in `src/styles/global.css`; theme data lives in `src/themes/index.ts`.
- Prefer semantic tokens and small reusable classes over per-palette selectors.
- Keep the popup reset inside extension-owned surfaces. Do not add selectors that can reach the host page.
- Add motion only when it clarifies a state change and remains imperceptible in the critical path.
