# Command Menu Privacy Policy

**Last updated: November 2, 2026**

Command Menu is a keyboard-first command palette for Chrome. It reads and processes browser information locally to provide tab search, browser commands, and optional saved-page search. The extension does not send this information to its developer. It has no host permissions, analytics, or background network requests.

## Information used by the extension

- **Open tabs:** With the required `tabs` permission, Command Menu reads tab IDs, titles, URLs, favicons, and window state to search, switch, and manage tabs.
- **Optional saved pages:** If you choose saved-page search, Chrome asks for the optional `bookmarks` or `history` permission needed for that source. Bookmark entries are read locally. History search is limited to 500 visits from the last 30 days.
- **Custom names and settings:** Custom tab names and appearance preferences are stored in `chrome.storage.local` on your device and are not synced by Command Menu. Custom names are extension metadata; Command Menu does not change a website's title or favicon. Closed-tab names expire after 90 days.
- **Temporary previews:** After you explicitly open Command Menu or the Tab Switcher on a regular web page, Chrome may grant temporary access to the visible tab for a screenshot preview. The cache is limited to five tabs, stays in session storage, is cleared when a tab navigates or closes, and is never transmitted.
- **Queries and selections:** Text you type and commands you select are processed locally to find results and run the selected action. They are not recorded as analytics.

## Network requests and sharing

There are no background network requests. If you choose a provider search shortcut, or accept the offered Google web search, the query is added to the destination URL and sent to that provider by your browser. Current destinations are Google Search, YouTube, ChatGPT, Claude, Perplexity, X, and Yahoo; the selected provider's own privacy practices then apply. Chrome may also load favicon images from the URLs it reports for tabs. Command Menu does not send tab data, bookmark data, history entries, custom names, previews, or usage events to its developer or other parties.

## Permissions

Required permissions are `activeTab`, `scripting`, `tabs`, and `storage`. Optional `bookmarks`, `history`, `tabGroups`, `sessions`, and `clipboardWrite` access is requested only when you choose the feature that needs it. You can manage these grants in Chrome's extension settings.

## Limited Use

The use of information received from Google APIs will adhere to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use), including the Limited Use requirements. Information is used only to provide Command Menu's disclosed features. It is not sold, used for unrelated purposes, or used for personalized advertising, creditworthiness, or lending.

## Contact

For privacy questions, contact the maintainer through the [project issue tracker](https://github.com/pedrotmr/command-menu-chrome-extension/issues). Do not include private browsing information in a public issue.
