# Configure Control+Tab on macOS

The helper supports Chrome and Helium. It uses the browser's last-used profile, discovers the installed tab-switcher command, and previews changes by default.

```bash
npm run configure:tab-shortcut -- --browser helium
```

Quit the browser completely, then apply:

```bash
npm run configure:tab-shortcut -- --browser helium --apply
```

Use `--browser chrome` for Chrome. Reopen the browser afterward and try Control+Tab on a regular web page. A verified file edit does not prove keyboard activation.

- `--profile "/path/from/chrome-version"` selects an explicit Profile Path instead of the last-used profile.
- `--extension-id ID` selects an installation when multiple extensions expose the command.
- `--wait-seconds 30` changes the browser-exit deadline (default 15, maximum 60). The helper never quits or kills the browser.
- `--help` prints usage.

Applying creates an exact backup beside `Preferences`, replaces the file atomically, and verifies the saved JSON. It updates matching local/account bindings, preserves other commands and settings, and refuses conflicts or a second helper holding its lock. Reapplying an unchanged binding creates no extra backup. To restore the exact backup, quit the browser first; restoring a backup also restores its other settings.

If verification fails after replacement, the error identifies the backup. Restore it manually after quitting the browser; the helper does not overwrite a file that another process may have changed.

If macOS reports `Operation not permitted`, grant the app running this command access to the browser's data and retry. If a previous interrupted run left `Preferences.keybar.lock`, confirm that helper and browser have exited before removing that lock.

For manual setup steps, see the [Control+Tab setup guide](ctrl-tab-setup.md). For shortcut limitations, see the [store description](store-listing.md).
