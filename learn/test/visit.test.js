// "Opened" beacon: only game/version/random id/type, fire-and-forget, throttled, silent offline, never on local copies.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const check = require('./visit-core.js');
test('opened beacon (learning-quest)', () => {
  check(assert, fs.readFileSync(path.join(__dirname, '..', 'js/core/visit.js'), 'utf8'), 'learning-quest');
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'), /<script src="js\/version\.js"><\/script>\s*<script src="js\/core\/visit\.js"><\/script>/);
});
