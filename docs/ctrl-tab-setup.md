# Use Control+Tab

1. Open `chrome://extensions/shortcuts` and assign **Control+A** to **Open the tab switcher**.
2. Open `chrome://version` and copy **Profile Path**.
3. Quit the browser completely.
4. Back up the `Preferences` file in that folder, then open it in a text editor.
5. Inside `extensions.commands`, find Command Menu's `open-tab-switcher` entry. Rename `mac:Ctrl+A` to `mac:Ctrl+Tab`. Keep `windows:` or `linux:` on those systems. Repeat under `account_values` if the same binding appears there. Leave other shortcuts unchanged.
6. Save, reopen the browser, and try **Control+Tab** on a regular web page.

If the entry is missing or Ctrl+Tab is already assigned, use `chrome://extensions/shortcuts` instead. Restore a supported shortcut there to undo the change.

This is an unsupported workaround and may reset after updates or sync. The extension cannot apply it automatically. Editing the profile does not enable the switcher on restricted pages such as `chrome://`.

References: [Chrome Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands), [Quick Tab Switch setup](https://chromewebstore.google.com/detail/quick-tab-switch/jceaicinopjaoknlhdfdjileacogogep).
