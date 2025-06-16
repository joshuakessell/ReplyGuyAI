#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('🔨 Building ReplyGuy.AI Extension...\n');

try {
  // Step 1: Build web application
  console.log('📦 Building web application...');
  execSync('npx vite build', { stdio: 'inherit' });
  
  // Step 2: Build server
  console.log('🖥️  Building server...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  
  // Step 3: Build Chrome extension
  console.log('🧩 Building Chrome extension...');
  execSync('node build-extension.js', { stdio: 'inherit' });
  
  console.log('\n✅ Build complete!');
  console.log('📁 Chrome extension files are in: dist/public/');
  console.log('🚀 Load the extension in Chrome from the dist/public folder');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}