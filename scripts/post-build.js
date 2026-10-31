import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const sourceManifestPath = path.join(projectRoot, 'src', 'manifest.json');
const manifestPath = path.join(distDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf8'));

if (!fs.existsSync(path.join(distDir, manifest.background.service_worker))) {
  throw new Error(`Build output is missing ${manifest.background.service_worker}`);
}
if (!fs.existsSync(path.join(distDir, 'src', 'popup', 'index.html'))) {
  throw new Error('Build output is missing the native extension popup.');
}
const uiFontFiles = [
  ['open-sans', 'OpenSans-Latin.woff2'],
  ['open-sans', 'OpenSans-LatinExt.woff2'],
  ['outfit', 'Outfit-Latin.woff2'],
  ['outfit', 'Outfit-LatinExt.woff2'],
  ['nunito-sans', 'NunitoSans-Latin.woff2'],
  ['nunito-sans', 'NunitoSans-LatinExt.woff2'],
  ['sora', 'Sora-Latin.woff2'],
  ['sora', 'Sora-LatinExt.woff2'],
  ['ibm-plex-mono', 'IBMPlexMono-400-Latin.woff2'],
  ['ibm-plex-mono', 'IBMPlexMono-500-Latin.woff2'],
  ['ibm-plex-mono', 'IBMPlexMono-600-Latin.woff2'],
  ['ibm-plex-mono', 'IBMPlexMono-700-Latin.woff2'],
];
if (uiFontFiles.some(([family, file]) => !fs.existsSync(path.join(distDir, 'assets', 'fonts', family, file)))) {
  throw new Error('Build output is missing the isolated UI font asset.');
}
const contentBundles = ['content-command.js', 'content-tabs.js'];
if (contentBundles.some((file) => !fs.existsSync(path.join(distDir, file)))) {
  throw new Error('Build output is missing one of the on-demand page surfaces.');
}
for (const file of contentBundles) {
  const bundle = fs.readFileSync(path.join(distDir, file), 'utf8');
  if (/process\.env\.NODE_ENV/.test(bundle)) {
    throw new Error(`${file} contains an unbundled NODE_ENV reference.`);
  }
}
if (
  manifest.content_scripts?.length ||
  manifest.host_permissions?.length ||
  manifest.optional_host_permissions?.length
) {
  throw new Error('The extension build unexpectedly includes page injection or host permissions.');
}

fs.copyFileSync(sourceManifestPath, manifestPath);
const notices = fs
  .readFileSync(path.join(projectRoot, 'THIRD_PARTY_NOTICES.md'), 'utf8')
  .replaceAll('public/assets/', 'assets/');
const runtimeLicenses = ['react', 'react-dom'].map(
  (dependency) =>
    `\n\n## ${dependency}\n\n${fs.readFileSync(path.join(projectRoot, 'node_modules', dependency, 'LICENSE'), 'utf8')}`,
);
fs.writeFileSync(path.join(distDir, 'THIRD_PARTY_NOTICES.md'), notices + runtimeLicenses.join(''));
console.log('✓ Copied and validated extension manifest');

console.log('✓ Post-build steps completed');
