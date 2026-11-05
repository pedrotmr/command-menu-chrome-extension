#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const devkitDirectory = new URL('./vendor/sign-in-with-chatgpt-devkit/', import.meta.url);
const changes = [
  {
    path: new URL('packages/local/src/types.ts', devkitDirectory),
    before: '  instructions?: string;\n  signal?: AbortSignal;',
    after:
      '  instructions?: string;\n  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";\n  signal?: AbortSignal;',
  },
  {
    path: new URL('packages/local/src/responses.ts', devkitDirectory),
    before: '      store: false,\n      stream: true,',
    after:
      '      ...(options.reasoningEffort ? { reasoning: { effort: options.reasoningEffort } } : {}),\n      store: false,\n      stream: true,',
  },
  {
    path: new URL('packages/local/src/types.ts', devkitDirectory),
    before: 'export interface ChatGPTClient {\n  signIn(options?: SignInOptions): Promise<SessionState>;',
    after:
      'export interface ChatGPTClient {\n  /** Return a refreshed token only to the trusted local process; never expose it over extension IPC. */\n  getAccessToken(options?: { signal?: AbortSignal }): Promise<string>;\n  signIn(options?: SignInOptions): Promise<SessionState>;',
  },
  {
    path: new URL('packages/local/src/index.ts', devkitDirectory),
    before: '    async listModels(options = {}) { return authenticated(listModels, options.signal); },',
    after:
      '    async getAccessToken(options = {}) { return authenticated(async (accessToken) => accessToken, options.signal); },\n\n    async listModels(options = {}) { return authenticated(listModels, options.signal); },',
  },
];

const byPath = new Map();
for (const change of changes) {
  const path = fileURLToPath(change.path);
  const entries = byPath.get(path) || [];
  entries.push(change);
  byPath.set(path, entries);
}

const updates = await Promise.all(
  [...byPath].map(async ([path, entries]) => {
    let source = await readFile(path, 'utf8');
    for (const { before, after } of entries) {
      if (source.includes(after)) continue;
      if (source.split(before).length !== 2) {
        throw new Error(`The pinned DevKit no longer matches the expected patch location: ${path}`);
      }
      source = source.replace(before, after);
    }
    return { path, source };
  }),
);

for (const update of updates) await writeFile(update.path, update.source);

process.stdout.write('Applied the selected-reasoning and local Codex-token patches to the DevKit working tree.\n');
