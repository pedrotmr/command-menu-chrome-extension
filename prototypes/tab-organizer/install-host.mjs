#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionId = process.argv[2];
if (!/^[a-p]{32}$/.test(extensionId || '')) {
  process.stderr.write('Usage: node install-host.mjs <32-character Chrome extension ID>\n');
  process.exit(2);
}
if (process.platform !== 'darwin') {
  process.stderr.write("The prototype's Keychain credential encryption currently supports macOS only.\n");
  process.exit(2);
}

const projectDirectory = dirname(fileURLToPath(import.meta.url));
const hostPath = resolve(projectDirectory, 'native/host.mjs');
const manifest = {
  name: 'com.keybar.tab_organizer',
  description: 'Keybar AI tab organizer local companion (prototype)',
  path: process.execPath,
  args: [hostPath],
  type: 'stdio',
  allowed_origins: [`chrome-extension://${extensionId}/`],
};
const manifestPath = resolve(
  homedir(),
  'Library/Application Support/Google/Chrome/NativeMessagingHosts/com.keybar.tab_organizer.json',
);
await mkdir(dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
process.stdout.write(`Registered local host: ${manifestPath}\n`);
process.stdout.write('Restart Chrome before trying the prototype.\n');
