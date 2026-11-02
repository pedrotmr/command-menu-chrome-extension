# Shortcuts

Suggested shortcuts: **Control+A** for the tab switcher and **Cmd+T** for the command menu (**Ctrl+T** on Windows/Linux). Chrome may reserve the new-tab shortcut; check assignments at `chrome://extensions/shortcuts` and choose another if needed.

Want **Control+Tab** instead?

1. At `chrome://extensions/shortcuts`, assign **Control+A** to **Open the tab switcher**.
2. Open `chrome://version` and copy **Profile Path**.
3. Quit the browser. Back up the `Preferences` file in that folder, then open it in a text editor.
4. In `extensions.commands`, find `open-tab-switcher` for Command Menu. Rename `mac:Ctrl+A` to `mac:Ctrl+Tab` (keep `windows:` or `linux:` on those systems). Repeat under `account_values` if present. Leave other shortcuts unchanged; stop if Ctrl+Tab is already assigned.
5. Save and reopen the browser.

This optional workaround can reset after updates or sync. The switcher works on regular web pages. Restore a shortcut at `chrome://extensions/shortcuts` to undo it.
