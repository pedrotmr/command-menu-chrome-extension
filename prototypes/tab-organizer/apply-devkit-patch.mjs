#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const devkitDirectory = new URL('./vendor/sign-in-with-chatgpt-devkit/', import.meta.url);
const changes = [
  {
    path: new URL('packages/local/src/types.ts', devkitDirectory),
    before: '  instructions?: string;\n  signal?: AbortSignal;',
    after: '  instructions?: string;\n  reasoningEffort?: "none";\n  signal?: AbortSignal;',
  },
  {
    path: new URL('packages/local/src/responses.ts', devkitDirectory),
    before: '      store: false,\n      stream: true,',
    after:
      '      ...(options.reasoningEffort === "none" ? { reasoning: { effort: "none" } } : {}),\n      store: false,\n      stream: true,',
  },
];

const updates = await Promise.all(
  changes.map(async ({ path, before, after }) => {
    const source = await readFile(path, 'utf8');
    if (source.includes(after)) return undefined;
    if (source.split(before).length !== 2) {
      throw new Error(`The pinned DevKit no longer matches the expected patch location: ${fileURLToPath(path)}`);
    }
    return { path, source: source.replace(before, after) };
  }),
);

for (const update of updates) {
  if (update) await writeFile(update.path, update.source);
}

process.stdout.write('Applied the GPT-6 Luna non-reasoning request patch.\n');
