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
    'globalThis.Element ??= class {};',
    'globalThis.HTMLElement ??= class { focus() {} };',
    'globalThis.Event ??= class {};',
    'globalThis.UIEvent ??= class {};',
    'globalThis.FocusEvent ??= class {};',
    'globalThis.MouseEvent ??= class {};',
    'globalThis.TouchEvent ??= class {};',
    'globalThis.PointerEvent ??= class {};',
    'globalThis.KeyboardEvent ??= class {};',
    '',
    'const createMockElement = () => ({',
    '  appendChild: (c) => c,',
    '  insertBefore: (c, r) => c,',
    '  removeChild: (c) => c,',
    '  setAttribute: () => {},',
    '  removeAttribute: () => {},',
    '  style: {},',
    '  classList: {',
    '    add: () => {},',
    '    remove: () => {},',
    '  },',
    '  addEventListener: () => {},',
    '  removeEventListener: () => {},',
    '  dispatchEvent: () => {},',
    '});',
    '',
    'globalThis.document ??= {',
    '  querySelectorAll: () => [],',
    '  getElementById: () => null,',
    '  getElementsByTagName: () => [],',
    '  getElementsByClassName: () => [],',
    '  createElement: createMockElement,',
    '  createComment: () => ({}),',
    '  createTextNode: () => ({}),',
    '  head: createMockElement(),',
    '  body: createMockElement(),',
    '  documentElement: createMockElement(),',
    '  addEventListener: () => {},',
    '  removeEventListener: () => {},',
    '  dispatchEvent: () => {},',
    '};',
    'globalThis.window ??= {',
    '  addEventListener: () => {},',
    '  removeEventListener: () => {},',
    '  dispatchEvent: () => {},',
    '  getComputedStyle: () => ({',
    '    getPropertyValue: () => "",',
    '  }),',
    '  matchMedia: () => ({',
    '    matches: false,',
    '    addListener: () => {},',
    '    removeListener: () => {},',
    '    addEventListener: () => {},',
    '    removeEventListener: () => {},',
    '  }),',
    '  customElements: {',
    '    get: () => {},',
    '    define: () => {},',
    '  },',
    '  document: globalThis.document,',
    '  Element: globalThis.Element,',
    '  HTMLElement: globalThis.HTMLElement,',
    '  FocusEvent: globalThis.FocusEvent,',
    '  MouseEvent: globalThis.MouseEvent,',
    '  TouchEvent: globalThis.TouchEvent,',
    '  PointerEvent: globalThis.PointerEvent,',
    '  KeyboardEvent: globalThis.KeyboardEvent,',
    '  location: {',
    '    href: "",',
    '    pathname: "",',
    '    search: "",',
    '  },',
    '};',
    ''
  ].join('\n');
  
  content = polyfill + content;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully injected document/window polyfill into dist/_worker.js/index.js');
} catch (err) {
  console.error('Failed to inject polyfill:', err);
  process.exit(1);
}
