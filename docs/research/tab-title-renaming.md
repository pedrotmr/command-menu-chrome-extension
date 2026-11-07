# Research: custom names in Chrome's tab strip

Date: 2026-11-06

Issue: [#31](https://github.com/pedrotmr/keybar/issues/31)

## Finding

Chrome has no documented `tabs` API method for assigning an independent tab-strip title. `tabs.Tab.title` reports the page title, and `tabs.update()` does not accept a title in its update properties. To change the visible title, an extension must change the page's `document.title` through an injected script. The `scripting` permission is already present in Keybar's manifest.

A local Chromium prototype on a regular HTTP page changed its title from `Original page title` to `Keybar custom title`. A `MutationObserver` reapplied the custom title after a simulated single-page-app title update. Reloading removed the injected observer and restored `Original page title`. This confirms the page-level mechanism, not Keybar's extension injection or browser UI rendering.

## Reference extension

The [Tab Renamer Chrome Web Store listing](https://chromewebstore.google.com/detail/tab-renamer/mncaahedchkhclokjmfjbennhbeceecl) claims title and favicon customization and says names persist when tabs or windows are closed and reopened. The public listing does not show its requested permission list or explain how it implements persistence. Its permission model therefore remains unverified; the listing alone does not support a claim that it uses broad host permissions or any particular alternative.

## Chrome API and permission findings

- [`chrome.tabs`](https://developer.chrome.com/docs/extensions/reference/api/tabs) exposes a tab's `title` as a read property. The writable `tabs.update()` properties do not include `title`; the API can read the title but cannot set an independent one.
- [`chrome.scripting`](https://developer.chrome.com/docs/extensions/reference/api/scripting) requires the `scripting` permission and host permission for the target page, supplied either by host permissions or the temporary `activeTab` grant.
- [`activeTab`](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) grants temporary access to the tab where the user invoked the extension. It continues across same-origin navigation, then is revoked on cross-origin navigation or closing the tab. It does not grant access to restricted pages such as `chrome://` pages.
- Keybar already declares `activeTab` and `scripting`, so it can inject into the active page after a user gesture without expanding its manifest permissions. It cannot use that grant to rename an arbitrary inactive tab.
- Reliable automatic reapplication after browser restart or session restore needs an injection opportunity on the restored page. The durable option is optional host access for the HTTP/S origin, requested only after the user opts in for that site; Chrome's permission guidance recommends optional permissions when they fit. Do not add required broad host permissions for this feature.
- Chrome controls injection on browser-internal and other restricted pages. `file://` access also requires the user to enable file access in the extension settings. The feature should report that the current page is unsupported instead of claiming it was renamed.

## Behavior and limits

| Scenario | With current `activeTab` access | With optional permission for the site's origin |
| --- | --- | --- |
| First rename after invoking Keybar on the active page | Feasible | Feasible |
| Page changes its title in the same document | A document-level observer can reapply the custom title; a page that frequently rewrites the title may cause brief flicker or conflict | Same behavior |
| Same-origin full-page navigation or reload | The grant remains, but the page script is destroyed. Keybar could reinject after load while the grant remains; this needs implementation proof. | Can inject again on each matching page load |
| Cross-origin navigation | Grant is revoked; the custom title and observer disappear | New origin needs its own grant; already permitted destination origins can be handled |
| Browser restart or session restore | Not reliable: the temporary grant is tied to the user's invocation and current tab. Reconciliation of stored Keybar names does not itself inject code. | Can reapply after restored pages load, subject to stored-tab reconciliation and the user's site grant |
| Restricted Chrome pages | Cannot inject | Still cannot inject |

The observer only lives in the current document. Reset must remove it and restore the page's most recent title, so site title changes observed while the custom name is active are not lost. Closing the tab or navigating to a different origin ends the temporary implementation.

## Recommendation and decision

The technical constraint is clear, but the product decision is unresolved: displaying a custom name in Chrome's tab strip requires changing the page's `document.title`. That conflicts with Keybar's current product promise in [PRODUCT.md](../../PRODUCT.md), the [README](../../README.md), the [store listing copy](../launch/chrome-web-store.md), and the [privacy policy](../launch/privacy-policy.md). Preserve that promise until Pedro decides whether to change it. This research does not authorize implementation or permission changes.

If Pedro approves changing that promise, two implementation scopes are feasible:

1. **Temporary active-tab override:** inject after an explicit Keybar invocation using the existing `activeTab` and `scripting` permissions. Observe same-document title updates and make Reset restore the page's latest title. Same-origin reload reinjection needs implementation proof; cross-origin navigation, closing, and browser restart can end the override.
2. **Persistent per-site override:** request optional host access only for sites the user chooses, then reapply after reload and session restore. This requires site-specific permission UX and permission-management controls. Do not add required broad host permissions.

Pedro's exact decision is whether to keep the current promise and not implement tab-strip renaming, or approve changing the promise and choose one of these scopes. [Issue #40](https://github.com/pedrotmr/keybar/issues/40) records that decision and keeps both scopes unselected until then.

## Proof and sources

- Playwright 1.64.1 with headless Chromium and a local HTTP fixture: observed `Original page title` → `Keybar custom title` → `Keybar custom title` after a simulated SPA title write → `Original page title` after reload.
- [Tab Renamer listing](https://chromewebstore.google.com/detail/tab-renamer/mncaahedchkhclokjmfjbennhbeceecl)
- [Chrome `tabs` API](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [Chrome `scripting` API](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Chrome `activeTab` permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome permission declarations](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
