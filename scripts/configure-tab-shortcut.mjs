import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import fsPromises, { chmod, copyFile, open, realpath, rename, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify, parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { applyEdits, findNodeAtLocation, parseTree } from 'jsonc-parser';

const run = promisify(execFile);
const command = 'open-tab-switcher';
const browsers = {
  chrome: { directory: 'Google/Chrome', app: '/Google Chrome.app/' },
  helium: { directory: 'net.imput.helium', app: '/Helium.app/' },
};

export function planShortcut(preferences, extensionId, platform = 'mac') {
  assert.match(extensionId, /^[a-p]{32}$/, 'Invalid extension ID');
  assert.ok(['mac', 'windows', 'linux'].includes(platform), 'Unsupported platform');
  const result = structuredClone(preferences);
  const destination = `${platform}:Ctrl+Tab`;
  const changes = [];
  for (const [label, scope] of [
    ['local', result],
    ['account', result.account_values],
  ]) {
    if (!scope) continue;
    const bindings = scope.extensions?.commands;
    if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) {
      assert.notEqual(label, 'local', 'Missing extensions.commands; assign a shortcut in the browser first');
      continue;
    }
    const belongs = (value) => value?.extension === extensionId && value?.command_name === command;
    const current = Object.keys(bindings).filter((key) => key.startsWith(`${platform}:`) && belongs(bindings[key]));
    assert.ok(current.length <= 1, `Multiple ${label} bindings for this command`);
    assert.ok(
      !Object.hasOwn(bindings, destination) || belongs(bindings[destination]),
      `${destination} is already assigned`,
    );
    if (current[0] === destination) {
      assert.equal(bindings[destination].global, false, 'Set shortcut scope to In Chrome first');
      continue;
    }
    if (label === 'account' && !current.length) continue;
    const value = current.length
      ? bindings[current[0]]
      : { command_name: command, extension: extensionId, global: false };
    if (current.length) {
      assert.equal(bindings[current[0]].global, false, 'Set shortcut scope to In Chrome first');
      delete bindings[current[0]];
    }
    bindings[destination] = value;
    changes.push({ scope: label, from: current[0] ?? null, to: destination });
  }
  return { preferences: result, changes };
}

export function findExtension(preferences, securePreferences, requestedId) {
  const settings = { ...preferences.extensions?.settings, ...securePreferences.extensions?.settings };
  const ids = Object.keys(settings).filter((id) => {
    const info = settings[id];
    return (!requestedId || id === requestedId) && (info.commands?.[command] || info.manifest?.commands?.[command]);
  });
  assert.equal(ids.length, 1, 'Expected one installed tab-switcher extension; use --extension-id to disambiguate');
  return ids[0];
}

export async function waitForBrowserExit(isRunning, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (await isRunning()) {
    assert.ok(Date.now() < deadline, 'Browser is still running; quit it completely and retry');
    await new Promise((resolve) => setTimeout(resolve, Math.min(250, Math.max(1, deadline - Date.now()))));
  }
}

function editShortcutText(text, plan) {
  const tree = parseTree(text);
  const edits = plan.changes.map((change) => {
    const location =
      change.scope === 'account' ? ['account_values', 'extensions', 'commands'] : ['extensions', 'commands'];
    if (change.from) {
      const key = findNodeAtLocation(tree, [...location, change.from]).parent.children[0];
      return { offset: key.offset, length: key.length, content: JSON.stringify(change.to) };
    }
    const object = findNodeAtLocation(tree, location);
    const scope = change.scope === 'account' ? plan.preferences.account_values : plan.preferences;
    return {
      offset: object.offset + object.length - 1,
      length: 0,
      content: `${object.children.length ? ',' : ''}${JSON.stringify(change.to)}:${JSON.stringify(scope.extensions.commands[change.to])}`,
    };
  });
  const updated = applyEdits(text, edits);
  assert.deepEqual(JSON.parse(updated), plan.preferences, 'Shortcut edit changed unexpected preferences');
  return updated;
}

