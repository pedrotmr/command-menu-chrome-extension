# Validate the unpacked extension

## Preflight

1. Run `npm ci`, `npm test`, `npm run build`, then `npm run check:extension`.
   The last command prints the absolute build directory, manifest version and bundle hashes.
   It verifies files on disk; it does not claim that a browser loaded them.
2. For BrowserOS neo, inspect the available MCP tools and connection first. If unavailable,
   report that and use an explicitly selected native control method. Confirm a window is
   available before preparing the test. Inspect the live UI after actions; refresh the
   accessibility snapshot when an index no longer has a frame.
3. In `chrome://extensions`, open this extension's details. Match **Loaded from** against
   the preflight directory and record its ID. A matching name/version alone cannot
   distinguish two checkouts. Preserve an existing installation from another checkout;
   load this build separately when needed and use its configured shortcuts.
4. Record browser version from `chrome://version` or `navigator.userAgent` in the worker's
   DevTools. Test the minimum supported Chrome separately. Confirm optional permissions
   before testing permission-dependent commands. Follow the tool's approval requirements
   when loading software or granting access.

## Local fixture

Run `npm run fixture:extension` and open
`http://127.0.0.1:8769/scripts/fixtures/extension-audit.html`.
The server binds only to loopback and fails if port 8769 is occupied. Stop it with Ctrl+C.
The fixture stays outside `public/` and is excluded from the production package.

1. Focus the normal page input, open the palette, type a query, use arrows/Enter and
   Escape, then confirm focus returns. Repeat from **Shadow page field**.
2. Check that the palette retains its own font, case, corners and selection despite
   the page's global `!important` styles and transformed body. Tab should stay inside
   the open overlay; after closing, the page button and link should work again.
3. Open five fixture tabs with distinct query strings, such as `?audit=1` through
   `?audit=5`. Search and activate one, rename/reset it, then exercise the switcher.
   Compare the selected/announced result with the tab that actually activates.
4. Change Light/Dark/System and a size preference; confirm persistence across reopening
   and the popup on a `chrome://` page. Cancel the saved-pages permission window and
   confirm the other commands remain usable. Test denial/revocation separately when
   permission grants are authorized.
5. Test 200% zoom, a 320 CSS-pixel viewport, reduced motion and a screen reader. Record
   the actual viewport, browser, assistive technology and results; a DOM test does not
   verify rendering, Chrome APIs or announcements. Keep checks not executed marked as such.
6. Inspect page, popup and worker consoles. Profile first opening separately from
   subsequent openings; search algorithm timings do not measure input-to-paint. For a
   leak check, close DevTools between runs where it would keep the worker alive.

At the end, restore theme/zoom, remove temporary tab names, close only the tabs created
for the test, stop the fixture server and close diagnostic windows. If a separate copy
was loaded alongside the user's installation, disable the test copy to avoid duplicate
active extensions. Preserve the original installation and its shortcuts.

## Automated coverage

`npm test` runs the existing search/background suite, including command-registry
contracts through the background listener, then React lifecycle tests using jsdom and
React `act`. Deferred replies test old snapshots arriving after fresh ones, repeated
Enter during an API call, retry after failure and permission revocation while saved-page
data is in flight. Keyboard tests cover nested-dialog Escape and IME composition.
Subscriptions must be removed after each mounted test. These tests do not replace the
browser steps above.
