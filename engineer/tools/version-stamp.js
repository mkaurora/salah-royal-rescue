/* Version tracking shared by tools/build-sw.js (same file in every game: tools/, engineer/tools/, learn/tools/).
 *
 * ONE source of truth per game: the version file (version.js / js/version.js), e.g.
 *     self.GAME_VERSION = { version: '3.3', built: '20 Oct 2026' };
 * You only ever edit `version`. The build stamps `built` (today, box time) and copies both into sw.js
 * (VERSION / BUILT / CONTENT lines), so the Settings label, the "New version" banner and the service worker agree.
 *
 * Every build compares a hash of the shipped files (without the version file) with the CONTENT hash recorded in
 * sw.js by the previous build. If the game changed but `version` did not:
 *   default      -> loud warning (the build still runs: the label still shows a new date)
 *   --bump       -> bumps the minor number for you (3.3 -> 3.4) and writes it to the version file
 *   --strict     -> fails (exit 1), for a release check
 * Flags also come from env: VERSION_BUMP=1, VERSION_STRICT=1. */
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** '20 Oct 2026' in the box's local time zone (Africa/Casablanca). */
function today(d) { d = d || new Date(); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }

const VER_RE = /version:\s*'([^']*)'/;
const BUILT_RE = /built:\s*'([^']*)'/;
function readVersion(file) {
  const src = fs.readFileSync(file, 'utf8');
  const v = VER_RE.exec(src), b = BUILT_RE.exec(src);
  if (!v || !/^\d+\.\d+(\.\d+)?$/.test(v[1])) throw new Error(file + ": needs version: 'MAJOR.MINOR'");
  return { version: v[1], built: b ? b[1] : '' };
}
function writeVersion(file, ver) {
  const src = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, src.replace(VER_RE, "version: '" + ver.version + "'").replace(BUILT_RE, "built: '" + ver.built + "'"));
}
function bumpMinor(v) { const p = v.split('.').map(Number); p[1] = (p[1] || 0) + 1; return p[0] + '.' + p[1]; }
/** 'Version 3.3 (20 Oct 2026)' — the label shown in the game. */
function label(ver) { return 'Version ' + ver.version + (ver.built ? ' (' + ver.built + ')' : ''); }

// sw.js lines (var or const): VERSION = '3.3'  BUILT = '20 Oct 2026'  CONTENT = '<hash>'
function swGet(sw, key) { const m = new RegExp('\\b' + key + "\\s*=\\s*'([^']*)'").exec(sw); return m ? m[1] : null; }
function swSet(sw, key, val) {
  const re = new RegExp('(\\b' + key + "\\s*=\\s*')[^']*(')");
  if (!re.test(sw)) throw new Error('sw.js has no ' + key + " = '...' line");
  return sw.replace(re, '$1' + val + '$2');
}

/** sha256 over path + bytes of each file (relative to root). */
function hashFiles(root, files) {
  const h = crypto.createHash('sha256');
  files.forEach((rel) => { h.update(rel + '\0'); h.update(fs.readFileSync(path.join(root, rel))); h.update('\0'); });
  return h.digest('hex').slice(0, 10);
}

function flags(argv, env) {
  argv = argv || process.argv.slice(2); env = env || process.env;
  return { bump: argv.includes('--bump') || env.VERSION_BUMP === '1', strict: argv.includes('--strict') || env.VERSION_STRICT === '1' };
}

/**
 * Decide the version for this build and return sw.js source with VERSION / BUILT / CONTENT written.
 * o: { root, versionFile (relative), contentFiles (relative, WITHOUT the version file), sw (source), flags, now, log }
 */
function stamp(o) {
  const log = o.log || ((m) => console.warn(m));
  const f = o.flags || { bump: false, strict: false };
  const vfile = path.join(o.root, o.versionFile);
  const ver = readVersion(vfile);
  const content = hashFiles(o.root, o.contentFiles);
  const prevVersion = swGet(o.sw, 'VERSION'), prevContent = swGet(o.sw, 'CONTENT');
  const changed = content !== prevContent;
  let warned = false, bumped = false;
  if (changed && prevVersion && ver.version === prevVersion) {
    if (f.bump) { ver.version = bumpMinor(ver.version); bumped = true; log('version: game changed -> bumped to ' + ver.version + ' (' + o.versionFile + ')'); }
    else {
      const msg = '\n  !!! VERSION NOT BUMPED: the game changed since the last build but ' + o.versionFile + ' still says ' +
        ver.version + '.\n  !!! Edit it (e.g. ' + bumpMinor(ver.version) + ') or rerun with --bump before deploying.\n';
      if (f.strict) throw new Error(msg);
      log(msg); warned = true;
    }
  }
  if (changed || ver.version !== prevVersion || !ver.built) {
    ver.built = today(o.now);
    writeVersion(vfile, ver);
  }
  let sw = swSet(o.sw, 'VERSION', ver.version);
  sw = swSet(sw, 'BUILT', ver.built);
  sw = swSet(sw, 'CONTENT', content);
  return { sw, version: ver.version, built: ver.built, content, changed, warned, bumped, label: label(ver) };
}

module.exports = { stamp, readVersion, writeVersion, bumpMinor, label, today, swGet, swSet, hashFiles, flags };
