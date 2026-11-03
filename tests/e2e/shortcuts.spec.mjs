import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from './fixtures.mjs';
import { configureProfile } from '../../scripts/configure-tab-shortcut.mjs';

test('fresh installation registers suggested shortcuts except the reserved new-tab combination', async ({
  extension,
}) => {
  const commands = await extension.worker.evaluate(() => chrome.commands.getAll());
  const registered = new Map(commands.map((command) => [command.name, command.shortcut]));
  const manifest = JSON.parse(
    await readFile(path.resolve(process.env.EXTENSION_PATH ?? 'dist', 'manifest.json'), 'utf8'),
  );

  // The requested Cmd/Ctrl+T suggestion can remain unassigned because Chrome reserves it.
  const allowedUnassigned = new Set(['open-command-palette']);
  for (const [name, definition] of Object.entries(manifest.commands)) {
    expect(registered.has(name), `${name} must be exposed by the browser`).toBe(true);
    if (definition.suggested_key && !allowedUnassigned.has(name)) {
      expect(registered.get(name), `${name} must have a working assignment`).toBeTruthy();
    }
  }
  expect(registered.get('open-tab-switcher')).toBe(process.platform === 'darwin' ? '⌃A' : 'Ctrl+A');
  expect(['', process.platform === 'darwin' ? '⌘T' : 'Ctrl+T']).toContain(registered.get('open-command-palette'));
});

test('macOS stores physical Control as Ctrl in profile preferences', async ({ extension }) => {
  test.skip(process.platform !== 'darwin', 'macOS preference notation');
  await extension.context.close();
  const preferences = JSON.parse(await readFile(path.join(extension.profile, 'Default', 'Preferences'), 'utf8'));
  expect(preferences.extensions.commands['mac:Ctrl+A']).toMatchObject({
    command_name: 'open-tab-switcher',
    extension: extension.id,
    global: false,
  });
});

test('helper updates a real temporary Chromium profile without rewriting unrelated data', async ({ extension }) => {
  test.skip(process.platform !== 'darwin', 'macOS profile helper');
  await extension.context.close();
  const profile = path.join(extension.profile, 'Default');
  const original = await readFile(path.join(profile, 'Preferences'), 'utf8');
  const preview = await configureProfile({ profile });
  expect(preview.changes.length).toBeGreaterThan(0);
  expect(await readFile(path.join(profile, 'Preferences'), 'utf8')).toBe(original);
  const result = await configureProfile({ profile, apply: true, isRunning: async () => false });
  expect(result.verified).toBe(true);
  expect(await readFile(result.backup, 'utf8')).toBe(original);
  const updated = await readFile(path.join(profile, 'Preferences'), 'utf8');
  expect(updated).toBe(original.replaceAll('"mac:Ctrl+A":', '"mac:Ctrl+Tab":'));
  expect((await configureProfile({ profile })).changes).toEqual([]);
});
