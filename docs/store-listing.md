# Shortcuts

Suggested shortcuts: **Control+A** for tabs; **Cmd+T** for commands (**Ctrl+T** on Windows/Linux). Customize at `chrome://extensions/shortcuts`. Chrome may reserve Cmd/Ctrl+T. On Windows/Linux, Control+A replaces Select All.

## Want Ctrl+Tab?

Chrome doesn't let extensions set Ctrl+Tab by default. First, assign **Control+A** to **Open the tab switcher** at `chrome://extensions/shortcuts`.

### Mac

1. Quit Chrome with **Cmd+Q**.
2. Back up and open `~/Library/Application Support/Google/Chrome/Default/Preferences` in a plain-text editor.
3. In Command Menu's `open-tab-switcher` entry, change `mac:Ctrl+A` to `mac:Ctrl+Tab`. Save and reopen Chrome.

### Windows

1. Quit Chrome completely.
2. Back up and open `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Preferences` in Notepad.
3. In Command Menu's `open-tab-switcher` entry, change `windows:Ctrl+A` to `windows:Ctrl+Tab`. Save and reopen Chrome.

### Linux

1. Quit Chrome completely.
2. Back up and open `~/.config/google-chrome/Default/Preferences` in a text editor.
3. In Command Menu's `open-tab-switcher` entry, change `linux:Ctrl+A` to `linux:Ctrl+Tab`. Save and reopen Chrome.

Different profile or browser? Use **Profile Path** from `chrome://version` before quitting.

Change only this extension's binding, including a matching copy under `account_values`. If Ctrl+Tab is already assigned, stop. Updates or sync may reset this setup. Undo it at `chrome://extensions/shortcuts`.
