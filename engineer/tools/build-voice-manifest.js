/* Scans audio/voice/*.mp3 and writes audio/voice/manifest.json (sorted array of clip keys).
 * Also reports lines.json ids that have no clip yet, and clips that no line uses (orphans).
 * Usage: node tools/build-voice-manifest.js   (run after adding clips, then node tools/build-sw.js) */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'audio', 'voice');

function clipKeys() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter((f) => /^[0-9a-f]{8}\.mp3$/.test(f)).map((f) => f.slice(0, 8)).sort();
}

function readLines() {
  const f = path.join(DIR, 'lines.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
}

function build() {
  fs.mkdirSync(DIR, { recursive: true });
  const keys = clipKeys();
  fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(keys) + '\n');
  const lines = readLines();
  const have = new Set(keys);
  const used = new Set(lines.map((l) => l.id));
  const missing = lines.filter((l) => !have.has(l.id));
  const orphans = keys.filter((k) => !used.has(k));
  return { keys, lines, missing, orphans };
}

module.exports = { build, clipKeys };

if (require.main === module) {
  const r = build();
  console.log(`manifest.json: ${r.keys.length} clip(s); lines.json: ${r.lines.length} line(s)`);
  console.log(`missing clips: ${r.missing.length}`);
  r.missing.slice(0, 40).forEach((l) => console.log(`  - ${l.id}  ${l.text}`));
  if (r.missing.length > 40) console.log(`  … and ${r.missing.length - 40} more`);
  console.log(`orphaned clips: ${r.orphans.length}`);
  r.orphans.forEach((k) => console.log(`  - ${k}.mp3`));
}
