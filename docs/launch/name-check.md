# Chrome extension name check

**Checked:** 2 November 2026
**Product:** Chrome extension in [`pedrotmr/command-menu-chrome-extension`](https://github.com/pedrotmr/command-menu-chrome-extension)

## Recommendation

Switch to **Keybar**. Do not keep **Command Menu**, and do not use the earlier coined names (Duvira, Keyvale, Orlune), which were hard to remember and said nothing about the product.

Keybar is two plain words: the keyboard and the bar. The product's main surface is the Command Bar, opened by a shortcut, so the name describes what users do. It is the only candidate that passed every check below without a close-name problem.

Three things to know before committing:

- A pending U.S. application for KEYBAR (serial 99289761, filed 17 July 2025) covers batteries, power adapters, earphones, and portable media players. It is hardware in the same Nice class 9 as software. It has not been examined yet.
- `keybar.com` is registered since 2002 and belongs to a New York bar. `keybar.app` and `keybar.dev` had no RDAP record.
- This is a database screen, not legal clearance. Have a trademark attorney review the name before any filing.

## Current name

**Command Menu** is the built-in [Chrome DevTools Command Menu](https://developer.chrome.com/docs/devtools/command-menu), so searches for it return DevTools help instead of this extension. Google's [Chrome Web Store branding rules](https://developer.chrome.com/docs/webstore/branding) also warn against confusingly similar names. On the store, no listing is titled exactly "Command Menu", but the phrase is a generic feature term. The name is also a description, which makes it weak as a mark.

## How the check ran

Method, so the results can be repeated:

- **Chrome Web Store:** the store's own search, run in a real browser. The search is fuzzy and ignores spaces, so "tabjump" also returned "Tab Jump". I counted a title as a hit when it matched the name after removing spaces and case.
- **Firefox Add-ons:** the [AMO search API](https://addons.mozilla.org/api/v5/addons/search/?q=keybar&app=firefox).
- **Edge Add-ons:** the store's search page, run in a real browser.
- **Other apps:** the [Apple App Store search API](https://itunes.apple.com/search?term=keybar&entity=software), [npm](https://registry.npmjs.org/-/v1/search?text=keybar), and [GitHub repository search](https://github.com/search?q=keybar&type=repositories).
- **Domains:** RDAP, using the Verisign server for `.com` and the Google Registry server for `.app` and `.dev`. A `404` means no record. It is not a reservation.
- **Trademarks:** [Justia Trademarks](https://trademarks.justia.com/search?q=keybar), which mirrors USPTO records, and the [INPI trademark search](https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_classe_basica.jsp) in "radical" mode, which also returns near matches. The official [USPTO Trademark Search](https://tmsearch.uspto.gov/) needs a browser session, so repeat the USPTO check there before filing.

## What the name has to do

From [`PRODUCT.md`](../../PRODUCT.md): quiet, precise, capable; keyboard-first; a Command Bar plus a separate Tab Switcher. The name should be short, easy to say and spell, and point at the keyboard or the bar. The three finalists were picked for that, then checked.

## Names removed before the full check

I screened 25 simple names. Most `.com` domains were already registered, so I did not use that as a filter. These names failed on a real collision.

| Name | Collision | Link |
| --- | --- | --- |
| Tabjump | Chrome extensions "Tab Jump" and "Tab Jump List"; two GitHub projects for keyboard tab jumping | [Chrome search](https://chromewebstore.google.com/search/tabjump) |
| Hopbar | Chrome extension "Hopbar: URL Command Bar", same function | [Chrome search](https://chromewebstore.google.com/search/hopbar) |
| Quickbar | Several Chrome extensions named "QuickBar", one featured and also a tab and bookmark search | [Chrome search](https://chromewebstore.google.com/search/quickbar) |
| Jumpbar | App Store app "Jumpbar - Search Shortcuts"; Firefox add-on "Jumpbar for Kagi" | [App Store search](https://itunes.apple.com/search?term=jumpbar&entity=software) |
| Tabkey | App Store app "TabKey"; GitHub WebExtension [erosman/tabkey](https://github.com/erosman/tabkey) | [App Store search](https://itunes.apple.com/search?term=tabkey&entity=software) |
| Gobar | Two App Store apps named "GoBar" | [App Store search](https://itunes.apple.com/search?term=gobar&entity=software) |
| Jumpkey | Chrome, Edge, and Opera extension [EdenwareApps/JumpKey](https://github.com/EdenwareApps/JumpKey) | [GitHub search](https://github.com/search?q=jumpkey&type=repositories) |
| Keyhop, Hopkey, Keygo, Gokey, Keytab, Cmdbar | Each already has a Chrome extension with that name | [Chrome search: keyhop](https://chromewebstore.google.com/search/keyhop) |
| Switchbar | Chrome extension "Open with Switchbar" | [Chrome search](https://chromewebstore.google.com/search/switchbar) |
| Tabbar | Generic; many Chrome extensions with "Tab Bar" in the title | [Chrome search](https://chromewebstore.google.com/search/tabbar) |

Three names (Tabgo, Jumpto, Seekbar) were dropped as too generic or too close to unrelated products (a GitHub tab tool called tabgod, many video "seek bar" extensions). Four more (Keyseek, Keyfind, Quickkey, Barkey) returned no Chrome Web Store result, but I did not check them further. They say less about the product than Keybar does.

## Finalists

| Candidate | Fit with the product | Main trade-off |
| --- | --- | --- |
| **Keybar** | Keyboard plus bar. Matches the Command Bar and the keyboard-first character. Two syllables, easy to spell. | Pending U.S. class 9 application for hardware. `.com` belongs to a bar. |
| **Tabseek** | Says tabs and search. | Only a one-letter difference from "Tab Seeker", an existing extension with the same job. Also close to "TabSearch". Leaves out the command part. |
| **Cuebar** | Short and soft. A cue is a prompt. | Reads as a pool cue. `.com` is a billiards bar and U.S. marks cover billiard cues. Says nothing about keyboards or tabs. |

## Store results

Counts and dates come from the listing when the store shows them. Searches ran on 2 November 2026.

| Name | Chrome Web Store | Firefox Add-ons | Edge Add-ons |
| --- | --- | --- | --- |
| **Keybar** | [No results](https://chromewebstore.google.com/search/keybar) | No title match. Fuzzy results only, such as [Custom Scrollbars](https://addons.mozilla.org/en-US/firefox/addon/custom-scrollbars/). See the [search](https://addons.mozilla.org/en-US/firefox/search/?q=keybar). | No title match. Two unrelated results: [KeyCrypt](https://microsoftedge.microsoft.com/addons/detail/keycrypt/cdljeimmicjbgclhomchhlbncmfedkmb) and [Bar Code Scanner and Generator](https://microsoftedge.microsoft.com/addons/detail/bar-code-scanner-and-gene/ejijjgbmpiflpiinnofnhcpjmheohgdm). See the [search](https://microsoftedge.microsoft.com/addons/search/keybar). |
| **Tabseek** | [No result titled Tabseek](https://chromewebstore.google.com/search/tabseek). Close name: [Tab Seeker](https://chromewebstore.google.com/detail/tab-seeker/ipjngbgjjgldphjcgjlddjcaneddmjbn), 16 users, 1 rating, updated 11 Sep 2025, site [tabseeker.com](https://tabseeker.com/). | No title match. Close name: [Tab Seeker](https://addons.mozilla.org/firefox/addon/tab-seeker/). | No title match. Close names: [TabSearch](https://microsoftedge.microsoft.com/addons/detail/tabsearch/mocmpbaajgiboiihamihfbigpphmofjg). See the [search](https://microsoftedge.microsoft.com/addons/search/tabseek). |
| **Cuebar** | [No results](https://chromewebstore.google.com/search/cuebar) | No title match. See the [search](https://addons.mozilla.org/en-US/firefox/search/?q=cuebar). | No title match. One unrelated result: [VBar Utilities](https://microsoftedge.microsoft.com/addons/detail/vbar-utilities-browser-ex/kpbpnodfdlmgoidbbebonkdejlflfdlh). See the [search](https://microsoftedge.microsoft.com/addons/search/cuebar). |

The Firefox user count and update date for Tab Seeker were not read from its listing. I took only the Chrome figures from the listing page.

## Other apps and projects

| Name | App Store | npm | GitHub |
| --- | --- | --- | --- |
| **Keybar** | [No Keybar app](https://itunes.apple.com/search?term=keybar&entity=software) | [No package](https://registry.npmjs.org/-/v1/search?text=keybar) | [62 repositories with the word in the name](https://github.com/search?q=keybar&type=repositories); top results are unrelated (keyboard hardware, a BART model) |
| **Tabseek** | [No Tabseek app](https://itunes.apple.com/search?term=tabseek&entity=software) | [No package](https://registry.npmjs.org/-/v1/search?text=tabseek) | [yangxikun/TabSeek](https://github.com/yangxikun/TabSeek), 0 stars, "Quick search chrome tabs/bookmarks/histories" |
| **Cuebar** | [No Cuebar app](https://itunes.apple.com/search?term=cuebar&entity=software) | [No package](https://registry.npmjs.org/-/v1/search?text=cuebar) | [iancenry/cuebar](https://github.com/iancenry/cuebar), a Mac teleprompter; [tomatosoup83/cuebar](https://github.com/tomatosoup83/cuebar), a Music.app command palette; both 0 stars |

A web search for "Keybar" software returned no product, developer, or documentation. It returned only copies of one generic SEO article. The name is in use as a business name: [KEYBAR NYC](https://www.keybar.com/), a DJ lounge in Brooklyn. That is a different field.

## Domains

RDAP checked on 2 November 2026.

| Name | `.com` | `.app` | `.dev` |
| --- | --- | --- | --- |
| Keybar | [Registered](https://rdap.verisign.com/com/v1/domain/keybar.com) since 2002-09-13; site is [KEYBAR NYC](https://www.keybar.com/) | [No record](https://pubapi.registry.google/rdap/domain/keybar.app) | [No record](https://pubapi.registry.google/rdap/domain/keybar.dev) |
| Tabseek | [Registered](https://rdap.verisign.com/com/v1/domain/tabseek.com) since 2000-02-18; the site did not respond | [No record](https://pubapi.registry.google/rdap/domain/tabseek.app) | [No record](https://pubapi.registry.google/rdap/domain/tabseek.dev) |
| Cuebar | [Registered](https://rdap.verisign.com/com/v1/domain/cuebar.com) since 2004-01-10; redirects to a billiards bar | [Registered](https://pubapi.registry.google/rdap/domain/cuebar.app) | [No record](https://pubapi.registry.google/rdap/domain/cuebar.dev) |
| CommandMenu (current) | [Registered](https://rdap.verisign.com/com/v1/domain/commandmenu.com) | [No record](https://rdap.org/domain/commandmenu.app) | not checked |

The `.com` is not needed for a Chrome Web Store listing. Two practical options for Keybar: register `keybar.app` for the site, and keep `.dev` as a second domain.

## Trademark screen

Nice class **9** covers downloadable software and **42** covers software services. I looked at every class, then flagged the ones near software.

### Keybar

[USPTO records via Justia](https://trademarks.justia.com/search?q=keybar): 10 records.

| Record | Goods and services | Status | Risk for a browser extension |
| --- | --- | --- | --- |
| [KEYBAR 99289761](https://trademarks.justia.com/992/89/keybar-99289761.html), Bracktets Co. Ltd | Class 9: batteries, power adapters, wireless speakers, wireless chargers, earphones, portable media players | New application, filed 2025-07-17, not yet assigned to an examiner | Same class as software, different goods. Watch it. The owner could object to software use, or the examiner could cite it against a software filing. |
| [KEYBAR 77049900](https://trademarks.justia.com/770/49/keybar-77049900.html), Delta Mobile Software | Class 9: software and keyboards for mobile phones | Abandoned 2008-03-26 (no statement of use filed) | None. Dead, but shows the name was once used for keyboard software. |
| [KEYBAR 98920515](https://trademarks.justia.com/989/20/keybar-98920515.html) and [98736135](https://trademarks.justia.com/987/36/keybar-98736135.html), Key Products | Cigarettes and e-liquid | Applications from 2024 | None. Unrelated goods. |
| [KEYBAR 77014178](https://trademarks.justia.com/770/14/keybar-77014178.html) and [78196535](https://trademarks.justia.com/781/96/keybar-78196535.html) | Restaurant, bar, and cafe services | Not checked | None. Unrelated services. |
| [KEYBAR 86852725](https://trademarks.justia.com/868/52/keybar-86852725.html), [KEYBAR.US](https://trademarks.justia.com/868/59/keybar-86859060.html), [KEY-BAR](https://trademarks.justia.com/862/94/key-86294690.html), Michael Taylor | Metal key chains and key organizers | Not checked | None. Unrelated goods. |
| [KEYBARS.CO](https://trademarks.justia.com/901/36/keybars-90136454.html), Snackabilly | Nutrition and energy bars | Not checked | None. Unrelated goods. |

[INPI (Brazil)](https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_classe_basica.jsp): radical search for "keybar" returned 8 processes and no KEYBAR. The near matches are Monkey Bar, Monkey Bars, Jockey Bar, and similar names in classes 10, 35, 41, 43, and 44. None is in class 9 or 42.

### Tabseek

[USPTO via Justia](https://trademarks.justia.com/search?q=tabseek): no records. [INPI](https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_classe_basica.jsp): "Nenhum resultado foi encontrado". The risk is not in the registers. It is the live Tab Seeker extension.

### Cuebar

[USPTO via Justia](https://trademarks.justia.com/search?q=cuebar): two records, [90902781](https://trademarks.justia.com/909/02/cuebar-90902781.html) (filed 2021) and [99082301](https://trademarks.justia.com/990/82/cuebar-99082301.html) (filed 2025), both by Foshan Kaihui Hardware Co., Ltd. for billiard and toy goods. [INPI](https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_classe_basica.jsp): 4 processes, none for CUEBAR (Barbecue Bar and barbershop names, classes 35, 43, and 44).

### Limits

These are database screens. They do not cover phonetic or translated matches in other countries, unregistered use, or goods and services a trademark examiner would group with software. INPI states that a search result does not mean a mark can be registered. Repeat the searches on the official USPTO and INPI sites before filing, and ask an attorney about KEYBAR 99289761.

## If the product switches to Keybar

No code or product copy was renamed for this check. The name appears in more places than the manifest, so rename them together in one change.

1. **Manifest.** In [`src/manifest.json`](../../src/manifest.json) change `name` to **Keybar**, the `action.default_title` ("Open Command Menu" becomes "Open Keybar"), the command description for `open-command-palette`, and the `description`. Suggested description: "A fast, keyboard-first command bar for Chrome."
2. **Popup and permission page.** [`src/popup/index.html`](../../src/popup/index.html) has the title. [`src/popup/PermissionRequest.tsx`](../../src/popup/PermissionRequest.tsx) has three user-facing strings ("Command Menu access", and two status messages).
3. **README and product docs.** [`README.md`](../../README.md) heading and the shortcut paragraph, [`PRODUCT.md`](../../PRODUCT.md) purpose and the "working label" sentence, [`DESIGN.md`](../../DESIGN.md) front matter name, and the [`docs/ctrl-tab-setup.md`](../ctrl-tab-setup.md) and [`docs/store-listing.md`](../store-listing.md) mentions. Keep "Command Bar" and "Tab Switcher" as feature names.
4. **Store listing.** Title "Keybar". Add a subtitle that says what it does, for example "Keyboard-first search and tab control". Redo any screenshot or art that shows the old name.
5. **Release ZIP.** In [`scripts/package-extension.mjs`](../../scripts/package-extension.mjs) the filename is `command-menu-${version}.zip`; the README line about `release/command-menu-<version>.zip` must change with it. [PR #12](https://github.com/pedrotmr/command-menu-chrome-extension/pull/12) added the packaging flow. Nothing has been published, so no external asset needs renaming.
6. **Internal names (optional, can wait).** `package.json` name and description; the font family names `Command Menu Open Sans` and the four siblings in [`src/utils/installProductFont.ts`](../../src/utils/installProductFont.ts) and [`src/styles/global.css`](../../src/styles/global.css); the `data-command-menu-*` attributes; the prefixes used in tests and the `design-preview.html`, `font-options-preview.html`, and `actions-popover-prototype.html` files. These are not user-visible in the store, so they can follow in a later change.

## Sources and scope

- Product and current name: [`PRODUCT.md`](../../PRODUCT.md), [`README.md`](../../README.md), [`src/manifest.json`](../../src/manifest.json), [`docs/store-listing.md`](../store-listing.md).
- Policy: [Chrome DevTools Command Menu](https://developer.chrome.com/docs/devtools/command-menu), [Chrome Web Store branding](https://developer.chrome.com/docs/webstore/branding), [INPI Basic Trademark Guide](https://www.gov.br/inpi/pt-br/servicos/marcas/guia-basico).
- Store counts, update dates, and registry data are point-in-time. No domain was registered and no mark was filed.
