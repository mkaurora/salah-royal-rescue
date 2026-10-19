/* End-to-end checks for "Update game" + the new-version banner (Chromium, iPhone 13 + iPhone SE emulation).
 * The test server can pretend a new version was deployed (changed sw.js BUILD + a marker in index.html).
 * Run: NODE_PATH=/workspace/salah-learn/node_modules node tests/e2e-update.js   Screenshots → /workspace/update-button-shots/ */
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),pw=require('playwright');
const ROOT=path.resolve(__dirname,'..'),BASE='/salah-royal-rescue/';
const SHOTS=process.env.UPDATE_SHOTS||'/workspace/update-button-shots';fs.mkdirSync(SHOTS,{recursive:true});
const TYPES={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.png':'image/png','.m4a':'audio/mp4'};
let testBuild=0;
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(!u.startsWith(BASE)){r.writeHead(404);return r.end()}
  let rel=u.slice(BASE.length)||'index.html';if(rel.endsWith('/'))rel+='index.html';const f=path.normalize(path.join(ROOT,rel));
  if(!f.startsWith(ROOT)){r.writeHead(403);return r.end()}
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end()}
    if(testBuild&&rel==='sw.js')d=Buffer.from(String(d).replace(/const BUILD='[^']*';/,`const BUILD='test${testBuild}';`));
    if(testBuild&&rel==='index.html')d=Buffer.from(String(d).replace('<head>',`<head><meta name="test-build" content="${testBuild}">`));
    r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream','Cache-Control':'max-age=600'});r.end(d)})}); // like GitHub Pages
let fails=0;const ok=n=>console.log('  ✔ '+n),bad=(n,e)=>{fails++;console.log('  ✘ '+n+': '+String(e&&e.message||e).split('\n')[0])};
async function check(n,fn){try{await fn();ok(n)}catch(e){bad(n,e)}}
const assert=(c,m)=>{if(!c)throw new Error(m||'assertion failed')};
const DEVICES=[{name:'iPhone 13',tag:''},{name:'iPhone SE (3rd gen)',tag:'-se'}];
const SEED={v:2,done:{0:3,1:3,2:2,3:1},best:{0:900},endless:{lv:1,best:0},sound:true,music:true,lastCity:null,tut:{},cur:null,mig:0};

(async()=>{
  await new Promise(r=>srv.listen(0,r));const URL0=`http://127.0.0.1:${srv.address().port}${BASE}`;
  const browser=await pw.chromium.launch();
  for(const D of DEVICES){console.log(D.name);testBuild=0;
    const ctx=await browser.newContext({...pw.devices[D.name],serviceWorkers:'allow'});
    await ctx.addInitScript(s=>{if(!localStorage.getItem('salahSave2'))localStorage.setItem('salahSave2',s)},JSON.stringify(SEED));
    const page=await ctx.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(m.text()))page.errors.push(m.text())});
    const build=()=>page.evaluate(()=>{const m=document.querySelector('meta[name=test-build]');return m?m.content:'0'});
    const swBuild=()=>page.evaluate(()=>new Promise(res=>{const ch=new MessageChannel();ch.port1.onmessage=e=>res(e.data);navigator.serviceWorker.controller.postMessage({type:'VERSION'},[ch.port2])}));
    const progress=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('salahSave2')).done);
    const progressKept=async()=>{const d=await progress();assert(d[0]===3&&d[1]===3&&d[2]===2&&d[3]===1,'progress '+JSON.stringify(d))};
    const ready=()=>page.waitForFunction(()=>!!document.querySelector('.scr.on'));
    const openHow=async()=>{await ready();await page.evaluate(()=>{if(!$('title').classList.contains('on'))openTitle()});await page.waitForSelector('#tHow');await page.tap('#tHow');await page.waitForSelector('#updBtn')};
    await check('SW registered (updateViaCache none, cache salah-v7) and controls the page',async()=>{
      await page.goto(URL0);await page.waitForSelector('#tPlay');await page.evaluate(()=>navigator.serviceWorker.ready);
      await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
      assert((await page.evaluate(async()=>(await navigator.serviceWorker.getRegistration()).updateViaCache))==='none');
      const v=await swBuild();assert(v.cache==='salah-v7',JSON.stringify(v));await progressKept()});
    await check('Update game (How to play): "You have the latest version" when nothing is new',async()=>{
      await openHow();await page.click('#updBtn');await page.waitForFunction(()=>/latest version/.test(document.getElementById('updMsg').textContent));
      assert(/لديك أحدث نسخة/.test(await page.textContent('#updMsg')));
      await page.evaluate(()=>document.getElementById('updRow').scrollIntoView({block:'center'}));await page.waitForTimeout(300);
      await page.screenshot({path:`${SHOTS}/rr-update-button${D.tag}.png`});await page.click('#howOk')});
    await check('new sw.js on the server → found on visibilitychange; no banner and no reload during a level',async()=>{
      testBuild=1;await page.evaluate(()=>{closeOv();start(4)});await page.waitForSelector('#game.on');
      await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
      await page.waitForFunction(()=>updater.hasUpdate(),null,{timeout:30000});await page.waitForTimeout(1500);
      assert(!(await page.locator('#updBanner').count()),'banner shown mid-level');assert((await build())==='0','reloaded mid-level');
      await page.evaluate(()=>openMap());await page.waitForSelector('#updBanner',{timeout:5000});
      const t=await page.textContent('#updBanner');assert(/New version! Tap to update/.test(t)&&/نسخة جديدة/.test(t),t);
      await page.waitForTimeout(700);await page.screenshot({path:`${SHOTS}/rr-banner${D.tag}.png`})});
    await check('tapping the banner reloads into the new version; progress kept',async()=>{
      await Promise.all([page.waitForEvent('load',{timeout:20000}),page.click('#updBanner')]);await ready();
      assert((await build())==='1','build '+(await build()));await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
      assert((await swBuild()).build==='test1');await progressKept();assert(!(await page.locator('#updBanner').count()))});
    await check('Update game button picks up the next version itself and reloads',async()=>{
      testBuild=2;await openHow();await Promise.all([page.waitForEvent('load',{timeout:30000}),page.click('#updBtn')]);await ready();
      assert((await build())==='2');assert((await swBuild()).build==='test2');await progressKept()});
    await check('offline: the game still opens and plays; Update says you are offline',async()=>{
      await ctx.setOffline(true);await page.reload();await ready();await progressKept();
      await openHow();await page.click('#updBtn');await page.waitForFunction(()=>/offline, try again later/.test(document.getElementById('updMsg').textContent));
      await page.evaluate(()=>document.getElementById('updRow').scrollIntoView({block:'center'}));await page.waitForTimeout(300);
      await page.screenshot({path:`${SHOTS}/rr-offline${D.tag}.png`});await page.click('#howOk');
      await page.evaluate(()=>{save.cur=null;persist()});await page.tap('#tPlay');await page.waitForSelector('#map.on');await page.evaluate(()=>document.querySelector('.node[data-i="0"]').click());await page.waitForSelector('#game.on');
      await ctx.setOffline(false)});
    await check('no JS errors',async()=>{assert(!page.errors.length,page.errors.join(' | '))});
    await ctx.close()}
  await browser.close();srv.close();console.log(fails?`\n${fails} FAILED`:'\nall update e2e checks passed');process.exit(fails?1:0)})();
