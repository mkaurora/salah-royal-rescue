// Stamps sw.js with a hash of the shipped files so every deploy is a new service-worker version (run before deploying).
// Also stamps the game version from version.js (VERSION / BUILT / CONTENT, see tools/version-stamp.js): warns when the
// game changed but the version was not bumped; `--bump` bumps it for you, `--strict` fails instead of warning.
'use strict';
const fs=require('fs'),path=require('path');
const VS=require('./version-stamp.js');
const ROOT=path.resolve(__dirname,'..'),VERSION_FILE='version.js',CONTENT_FILES=['index.html','manifest.json'],FILES=CONTENT_FILES.concat(VERSION_FILE);
function buildHash(){let h=0x811c9dc5;for(const f of FILES){const b=fs.readFileSync(path.join(ROOT,f));for(let i=0;i<b.length;i++){h^=b[i];h=Math.imul(h,0x01000193)>>>0}}return ('0000000'+h.toString(16)).slice(-8)}
function currentBuild(){const m=/const BUILD='([0-9a-f]{8})';/.exec(fs.readFileSync(path.join(ROOT,'sw.js'),'utf8'));return m?m[1]:null}
function contentStamp(){return VS.hashFiles(ROOT,CONTENT_FILES)}
function stamp(opts){opts=opts||{};const p=path.join(ROOT,'sw.js');
  const ver=VS.stamp({root:ROOT,versionFile:VERSION_FILE,contentFiles:CONTENT_FILES,sw:fs.readFileSync(p,'utf8'),flags:opts.flags||VS.flags(),now:opts.now,log:opts.log});
  stamp.version=ver;const h=buildHash();
  fs.writeFileSync(p,ver.sw.replace(/const BUILD='[0-9a-f]{8}';/,`const BUILD='${h}';`));return h}
module.exports={buildHash,currentBuild,contentStamp,stamp,VERSION_FILE};
if(require.main===module){try{console.log('sw.js BUILD',stamp(),'·',stamp.version.label)}catch(e){console.error(e.message);process.exit(1)}}
