# AI tab organizer prototype

This isolated prototype evaluates tab grouping and duplicate cleanup in a separate Chrome profile. It does not add an organizer command to the released Keybar extension.

## Chosen route

The prototype has two provider choices:

- **Codex models · ChatGPT plan** uses OpenAI's local **Sign in with ChatGPT** DevKit. It requests `chatgpt.tokens.use.direct` through the browser sign-in flow. The local Codex CLI supplies the model and supported reasoning-effort catalog; analysis itself uses the DevKit's direct Responses API client with no tools. OAuth tokens stay in the native host and the SDK stores them encrypted with a key held in macOS Keychain.
- **Anthropic · Claude Console API** accepts a Claude Console API key. The local host verifies it, then saves it directly to macOS Keychain. The extension never stores the key. The prototype does not offer Claude.ai sign-in or route Claude subscription credentials through the app; Anthropic's developer guidance directs third-party apps to Console API keys.

The model and reasoning controls use each provider's current catalog. Codex's bundled model catalog does not confirm that a selected model is enabled for the signed-in account; a successful analysis request does. Anthropic's Models API advertises each model's supported effort levels and whether thinking can be disabled. Calls to Anthropic are billed to the key's Console organization, subject to any credits or terms that organization has.

The DevKit is source-only and its current license is noncommercial. This prototype is for personal evaluation only; do not ship it as part of a commercial Keybar release without a different provider integration and the required rights. The DevKit commit is pinned as a Git submodule so its exact source and license stay visible; setup applies a small, idempotent local patch for selected reasoning effort and host-only token access without changing that commit.

Installing the pinned DevKit currently reports dependency audit advisories, including a high-severity advisory in its optional `undici` dependency. Review the [research notes](../../docs/research/ai-tab-organizer.md) before running the prototype and resolve the upstream dependency finding before broader distribution.

Tab title, up to 2,048 URL characters, pinned state, and existing group name are sent to ChatGPT with a temporary request-local number to match the response to each tab. That number is not the Chrome tab ID and is discarded after the response. The full URL stays in the extension for stale-tab checks. The browser password store, page contents, cookies, and browsing history are not read. URLs can themselves contain sensitive data, such as access tokens in query strings, and that text may be sent. Tab titles and URLs are untrusted input. The AI returns a proposal; the extension validates Chrome tab IDs against current browser state and requires a separate user selection before grouping or closing. Pinned tabs are protected from grouping and closing. Closed URLs can be reopened, but page state such as unsaved form data cannot be restored.

The default Codex model prefers **GPT-6 Luna**, then another listed Luna model, then the first account-listed model. Anthropic prefers a Haiku model, then the first listed model. Both default to non-reasoning when the model advertises it, or low effort when available. Users can change the model and reasoning setting. Setup patches the pinned local SDK working tree to pass the selected effort and expose a refreshed OAuth token only to the native host for Codex catalog discovery. The patch is idempotent and leaves the pinned submodule commit unchanged.

## Requirements

- macOS, Google Chrome, Node.js 22.12+, Git, and Xcode Command Line Tools.
- Codex CLI, an eligible ChatGPT account for the Codex model route, and network access.
- A Claude Console API key for the Anthropic route.
- The repository checked out with submodules.

## Setup

From the repository root:

```sh
git submodule update --init --recursive
npm ci --prefix prototypes/tab-organizer/vendor/sign-in-with-chatgpt-devkit
node prototypes/tab-organizer/apply-devkit-patch.mjs
npm run build -w @siwc/local --prefix prototypes/tab-organizer/vendor/sign-in-with-chatgpt-devkit
```

1. Open `chrome://extensions`, turn on Developer mode, and load `prototypes/tab-organizer/extension` as an unpacked extension.
2. Copy its extension ID, then register the local host:

   ```sh
   node prototypes/tab-organizer/install-host.mjs EXTENSION_ID
   ```

3. Open the prototype extension popup and choose **Codex models · ChatGPT plan** or **Anthropic · Claude Console API**.
4. For Codex models, use **Continue with ChatGPT** and approve plan usage in the browser. For Anthropic, paste a Claude Console API key; the local host checks it and saves it in Keychain. Neither credential is stored in Chrome.
5. Choose a model and reasoning setting. **Refresh models** fetches the latest provider catalog.
6. Use a dedicated Chrome profile. Click **Load sample tabs** to create local-only product, research, travel, and duplicate tabs. Then select **Organize tabs**.
7. Review each suggested group and any close candidates. Grouping is selected by default; closing is never selected by default. Click **Apply selected changes** to make browser changes.

The native host requires Chrome's exact extension ID in its `allowed_origins` list. Re-run the installer if the extension ID changes. To remove the prototype, first choose **Disconnect** in the popup if connected, then remove the extension, native host registration, launcher, stored credentials, and Keychain encryption key:

```sh
rm -f "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.keybar.tab_organizer.json"
rm -rf "$HOME/Library/Application Support/Keybar Tab Organizer Prototype"
security delete-generic-password -a credential-encryption-key -s com.keybar.tab-organizer
security delete-generic-password -a anthropic-console-api-key -s com.keybar.tab-organizer.anthropic
```

## Evaluation notes

`docs/research/ai-tab-organizer.md` records the dated provider comparison, official references, permissions, setup and distribution implications, the sample-tab evaluation, and what still needs a live account run. The UI reports request latency. The service does not expose a per-request price or token count for ChatGPT plan usage; plan limits and usage are managed by ChatGPT and can vary by plan, model, and activity.

Provider references: [Codex app-server model catalog and ChatGPT-plan authentication](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server), [OpenAI reasoning effort](https://developers.openai.com/api/docs/guides/reasoning), [Anthropic Models API](https://platform.claude.com/docs/en/api/models/list), [Anthropic effort](https://platform.claude.com/docs/en/build-with-claude/effort), [Anthropic thinking modes](https://platform.claude.com/docs/en/build-with-claude/thinking), and [Anthropic authentication restrictions for third-party apps](https://code.claude.com/docs/en/legal-and-compliance#authentication-and-credential-use).

## Failure behavior

- Missing DevKit build, native host registration, or Node.js: show a setup error with the failed local-host action.
- Disconnected, ineligible, or sharing-disabled ChatGPT account: offer **Continue with ChatGPT** and explain that explicit plan-usage permission is required.
- Invalid Anthropic key: keep the current Keychain entry unchanged and ask the user to verify the key in Claude Console.
- Codex model catalog mismatch: ask the user to update the Codex CLI and refresh; catalog presence alone does not establish account entitlement.
- Network, timeout, limit, or malformed response: keep the tab set untouched and allow retry. Analysis and sign-in requests time out after two and five minutes respectively.
- Tabs that closed, changed URL, or became pinned since analysis are skipped. Other groups and closes continue, with a partial-result summary.
- Closing stores the title, URL, and original window in `chrome.storage.session`; **Reopen last closed tabs** creates new tabs at those URLs. A later closing batch replaces the saved list, so only the latest batch can be reopened. Chrome clears session storage when it restarts or the extension is disabled, reloaded, or updated. Failed reopen attempts remain available to retry. Unsaved page state is not recoverable.

## Scope and limitations

The prototype targets Chrome on macOS. Chrome's Native Messaging API also works on Windows and Linux, but host registration and secure credential storage require per-OS installers and key-store adapters. Windows and Linux packaging, Chrome Web Store distribution, provider latency measurements under normal account load, and production policy review remain follow-up work.
