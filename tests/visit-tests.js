// "Opened" beacon in ../index.html (<script id="visit">). Run: node tests/visit-tests.js
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const check = require('../learn/test/visit-core.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = /<script id="visit">([\s\S]*?)<\/script>/.exec(html);
assert.ok(m, 'beacon block present');
check(assert, m[1], 'royal-rescue');
console.log('visit beacon: all checks passed');
