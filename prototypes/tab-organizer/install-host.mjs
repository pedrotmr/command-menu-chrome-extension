#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
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
const appSupportDirectory = resolve(homedir(), 'Library/Application Support/Keybar Tab Organizer Prototype');
const launcherPath = resolve(appSupportDirectory, 'native-host.sh');
const runtimeConfigPath = resolve(appSupportDirectory, 'codex-runtime.json');
const shellQuote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

function resolveCodexPath() {
  let codexPath;
  try {
    codexPath = execFileSync('/usr/bin/which', ['codex'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    throw new Error('Install the Codex CLI and make `codex` available in PATH before registering this prototype.');
  }
  if (!codexPath.startsWith('/')) throw new Error('The Codex CLI path could not be resolved.');

  if (codexPath.includes('/.asdf/shims/')) {
    try {
      const asdfPath = execFileSync('/usr/bin/which', ['asdf'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (!asdfPath.startsWith('/')) throw new Error('asdf could not be resolved.');
      const installed = execFileSync(asdfPath, ['which', 'codex'], {
        encoding: 'utf8',
        env: process.env,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (installed.startsWith('/') && existsSync(installed)) codexPath = installed;
    } catch {
      throw new Error('Could not resolve Codex through asdf. Run `asdf which codex` successfully, then register again.');
    }
  }
  if (!existsSync(codexPath)) throw new Error('The Codex CLI path does not exist. Reinstall Codex and try again.');
  return codexPath;
}

let codexPath;
try {
  codexPath = resolveCodexPath();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(2);
}

const manifest = {
  name: 'com.keybar.tab_organizer',
  description: 'Keybar AI tab organizer local companion (prototype)',
  path: launcherPath,
  type: 'stdio',
  allowed_origins: [`chrome-extension://${extensionId}/`],
};
const manifestPath = resolve(
  homedir(),
  'Library/Application Support/Google/Chrome/NativeMessagingHosts/com.keybar.tab_organizer.json',
);
await mkdir(dirname(manifestPath), { recursive: true });
await mkdir(appSupportDirectory, { recursive: true, mode: 0o700 });
await writeFile(launcherPath, `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(hostPath)} "$@"\n`, {
  mode: 0o700,
});
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
await writeFile(runtimeConfigPath, `${JSON.stringify({ codexPath }, null, 2)}\n`, { mode: 0o600 });
await Promise.all([chmod(launcherPath, 0o700), chmod(manifestPath, 0o600), chmod(runtimeConfigPath, 0o600)]);
process.stdout.write(`Registered local host: ${manifestPath}\n`);
process.stdout.write(`Created executable launcher: ${launcherPath}\n`);
process.stdout.write(`Saved Codex CLI path: ${runtimeConfigPath}\n`);
process.stdout.write('Restart Chrome before trying the prototype.\n');
