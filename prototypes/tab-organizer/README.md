# AI tab organizer prototype

This isolated prototype evaluates tab grouping and duplicate cleanup in a separate Chrome profile. It does not add an organizer command to the released Keybar extension.

## Chosen route

The prototype has two provider choices:

- **Codex models · ChatGPT plan** uses OpenAI's local **Sign in with ChatGPT** DevKit. It requests `chatgpt.tokens.use.direct` through the browser sign-in flow. The local Codex CLI supplies the model and supported reasoning-effort catalog; analysis itself uses the DevKit's direct Responses API client with no tools. OAuth tokens stay in the native host and the SDK stores them encrypted with a key held in macOS Keychain.
- **Claude Code · Claude plan** uses the user's installed, unmodified Claude Code CLI. **Sign in with Claude Code** opens Terminal and runs `claude auth login`; the user completes Anthropic's own sign-in flow there. The host checks `claude auth status` and accepts Claude account OAuth only. Analysis starts `claude -p`, streams tab metadata through stdin, and never reads, stores, or forwards Claude credentials. The prototype does not sign out of Claude Code because that would also sign the user out of their CLI outside this extension.

Codex's bundled model catalog does not confirm that a selected model is enabled for the signed-in account; a successful analysis request does. Claude Code does not expose a subscription-specific model catalog, so the prototype offers its documented `haiku`, `sonnet`, `opus`, and `fable` aliases and CLI effort flags. Model access and supported effort levels depend on the signed-in account and selected model; the CLI validates them when a request runs. The CLI does not offer a non-reasoning switch. Haiku with low effort is the default. Claude usage follows the user's Claude plan and limits.

The DevKit is source-only and its current license is noncommercial. Anthropic's developer guidance says products that interact with Claude should use Console API-key authentication, while its legal page permits an end user to sign in to the unmodified Claude Code binary with their own subscription. This local prototype tests that binary-launch route only; it is not a production policy approval. Review the terms for any wider distribution. Do not ship the DevKit in a commercial Keybar release without different rights and provider integration. The DevKit commit is pinned as a Git submodule so its exact source and license stay visible; setup applies a small, idempotent local patch for selected reasoning effort and host-only token access without changing that commit.

Installing the pinned DevKit currently reports dependency audit advisories, including a high-severity advisory in its optional `undici` dependency. Review the [research notes](../../docs/research/ai-tab-organizer.md) before running the prototype and resolve the upstream dependency finding before broader distribution.

Tab title, up to 2,048 URL characters, pinned state, and existing group name are sent to ChatGPT with a temporary request-local number to match the response to each tab. That number is not the Chrome tab ID and is discarded after the response. The full URL stays in the extension for stale-tab checks. The browser password store, page contents, cookies, and browsing history are not read. URLs can themselves contain sensitive data, such as access tokens in query strings, and that text may be sent. Tab titles and URLs are untrusted input. The AI returns a proposal; the extension validates Chrome tab IDs against current browser state and requires a separate user selection before grouping or closing. Pinned tabs are protected from grouping and closing. Closed URLs can be reopened, but page state such as unsaved form data cannot be restored.

The default Codex model prefers **GPT-6 Luna**, then another listed Luna model, then the first account-listed model. Claude Code defaults to the **Haiku** alias with low effort. Users can change the model and reasoning effort. Setup patches the pinned local SDK working tree to pass the selected effort and expose a refreshed OAuth token only to the native host for Codex catalog discovery. The patch is idempotent and leaves the pinned submodule commit unchanged.

## Requirements

- macOS, Google Chrome, Node.js 22.12+, Git, and Xcode Command Line Tools.
- Codex CLI, an eligible ChatGPT account for the Codex model route, and network access.
- Claude Code CLI and a Claude account for the Claude route. If Claude Code is not found during setup, install it and rerun the installer.
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

3. Open the prototype extension popup and choose **Codex models · ChatGPT plan** or **Claude Code · Claude plan**.
4. For Codex models, use **Continue with ChatGPT** and approve plan usage in the browser. For Claude Code, click **Sign in with Claude Code** and finish the sign-in in Terminal. Reopen the popup to refresh the connection status. Neither credential is stored in Chrome.
5. Choose a model and reasoning effort. **Reload model options** refreshes the Codex catalog or reloads Claude Code's documented aliases.
6. Use a dedicated Chrome profile. Click **Load sample tabs** to create local-only product, research, travel, and duplicate tabs. Then select **Organize tabs**.
7. Review each suggested group and any close candidates. Grouping is selected by default; closing is never selected by default. Click **Apply selected changes** to make browser changes.

The native host requires Chrome's exact extension ID in its `allowed_origins` list. Re-run the installer if the extension ID changes. To remove the prototype, first choose **Disconnect** in the popup if connected, then remove the extension, native host registration, launcher, stored credentials, and Keychain encryption key:

```sh
rm -f "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.keybar.tab_organizer.json"
rm -rf "$HOME/Library/Application Support/Keybar Tab Organizer Prototype"
security delete-generic-password -a credential-encryption-key -s com.keybar.tab-organizer
```

If you used an earlier version that accepted a Claude Console API key, that unused key is no longer read. Remove its old Keychain entry separately if desired:

```sh
security delete-generic-password -a anthropic-console-api-key -s com.keybar.tab-organizer.anthropic
```

## Evaluation notes

`docs/research/ai-tab-organizer.md` records the dated provider comparison, official references, permissions, setup and distribution implications, the sample-tab evaluation, and what still needs a live account run. The UI reports request latency. It does not expose per-request cost or token counts; plan limits and usage are managed by ChatGPT or Claude and can vary by plan, model, and activity.

Provider references: [Codex app-server model catalog and ChatGPT-plan authentication](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server), [OpenAI reasoning effort](https://developers.openai.com/api/docs/guides/reasoning), [Claude Code CLI reference](https://code.claude.com/docs/en/cli-usage), and [Claude Code authentication and credential use](https://code.claude.com/docs/en/legal-and-compliance#authentication-and-credential-use).

## Failure behavior

- Missing DevKit build, native host registration, or Node.js: show a setup error with the failed local-host action.
- Disconnected, ineligible, or sharing-disabled ChatGPT account: offer **Continue with ChatGPT** and explain that explicit plan-usage permission is required.
- Claude Code CLI path not registered: install the CLI if needed, then rerun setup. Missing Claude account sign-in: open Terminal through **Sign in with Claude Code** and finish `claude auth login` there. Console API-key or other authentication modes are rejected without changing the user's existing CLI credentials.
- Codex model catalog mismatch: ask the user to update the Codex CLI and refresh; catalog presence alone does not establish account entitlement.
- Network, timeout, model-access, plan-limit, or malformed response: keep the tab set untouched and allow retry. Analysis requests time out after two minutes; provider sign-in runs in the provider's own flow.
- Tabs that closed, changed URL, or became pinned since analysis are skipped. Other groups and closes continue, with a partial-result summary.
- Closing stores the title, URL, and original window in `chrome.storage.session`; **Reopen last closed tabs** creates new tabs at those URLs. A later closing batch replaces the saved list, so only the latest batch can be reopened. Chrome clears session storage when it restarts or the extension is disabled, reloaded, or updated. Failed reopen attempts remain available to retry. Unsaved page state is not recoverable.

## Scope and limitations

The prototype targets Chrome on macOS. Chrome's Native Messaging API also works on Windows and Linux, but host registration and secure credential storage require per-OS installers and key-store adapters. Windows and Linux packaging, Chrome Web Store distribution, provider latency measurements under normal account load, and production policy review remain follow-up work.