export async function configureProfile({ profile, extensionId, apply = false, isRunning, timeoutMs = 15000 }) {
  if (apply) await waitForBrowserExit(isRunning, timeoutMs);
  const directory = await realpath(profile);
  const file = path.join(directory, 'Preferences');
  const original = await fsPromises.readFile(file);
  const text = original.toString('utf8');
  assert.deepEqual(Buffer.from(text), original, 'Preferences must contain valid UTF-8');
  const preferences = JSON.parse(text);
  let secure = {};
  try {
    secure = JSON.parse(await fsPromises.readFile(path.join(directory, 'Secure Preferences'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const id = findExtension(preferences, secure, extensionId);
  const plan = planShortcut(preferences, id);
  const updated = editShortcutText(text, plan);
  const summary = { profile: directory, extensionId: id, apply, changes: plan.changes };
  if (!apply || !plan.changes.length) return summary;

  const lock = await open(`${file}.command-menu.lock`, 'wx', 0o600);
  const temporary = `${file}.command-menu-${randomUUID()}.tmp`;
  const backup = `${file}.before-ctrl-tab-${randomUUID()}.bak`;
  try {
    assert.ok(!(await isRunning()), 'Browser restarted; no preferences changed');
    assert.deepEqual(await fsPromises.readFile(file), original, 'Preferences changed; retry from the current file');
    await copyFile(file, backup, constants.COPYFILE_EXCL);
    await chmod(backup, 0o600);
    const handle = await open(temporary, 'wx', (await stat(file)).mode & 0o777);
    try {
      await handle.writeFile(updated);
      await handle.sync();
    } finally {
      await handle.close();
    }
    assert.ok(!(await isRunning()), 'Browser restarted; no preferences changed');
    assert.deepEqual(await fsPromises.readFile(file), original, 'Preferences changed; no preferences overwritten');
    await rename(temporary, file);
    try {
      assert.deepEqual(await fsPromises.readFile(file), Buffer.from(updated), 'Preference verification failed');
    } catch (error) {
      throw new Error(`Preference verification failed. Backup: ${backup}. Quit the browser before restoring it.`, {
        cause: error,
      });
    }
    return { ...summary, backup, verified: true };
  } finally {
    try {
      await rm(temporary, { force: true });
    } finally {
      try {
        await lock.close();
      } finally {
        await rm(`${file}.command-menu.lock`, { force: true });
      }
    }
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      browser: { type: 'string' },
      profile: { type: 'string' },
      'extension-id': { type: 'string' },
      'wait-seconds': { type: 'string', default: '15' },
      apply: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    console.log(
      'macOS: npm run configure:tab-shortcut -- --browser chrome|helium [--profile PATH] [--extension-id ID] [--apply] [--wait-seconds 15]',
    );
    console.log('Default: dry run. Quit the browser before --apply; reopen it afterward.');
    return;
  }
  assert.equal(process.platform, 'darwin', 'This profile helper currently supports macOS only');
  assert.ok(Object.hasOwn(browsers, values.browser), 'Choose --browser chrome or --browser helium');
  const browser = browsers[values.browser];
  const seconds = Number(values['wait-seconds']);
  assert.ok(Number.isFinite(seconds) && seconds >= 0 && seconds <= 60, '--wait-seconds must be between 0 and 60');
  const root = path.join(os.homedir(), 'Library/Application Support', browser.directory);
  let profile = values.profile;
  if (!profile) {
    const state = JSON.parse(await fsPromises.readFile(path.join(root, 'Local State'), 'utf8'));
    const name = state.profile?.last_used;
    assert.ok(
      typeof name === 'string' && name && name !== '.' && name !== '..' && path.basename(name) === name,
      'Cannot determine profile; use --profile with Profile Path from chrome://version',
    );
    profile = path.join(root, name);
  }
  const isRunning = async () => {
    const { stdout } = await run('ps', ['-axo', 'comm=']);
    return stdout.split('\n').some((line) => line.includes(browser.app) && !line.includes('crashpad'));
  };
  if (values.apply) console.error('Waiting for the browser to exit. Quit it completely if it is open.');
  console.log(
    JSON.stringify(
      await configureProfile({
        profile,
        extensionId: values['extension-id'],
        apply: values.apply,
        isRunning,
        timeoutMs: seconds * 1000,
      }),
      null,
      2,
    ),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
