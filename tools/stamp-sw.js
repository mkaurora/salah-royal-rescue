// Stamps sw.js with a hash of the shipped files so every deploy is a new service-worker version (run before deploying).
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),FILES=['index.html','manifest.json'];
function buildHash(){let h=0x811c9dc5;for(const f of FILES){const b=fs.readFileSync(path.join(ROOT,f));for(let i=0;i<b.length;i++){h^=b[i];h=Math.imul(h,0x01000193)>>>0}}return ('0000000'+h.toString(16)).slice(-8)}
function currentBuild(){const m=/const BUILD='([0-9a-f]{8})';/.exec(fs.readFileSync(path.join(ROOT,'sw.js'),'utf8'));return m?m[1]:null}
function stamp(){const p=path.join(ROOT,'sw.js');fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/const BUILD='[0-9a-f]{8}';/,`const BUILD='${buildHash()}';`));return buildHash()}
module.exports={buildHash,currentBuild,stamp};
if(require.main===module)console.log('sw.js BUILD',stamp());
