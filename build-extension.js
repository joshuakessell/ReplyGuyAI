#!/usr/bin/env node

import { build } from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const distDir = 'dist/public';
const extensionDir = 'extension';

// Ensure dist/public directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

console.log('Building Chrome Extension...');

// Build background script
await build({
  entryPoints: [join(extensionDir, 'background/background.ts')],
  bundle: true,
  outfile: join(distDir, 'background.js'),
  format: 'esm',
  target: 'chrome96',
  platform: 'browser',
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  external: ['chrome'],
  sourcemap: true
}).catch(() => process.exit(1));

// Build content script
await build({
  entryPoints: [join(extensionDir, 'content/content-script.ts')],
  bundle: true,
  outfile: join(distDir, 'content-script.js'),
  format: 'iife',
  target: 'chrome96',
  platform: 'browser',
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  external: ['chrome'],
  sourcemap: true
}).catch(() => process.exit(1));

// Build popup script (if exists)
try {
  await build({
    entryPoints: [join(extensionDir, 'popup/popup.ts')],
    bundle: true,
    outfile: join(distDir, 'popup.js'),
    format: 'esm',
    target: 'chrome96',
    platform: 'browser',
    define: {
      'process.env.NODE_ENV': '"production"'
    },
    external: ['chrome'],
    sourcemap: true
  });
} catch (error) {
  console.log('Popup script not found, skipping...');
}

// Copy static files
try {
  copyFileSync(join(extensionDir, 'popup/popup.html'), join(distDir, 'popup.html'));
  console.log('Copied popup.html');
} catch (error) {
  console.log('popup.html not found, skipping...');
}

try {
  copyFileSync('manifest.json', join(distDir, 'manifest.json'));
  console.log('Copied manifest.json');
} catch (error) {
  console.log('manifest.json not found, skipping...');
}

console.log('Chrome Extension build complete!');
console.log(`Extension files are in: ${distDir}`);
console.log('Load the extension in Chrome by navigating to chrome://extensions/ and loading the unpacked extension from the dist/public folder.');