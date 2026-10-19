/* One real "Ask Helper" session against the ElevenLabs agent, headless (dev check, needs internet):
 *   node tools/helper-smoke.js [question.wav]
 * Chromium gets a fake microphone (optionally fed a WAV file: a spoken question), the page serves the game at
 * 127.0.0.1 (allowlisted for the public agent), loads the vendored SDK and starts a WebRTC session with the
 * same agent id + dynamic variables the game sends for Machines level 10. Prints status/mode changes and the
 * transcript (user + agent messages). No API key is used anywhere. */
'use strict';
const path = require('path');
const pw = require('playwright');
const { start } = require('../e2e/server.js');
const HT = require('../js/core/helper-talk.js');

(async () => {
  const wav = process.argv[2];
  const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
  if (wav) args.push('--use-file-for-fake-audio-capture=' + path.resolve(wav));
  const browser = await pw.chromium.launch({ args });
  const { server, url } = await start(0);
  const context = await browser.newContext({ permissions: ['microphone'] });
  const page = await context.newPage();
  page.on('console', (m) => { if (/error|warn/i.test(m.type())) console.log('  [console.' + m.type() + ']', m.text().slice(0, 200)); });
  await page.goto(url + '?menu=1&nosw=1');
  await page.waitForSelector('.menu-screen');
  const level = require('../js/data/machines-levels.js').levels[9];
  const vars = HT.buildVars({ world: 'machines', level });
  console.log('agent:', HT.HELPER_AGENT_ID);
  console.log('dynamic variables:', JSON.stringify(vars));
  const result = await page.evaluate(async ({ vars, waitMs }) => {
    const log = [];
    const t0 = Date.now();
    const note = (k, v) => log.push(((Date.now() - t0) / 1000).toFixed(1) + 's ' + k + ' ' + (typeof v === 'string' ? v : JSON.stringify(v)));
    const SDK = await LE.helperTalk.loadClient();
    let convo;
    try {
      convo = await SDK.Conversation.startSession({
        agentId: LE.HELPER_AGENT_ID, connectionType: 'webrtc', dynamicVariables: vars,
        libsampleratePath: 'js/vendor/libsamplerate.worklet.js',
        onConnect: (c) => note('connect', c),
        onStatusChange: (s) => note('status', s),
        onModeChange: (m) => note('mode', m),
        onMessage: (m) => note('message', m),
        onError: (e) => note('error', String(e)),
        onDisconnect: (d) => note('disconnect', d)
      });
    } catch (e) { note('startSession threw', String(e && e.message || e)); return log; }
    await new Promise((r) => setTimeout(r, waitMs));
    await convo.endSession();
    await new Promise((r) => setTimeout(r, 800));
    return log;
  }, { vars, waitMs: Number(process.env.WAIT_MS || 30000) });
  result.forEach((l) => console.log('  ' + l));
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
