import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

// Move background script from src/background/index.js to root as background.js
const backgroundSourceFile = path.join(distDir, 'src', 'background', 'index.js');
const backgroundTargetFile = path.join(distDir, 'background.js');

if (fs.existsSync(backgroundSourceFile)) {
  fs.renameSync(backgroundSourceFile, backgroundTargetFile);
  console.log('✓ Moved background script to background.js');

  // Clean up empty directories
  try {
    fs.rmdirSync(path.join(distDir, 'src', 'background'));
  } catch (e) {
    // Ignore errors if directory is not empty
  }
}

// Update manifest.json to point to background.js at root
const manifestPath = path.join(distDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.background.service_worker = 'background.js';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✓ Updated manifest.json');
}

console.log('✓ Post-build steps completed');
