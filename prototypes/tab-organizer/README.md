# AI tab organizer prototype

This isolated prototype evaluates tab grouping and duplicate cleanup in a separate Chrome profile. It does not add an organizer command to the released Keybar extension.

## Chosen route

The prototype uses OpenAI's local **Sign in with ChatGPT** DevKit. It requests the `chatgpt.tokens.use.direct` permission through the DevKit's browser sign-in flow and sends requests through its local Node SDK. The browser extension never sees OAuth tokens. The SDK stores credentials encrypted with a key held in the macOS Keychain.

The DevKit is source-only and its current license is noncommercial. This prototype is for personal evaluation only; do not ship it as part of a commercial Keybar release without a different provider integration and the required rights. The DevKit is pinned as a Git submodule so its exact source and license stay visible.

Installing the pinned DevKit currently reports dependency audit advisories, including a high-severity advisory in its optional `undici` dependency. Review the [research notes](../../docs/research/ai-tab-organizer.md) before running the prototype and resolve the upstream dependency finding before broader distribution.

Tab title, up to 2,048 URL characters, pinned state, and existing group name are sent to ChatGPT with a temporary request-local number to match the response to each tab. That number is not the Chrome tab ID and is discarded after the response. The full URL stays in the extension for stale-tab checks. No page contents, cookies, or browsing history are read. Tab titles and URLs are untrusted input. The AI returns a proposal; the extension validates Chrome tab IDs against current browser state and requires a separate user selection before grouping or closing. Pinned tabs are protected from grouping and closing. Closed URLs can be reopened, but page state such as unsaved form data cannot be restored.

## Requirements

- macOS, Google Chrome, Node.js 22.12+, Git, and Xcode Command Line Tools.
- An eligible ChatGPT plan/account and network access for ChatGPT requests.
- The repository checked out with submodules.

## Setup

From the repository root:

```sh
git submodule update --init --recursive
npm ci --prefix prototypes/tab-organizer/vendor/sign-in-with-chatgpt-devkit
npm run build -w @siwc/local --prefix prototypes/tab-organizer/vendor/sign-in-with-chatgpt-devkit
```

1. Open `chrome://extensions`, turn on Developer mode, and load `prototypes/tab-organizer/extension` as an unpacked extension.
2. Copy its extension ID, then register the local host:

   ```sh
   node prototypes/tab-organizer/install-host.mjs EXTENSION_ID
   ```

3. Open the prototype extension popup. Use **Continue with ChatGPT** and approve the requested access in the browser. The connection is local to this prototype and can be disconnected from the popup.
4. Use a dedicated Chrome profile. Click **Load sample tabs** to create a representative set of local-only product, research, travel, and duplicate tabs. Then select **Organize tabs**.
5. Review each suggested group and any close candidates. Grouping is selected by default; closing is never selected by default. Click **Apply selected changes** to make browser changes.

The native host requires Chrome's exact extension ID in its `allowed_origins` list. Re-run the installer if the extension ID changes. To remove the prototype, first choose **Disconnect** in the popup if connected, then remove the extension, native host registration, launcher, stored credentials, and Keychain encryption key:

```sh
rm -f "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.keybar.tab_organizer.json"
rm -rf "$HOME/Library/Application Support/Keybar Tab Organizer Prototype"
security delete-generic-password -a credential-encryption-key -s com.keybar.tab-organizer
```

## Evaluation notes

`docs/research/ai-tab-organizer.md` records the dated provider comparison, official references, permissions, setup and distribution implications, the sample-tab evaluation, and what still needs a live account run. The UI reports request latency. The service does not expose a per-request price or token count for ChatGPT plan usage; plan limits and usage are managed by ChatGPT and can vary by plan, model, and activity.

## Failure behavior

- Missing DevKit build, native host registration, or Node.js: show a setup error with the failed local-host action.
- Disconnected, ineligible, or sharing-disabled account: offer **Continue with ChatGPT** and explain that an eligible account and explicit plan-usage permission are required.
- Network, timeout, limit, or malformed response: keep the tab set untouched and allow retry. Analysis and sign-in requests time out after two and five minutes respectively.
- Tabs that closed, changed URL, or became pinned since analysis are skipped. Other groups and closes continue, with a partial-result summary.
- Closing stores the title, URL, and original window in `chrome.storage.session`; **Reopen last closed tabs** creates new tabs at those URLs. Failed reopen attempts remain available to retry. Unsaved page state is not recoverable.

## Scope and limitations

The prototype targets Chrome on macOS. Chrome's Native Messaging API also works on Windows and Linux, but host registration and secure credential storage require per-OS installers and key-store adapters. Windows and Linux packaging, Chrome Web Store distribution, provider latency measurements under normal account load, and production policy review remain follow-up work.
