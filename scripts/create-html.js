#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root        = path.join(__dirname, '..');
const uiJsPath    = path.join(root, 'build', 'ui.js');
const uiHtmlPath  = path.join(root, 'build', 'ui.html');
const manifestPath = path.join(root, 'manifest.json');
const cssPath     = path.join(root, 'src', 'styles.css');

// 1 ── Read artifacts ─────────────────────────────────────────────────────────
if (!fs.existsSync(uiJsPath)) {
  console.error('ERROR: build/ui.js not found. Run the build first.');
  process.exit(1);
}
const uiJs = fs.readFileSync(uiJsPath, 'utf8');

// Read original CSS (bypasses create-figma-plugin v4 CSS-modules mangling)
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

// 2 ── Create self-contained HTML ──────────────────────────────────────────────
//   • <style> inlines the original, unmangled CSS
//   • <script> inlines the JS bundle
//   • <div id="create-figma-plugin"> is the root node expected by the bundle
const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${css}</style>
</head>
<body>
<div id="create-figma-plugin"></div>
<script>
// Globals expected by create-figma-plugin UI bundle
window.__FIGMA_COMMAND__ = '';
window.__SHOW_UI_DATA__ = null;
</script>
<script>${uiJs}</script>
</body>
</html>
`;

fs.writeFileSync(uiHtmlPath, html, 'utf8');
console.log('✓ build/ui.html created (original CSS inlined, JS bundle inlined)');

// 3 ── Patch manifest.json ─────────────────────────────────────────────────────
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.ui = 'build/ui.html';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('✓ manifest.json → "ui": "build/ui.html"');
}
