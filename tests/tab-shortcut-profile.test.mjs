import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test, mock } from 'node:test';
import fsPromises from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  configureProfile,
  findExtension,
  planShortcut,
  waitForBrowserExit,
} from '../scripts/configure-tab-shortcut.mjs';

const id = 'a'.repeat(32);
const other = 'b'.repeat(32);
const binding = { extension: id, command_name: 'open-tab-switcher', global: false };
const preferences = () => ({
  extensions: {
    commands: {
      'mac:Ctrl+A': binding,
      'mac:Command+T': { extension: id, command_name: 'open-command-palette', global: false },
      'mac:Alt+Q': { extension: other, command_name: 'different-command', global: false },
    },
  },
  account_values: { extensions: { commands: { 'mac:Ctrl+A': binding } } },
  unrelated: { nested: ['keep', 42] },
});

async function fixture(t) {
  const profile = await mkdtemp(path.join(os.tmpdir(), 'shortcut-profile-fixture-'));
  t.after(() => rm(profile, { recursive: true, force: true }));
  const file = path.join(profile, 'Preferences');
  const original = JSON.stringify(preferences(), null, 2);
  await writeFile(file, original, { mode: 0o600 });
  await writeFile(
    path.join(profile, 'Secure Preferences'),
    JSON.stringify({
      extensions: { settings: { [id]: { commands: { 'open-tab-switcher': { suggested_key: 'MacCtrl+A' } } } } },
    }),
  );
  return { profile, file, original, isRunning: async () => false };
}

test('changes only the selected command in local/account preferences and is idempotent', () => {
  const input = preferences();
  const before = structuredClone(input);
  const result = planShortcut(input, id);
  assert.deepEqual(input, before);
  for (const scope of [result.preferences, result.preferences.account_values]) {
    assert.deepEqual(scope.extensions.commands['mac:Ctrl+Tab'], binding);
    assert.equal(Object.hasOwn(scope.extensions.commands, 'mac:Ctrl+A'), false);
  }
  assert.deepEqual(
    result.preferences.extensions.commands['mac:Command+T'],
    before.extensions.commands['mac:Command+T'],
  );
  assert.deepEqual(result.preferences.extensions.commands['mac:Alt+Q'], before.extensions.commands['mac:Alt+Q']);
  assert.deepEqual(result.preferences.unrelated, before.unrelated);
  assert.deepEqual(planShortcut(result.preferences, id).changes, []);
});

test('stored platform notation uses Ctrl, including physical Control on macOS', () => {
  for (const platform of ['mac', 'windows', 'linux']) {
    const result = planShortcut({ extensions: { commands: { [`${platform}:Ctrl+A`]: binding } } }, id, platform);
    assert.deepEqual(Object.keys(result.preferences.extensions.commands), [`${platform}:Ctrl+Tab`]);
  }
});

test('adds a missing local assignment without creating a new account assignment', () => {
  const result = planShortcut({ extensions: { commands: {} }, account_values: {} }, id);
  assert.deepEqual(result.preferences.extensions.commands['mac:Ctrl+Tab'], binding);
  assert.deepEqual(result.preferences.account_values, {});
});

test('refuses conflicts in either scope, ambiguous assignments, and global scope', () => {
  for (const label of ['local', 'account']) {
    const input = preferences();
    const scope = label === 'local' ? input : input.account_values;
    scope.extensions.commands['mac:Ctrl+Tab'] = { ...binding, extension: other };
    assert.throws(() => planShortcut(input, id), /already assigned/);
  }
  const ambiguous = preferences();
  ambiguous.extensions.commands['mac:Alt+A'] = binding;
  assert.throws(() => planShortcut(ambiguous, id), /Multiple/);
  const global = preferences();
  global.extensions.commands['mac:Ctrl+A'] = { ...binding, global: true };
  assert.throws(() => planShortcut(global, id), /In Chrome/);
});

test('extension discovery requires a matching installed command and disambiguates by ID', () => {
  const settings = {
    extensions: {
      settings: {
        [id]: { commands: { 'open-tab-switcher': {} } },
        [other]: { manifest: { commands: { 'open-tab-switcher': {} } } },
      },
    },
  };
  assert.throws(() => findExtension({}, settings), /Expected one/);
  assert.throws(() => findExtension({}, settings, 'c'.repeat(32)), /Expected one/);
  assert.equal(findExtension({}, settings, id), id);
});

test('dry run leaves all profile files untouched', async (t) => {
  const f = await fixture(t);
  const files = await readdir(f.profile);
  const result = await configureProfile(f);
  assert.equal(result.apply, false);
  assert.equal(result.changes.length, 2);
  assert.equal(await readFile(f.file, 'utf8'), f.original);
  assert.deepEqual(await readdir(f.profile), files);
});

