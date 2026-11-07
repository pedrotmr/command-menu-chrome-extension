# Tab title rename prototype

This isolated Manifest V3 prototype tests changing a regular page's `document.title` and restoring its original title. It is not included in Keybar's build. Its `optional_host_permissions` are confined to this prototype; Keybar's production manifest is unchanged.

The popup resolves the current tab when opened, requests access to only that tab's origin after the user chooses **Allow this site and apply**, and stores the original title. It overrides later SPA title changes and reapplies the custom name after same-origin reloads and navigations. **Restore page title** restores the captured title only when the tab is still on the saved origin and the page is actively displaying this prototype's override.

Chrome's existing `activeTab` plus `scripting` permission can inject after a user invokes Keybar. The grant survives same-origin navigation, including reloads, so Keybar can reinject after those loads while the grant remains active. It is revoked when the tab closes or navigates to another origin. Optional host access is only needed to keep applying the title after that temporary grant ends, including after browser restart or session restore. Requesting it per site avoids requesting access to all websites at install.

Injection is unavailable on restricted pages such as `chrome://` pages and the Chrome Web Store. Origin access does not grant access to those pages. A cross-origin navigation does not carry the old page's original title into the new page. The prototype keys records by tab ID, so it does not reattach after session restore when Chrome assigns a new ID. A production implementation should reuse Keybar's existing unique URL/title reattachment logic and avoid letting the displayed override replace its stored original page title.

Do not add optional host permissions to Keybar until Pedro approves the permission and product decision.
