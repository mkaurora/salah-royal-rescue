/* Rewrites the PRECACHE list in sw.js (run after adding/removing files or clips: node tools/build-sw.js).
 * Precaches the app shell, audio/voice/manifest.json + groups.json, and the voice clips that exist on disk for the
 * 'common' group and the first PRECACHE_LEVELS levels of each subject. All other clips are cached at runtime. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.git', 'test', 'e2e', 'tools', 'docs']);
const SKIP_FILES = new Set(['package.json', 'package-lock.json', 'README.md', 'PROGRESS.md', 'PROMPT.md', '.gitignore', 'sw.js',
  'audio/voice/lines.json', 'run1.log']);
const SUBJECTS = ['math', 'english', 'science'];
const PRECACHE_LEVELS = 2;

function appFiles() {
  const out = [];
  (function walk(dir, rel) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
      const r = rel ? rel + '/' + d.name : d.name;
      if (d.isDirectory()) { if (!SKIP.has(d.name)) walk(path.join(dir, d.name), r); }
      else if (!SKIP_FILES.has(r) && !d.name.startsWith('.') && !/\.(log|md)$/.test(d.name) && !/^audio\/voice\/.*\.mp3$/.test(r)) out.push(r);
    });
  })(ROOT, '');
  return out.sort();
}

function precacheClips() {
  const gf = path.join(ROOT, 'audio/voice/groups.json');
  const groups = fs.existsSync(gf) ? JSON.parse(fs.readFileSync(gf, 'utf8')) : {};
  const names = ['common'];
  SUBJECTS.forEach((s) => { for (let i = 0; i < PRECACHE_LEVELS; i++) names.push(s + ':' + i); });
  const keys = new Set();
  names.forEach((n) => (groups[n] || []).forEach((k) => keys.add(k)));
  return [...keys].sort().map((k) => 'audio/voice/' + k + '.mp3').filter((f) => fs.existsSync(path.join(ROOT, f)));
}

function precacheList() {
  return ['./'].concat(appFiles().map((f) => './' + f), precacheClips().map((f) => './' + f));
}

/** FNV-1a over every app file's path + bytes: changes whenever anything shipped changes. */
function buildHash() {
  let h = 0x811c9dc5;
  const eat = (buf) => { for (let i = 0; i < buf.length; i++) { h ^= buf[i]; h = Math.imul(h, 0x01000193) >>> 0; } };
  appFiles().concat(precacheClips()).forEach((f) => { eat(Buffer.from(f + '\n')); eat(fs.readFileSync(path.join(ROOT, f))); });
  return ('0000000' + h.toString(16)).slice(-8);
}

function build() {
  const list = precacheList();
  const swPath = path.join(ROOT, 'sw.js');
  const src = fs.readFileSync(swPath, 'utf8').replace(/var BUILD = '[0-9a-f]{8}';/, "var BUILD = '" + buildHash() + "';");
  const next = src.replace(/\/\* PRECACHE:START \*\/[\s\S]*?\/\* PRECACHE:END \*\//,
    '/* PRECACHE:START */\n' + list.map((f) => "  '" + f + "'").join(',\n') + '\n  /* PRECACHE:END */');
  fs.writeFileSync(swPath, next);
  return list;
}

function currentList() {
  const src = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const m = /\/\* PRECACHE:START \*\/([\s\S]*?)\/\* PRECACHE:END \*\//.exec(src);
  return m ? (m[1].match(/'[^']+'/g) || []).map((s) => s.slice(1, -1)) : [];
}

function currentBuild() {
  const m = /var BUILD = '([0-9a-f]{8})';/.exec(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'));
  return m ? m[1] : null;
}

module.exports = { appFiles, precacheClips, precacheList, currentList, buildHash, currentBuild, SUBJECTS };
if (require.main === module) console.log('precache entries:', build().length, '(voice clips: ' + precacheClips().length + ')');
