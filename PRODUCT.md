# Product

## Users

Keyboard-first Chrome users who keep many tabs open while researching, writing, planning, or building. They want to find a page or take a browser action without hunting through menus.

## Purpose

Command Menu brings local search, browser commands, external search handoffs, and tab management into one fast interaction model. The Command Bar is the primary surface. The Tab Switcher is a separate, compact recent-tabs view opened with its keyboard shortcut on supported web pages.

Success means local actions feel immediate, tab names survive ordinary navigation, keyboard and screen-reader users can complete the same workflows, and the extension leaves the host page visually untouched.

## Product character

Quiet, precise, capable. Offer Open Sans, Outfit, Nunito Sans, Sora, and IBM Plex Mono with platform fallbacks and aligned result metadata. Plain is the black-and-white default; the palette can change the color mood without changing the shared hierarchy or interaction language. Keep the selected row clear without gradients, stacked pills, or decorative chrome. Load fonts locally and keep the system fallback responsive while they load. Arc, Lumno, and Raycast are references for selected interaction ideas, not templates to copy. “Command Menu” is the current working label; product naming remains open.

## Principles

- Keep activation, local search, and keyboard response fast; network handoffs never block local results.
- Treat accessibility as part of each interaction: semantic controls, visible focus, predictable navigation, screen-reader announcements, reduced motion, and WCAG 2.2 AA contrast.
- Keep the Command Bar and Tab Switcher visually related while giving each a layout suited to its task.
- Store custom tab names as extension metadata; never replace a website's document title.
- Request optional permissions only when a user chooses the feature that needs them.
- Render page overlays in extension-owned styles and leave host-page appearance and behavior alone.
- Keep the command catalog focused; API availability alone is not a reason to add a feature.

## Anti-references

- A wholesale clone of another product.
- Heavy blur, decorative animation, or large visual effects that cost responsiveness.
- Fragile scraping or unsupported private APIs for external providers.
- Broad permissions, analytics, or background network activity without a clear user benefit.

## Accessibility and release quality

Target WCAG 2.2 AA where applicable. Verify keyboard-only completion of open, search, navigate, execute, nested flow, back, and close. Check visible focus, focus restoration, screen-reader announcements, zoom and text scaling, reduced motion, forced colors, and both themes. Automated checks complement real browser and assistive-technology workflows.
