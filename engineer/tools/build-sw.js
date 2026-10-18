/* Rewrites the PRECACHE list in sw.js (run after adding/removing files or clips: node tools/build-sw.js).
 * Precaches the app shell, audio/voice/manifest.json + groups.json, and the voice clips (that exist on disk)
 * for the menu / common lines and the first 3 levels of each world. All other clips are cached at runtime. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'test', 'e2e', 'tools', 'docs']);
const SKIP_FILES = new Set(['package.json', 'package-lock.json', 'README.md', 'SPEC.md', 'V2_PROGRESS.md', '.gitignore', 'sw.js',
  'audio/voice/lines.json']);
const WORLDS = ['bridges', 'machines', 'circuits', 'robot', 'construction'];
const PRECACHE_LEVELS = 3;

/** App shell files (voice clips are handled separately). */
function appFiles() {
  const out = [];
  (function walk(dir, rel) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
      const r = rel ? rel + '/' + d.name : d.name;
      if (d.isDirectory()) { if (!SKIP.has(d.name)) walk(path.join(dir, d.name), r); }
      else if (!SKIP_FILES.has(r) && !d.name.startsWith('.') && !/^audio\/voice\/.*\.mp3$/.test(r)) out.push(r);
    });
  })(ROOT, '');
  return out.sort();
}

/** Clips to precache: groups 'common' + '<world>:0..2', only those that exist on disk. */
function precacheClips() {
  const gf = path.join(ROOT, 'audio/voice/groups.json');
  const groups = fs.existsSync(gf) ? JSON.parse(fs.readFileSync(gf, 'utf8')) : {};
  const names = ['common'];
  WORLDS.forEach((w) => { for (let i = 0; i < PRECACHE_LEVELS; i++) names.push(w + ':' + i); });
  const keys = new Set();
  names.forEach((n) => (groups[n] || []).forEach((k) => keys.add(k)));
  return [...keys].sort().map((k) => 'audio/voice/' + k + '.mp3').filter((f) => fs.existsSync(path.join(ROOT, f)));
}

function precacheList() {
  return ['./'].concat(appFiles().map((f) => './' + f), precacheClips().map((f) => './' + f));
}

function build() {
  const list = precacheList();
  const swPath = path.join(ROOT, 'sw.js');
  const src = fs.readFileSync(swPath, 'utf8');
  const next = src.replace(/\/\* PRECACHE:START \*\/[\s\S]*?\/\* PRECACHE:END \*\//,
    '/* PRECACHE:START */\n' + list.map((f) => "  '" + f + "'").join(',\n') + '\n  /* PRECACHE:END */');
  fs.writeFileSync(swPath, next);
  return list;
}

module.exports = { appFiles, precacheClips, precacheList, WORLDS };
if (require.main === module) console.log('precache entries:', build().length, '(voice clips: ' + precacheClips().length + ')');
