#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../dist/_worker.js/index.js');

if (!fs.existsSync(filePath)) {
  console.error(`Error: Entry file not found at ${filePath}`);
  process.exit(1);
}

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('globalThis.document ??=')) {
    console.log('document/window polyfill already exists in entry file.');
    process.exit(0);
  }
  
  const polyfill = [
    '// POLYFILL: Mock document and window globals for server-side Emotion rendering',
    'globalThis.document ??= {',
    '  querySelectorAll: () => [],',
    '  head: {',
    '    appendChild: () => {}',
    '  }',
    '};',
    'globalThis.window ??= {};',
    ''
  ].join('\n');
  
  content = polyfill + content;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully injected document/window polyfill into dist/_worker.js/index.js');
} catch (err) {
  console.error('Failed to inject polyfill:', err);
  process.exit(1);
}
