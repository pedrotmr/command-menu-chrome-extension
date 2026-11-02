import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from './fixtures.mjs';

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
