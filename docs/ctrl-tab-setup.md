# Use Control+Tab

Chrome does not let extensions assign **Control+Tab** by default. First, assign **Control+A** to **Open the tab switcher** at `chrome://extensions/shortcuts`. On Windows and Linux, Control+A replaces Select All when assigned. Use **Profile Path** from `chrome://version` if you use a different Chrome profile.

Quit Chrome completely and back up the profile's `Preferences` file before editing it. Find Keybar's `open-tab-switcher` entry in `extensions.commands`, then change the platform-specific value:

- **Mac:** `mac:Ctrl+A` → `mac:Ctrl+Tab` in `~/Library/Application Support/Google/Chrome/Default/Preferences`.
- **Windows:** `windows:Ctrl+A` → `windows:Ctrl+Tab` in `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Preferences`.
- **Linux:** `linux:Ctrl+A` → `linux:Ctrl+Tab` in `~/.config/google-chrome/Default/Preferences`.

Save the file and reopen Chrome. Change only Keybar's binding, including a matching copy under `account_values`. If Control+Tab is already assigned, stop. Updates or sync may reset this setup. Undo it at `chrome://extensions/shortcuts`.

References: [Chrome Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands), [Quick Tab Switch setup](https://chromewebstore.google.com/detail/quick-tab-switch/jceaicinopjaoknlhdfdjileacogogep).
