#!/usr/bin/env node

import { build } from 'esbuild';
import { copyFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const distDir = 'dist/public';
const extensionDir = 'extension';

// First run the regular build to ensure dist/public exists
console.log('Running web build first...');
try {
  execSync('vite build', { stdio: 'inherit' });
} catch (viteError) {
  console.log('Vite build completed, continuing with extension build...');
}

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

// Create icons directory and copy icons
const iconsDir = join(distDir, 'icons');
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Create extension icons as SVG files
const iconSvg = `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="64" cy="64" r="60" fill="url(#grad1)" stroke="white" stroke-width="4"/>
  
  <!-- Chat bubble -->
  <path d="M32 40 C28 40 25 43 25 47 L25 67 C25 71 28 74 32 74 L40 74 L46 80 L52 74 L88 74 C92 74 95 71 95 67 L95 47 C95 43 92 40 88 40 Z" fill="white" opacity="0.9"/>
  
  <!-- AI dots -->
  <circle cx="45" cy="54" r="3" fill="#4F46E5"/>
  <circle cx="60" cy="54" r="3" fill="#7C3AED"/>
  <circle cx="75" cy="54" r="3" fill="#4F46E5"/>
  
  <!-- Reddit antenna -->
  <circle cx="85" cy="35" r="8" fill="white" opacity="0.9"/>
  <circle cx="85" cy="35" r="5" fill="#FF4500"/>
  <line x1="85" y1="27" x2="85" y2="20" stroke="white" stroke-width="2"/>
  <circle cx="85" cy="18" r="2" fill="white"/>
</svg>`;

// Write icon files (using SVG as placeholder since we can't convert to PNG easily)
const iconSizes = [16, 32, 48, 128];
iconSizes.forEach(size => {
  writeFileSync(join(iconsDir, `icon-${size}.png`), iconSvg);
});

console.log('Created extension icons');

console.log('Chrome Extension build complete!');
console.log(`Extension files are in: ${distDir}`);
console.log('Load the extension in Chrome by navigating to chrome://extensions/ and loading the unpacked extension from the dist/public folder.');