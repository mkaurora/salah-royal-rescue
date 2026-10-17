/* Rewrites the PRECACHE list in sw.js with every app file (run after adding/removing files: node tools/build-sw.js). */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'test', 'e2e', 'tools', 'docs']);
const SKIP_FILES = new Set(['package.json', 'package-lock.json', 'README.md', 'SPEC.md', '.gitignore', 'sw.js']);

function appFiles() {
  const out = [];
  (function walk(dir, rel) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
      const r = rel ? rel + '/' + d.name : d.name;
      if (d.isDirectory()) { if (!SKIP.has(d.name)) walk(path.join(dir, d.name), r); }
      else if (!SKIP_FILES.has(r) && !d.name.startsWith('.')) out.push(r);
    });
  })(ROOT, '');
  return out.sort();
}

function build() {
  const list = ['./'].concat(appFiles().map((f) => './' + f));
  const swPath = path.join(ROOT, 'sw.js');
  const src = fs.readFileSync(swPath, 'utf8');
  const next = src.replace(/\/\* PRECACHE:START \*\/[\s\S]*?\/\* PRECACHE:END \*\//,
    '/* PRECACHE:START */\n' + list.map((f) => "  '" + f + "'").join(',\n') + '\n  /* PRECACHE:END */');
  fs.writeFileSync(swPath, next);
  return list;
}

module.exports = { appFiles };
if (require.main === module) console.log('precache entries:', build().length);