test('CLI defaults to a dry run on a temporary profile', { skip: process.platform !== 'darwin' }, async (t) => {
  const f = await fixture(t);
  const script = fileURLToPath(new URL('../scripts/configure-tab-shortcut.mjs', import.meta.url));
  const result = JSON.parse(
    execFileSync(process.execPath, [script, '--browser', 'helium', '--profile', f.profile], {
      encoding: 'utf8',
    }),
  );
  assert.equal(result.apply, false);
  assert.equal(result.extensionId, id);
  assert.equal(await readFile(f.file, 'utf8'), f.original);
  assert.throws(() =>
    execFileSync(process.execPath, [script, '--browser', 'toString', '--profile', f.profile], {
      stdio: 'pipe',
    }),
  );
});

test('CLI runs through a symlink with spaces in its path', { skip: process.platform === 'win32' }, async (t) => {
  const f = await fixture(t);
  const linkedScript = path.join(f.profile, 'helper with spaces.mjs');
  await symlink(fileURLToPath(new URL('../scripts/configure-tab-shortcut.mjs', import.meta.url)), linkedScript);
  const output = execFileSync(process.execPath, [linkedScript, '--help'], { encoding: 'utf8' });
  assert.match(output, /Default: dry run/);
});

test('unrelated numeric tokens and formatting survive both dry run and apply exactly', async (t) => {
  const f = await fixture(t);
  const original = f.original.replace('42', '9007199254740993, 1.3438128418436612e+16, -0');
  await writeFile(f.file, original);
  await configureProfile(f);
  assert.equal(await readFile(f.file, 'utf8'), original);
  const result = await configureProfile({ ...f, apply: true });
  assert.equal(await readFile(result.backup, 'utf8'), original);
  assert.equal(await readFile(f.file, 'utf8'), original.replaceAll('"mac:Ctrl+A":', '"mac:Ctrl+Tab":'));
});

test('apply backs up exact bytes, preserves other settings, verifies output, and is idempotent', async (t) => {
  const f = await fixture(t);
  const result = await configureProfile({ ...f, apply: true });
  assert.equal(result.verified, true);
  assert.equal(await readFile(result.backup, 'utf8'), f.original);
  if (process.platform !== 'win32') assert.equal((await stat(result.backup)).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(await readFile(f.file, 'utf8')), planShortcut(preferences(), id).preferences);
  const files = await readdir(f.profile);
  const again = await configureProfile({ ...f, apply: true });
  assert.deepEqual(again.changes, []);
  assert.deepEqual(await readdir(f.profile), files);
});

test('post-replacement read failure reports the exact backup without overwriting newer preferences', async (t) => {
  const f = await fixture(t);
  const newer = f.original.replace('42', '43');
  const actualFile = await realpath(f.file);
  const actualReadFile = fsPromises.readFile;
  mock.method(fsPromises, 'readFile', async (...args) => {
    const data = await actualReadFile(...args);
    if (args[0] === actualFile && data.toString().includes('"mac:Ctrl+Tab"')) {
      await writeFile(f.file, newer);
      throw new Error('simulated verification read failure');
    }
    return data;
  });
  let failure;
  try {
    await assert.rejects(configureProfile({ ...f, apply: true }), (error) => {
      failure = error;
      return /Backup: .*Preferences\.before-ctrl-tab-.*\.bak/.test(error.message);
    });
  } finally {
    mock.restoreAll();
  }
  const backup = path.join(
    f.profile,
    (await readdir(f.profile)).find((name) => name.endsWith('.bak')),
  );
  assert.ok(failure.message.includes(backup));
  assert.equal(await readFile(backup, 'utf8'), f.original);
  assert.equal(await readFile(f.file, 'utf8'), newer);
  assert.ok(!(await readdir(f.profile)).some((name) => name.endsWith('.lock')));
});

test('running browser and restart during apply prevent writes', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    configureProfile({ ...f, apply: true, isRunning: async () => true, timeoutMs: 0 }),
    /still running/,
  );
  let checks = 0;
  await assert.rejects(configureProfile({ ...f, apply: true, isRunning: async () => ++checks >= 3 }), /restarted/);
  assert.equal(await readFile(f.file, 'utf8'), f.original);
  assert.ok(!(await readdir(f.profile)).some((name) => name.endsWith('.tmp') || name.endsWith('.lock')));
});

test('changes by another writer are preserved and a concurrent helper is rejected', async (t) => {
  const f = await fixture(t);
  const changed = JSON.stringify({ ...preferences(), unrelated: 'newer settings' });
  let checks = 0;
  await assert.rejects(
    configureProfile({
      ...f,
      apply: true,
      isRunning: async () => {
        if (++checks === 2) await writeFile(f.file, changed);
        return false;
      },
    }),
    /Preferences changed/,
  );
  assert.equal(await readFile(f.file, 'utf8'), changed);
  await writeFile(`${f.file}.command-menu.lock`, 'another helper');
  await assert.rejects(configureProfile({ ...f, apply: true }), /EEXIST/);
  assert.equal(await readFile(f.file, 'utf8'), changed);
  assert.equal(await readFile(`${f.file}.command-menu.lock`, 'utf8'), 'another helper');
});

test('exit detection succeeds immediately when closed and fails when its deadline expires', async () => {
  await waitForBrowserExit(async () => false, 0);
  await assert.rejects(
    waitForBrowserExit(async () => true, 0),
    /still running/,
  );
});
