/* End-to-end checks for parent mode (Chromium, iPhone 13 + iPhone SE emulation).
 * Run: NODE_PATH=/workspace/salah-learn/node_modules node tests/e2e-admin.js
 * Screenshots → $SHOTS_DIR or /workspace/royal-rescue-v6-shots/ */
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),pw=require('playwright');
const ROOT=path.resolve(__dirname,'..'),BASE='/salah-royal-rescue/';
const SHOTS=process.env.SHOTS_DIR||'/workspace/royal-rescue-v6-shots';fs.mkdirSync(SHOTS,{recursive:true});
const TYPES={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.png':'image/png','.m4a':'audio/mp4'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(!u.startsWith(BASE)){r.writeHead(404);return r.end()}
  let rel=u.slice(BASE.length)||'index.html';if(rel.endsWith('/'))rel+='index.html';const f=path.normalize(path.join(ROOT,rel));
  if(!f.startsWith(ROOT)){r.writeHead(403);return r.end()}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});r.end(d)})});
let fails=0;const ok=n=>console.log('  ✔ '+n),bad=(n,e)=>{fails++;console.log('  ✘ '+n+': '+String(e&&e.message||e).split('\n')[0])};
async function check(n,fn){try{await fn();ok(n)}catch(e){bad(n,e)}}
const assert=(c,m)=>{if(!c)throw new Error(m||'assertion failed')};
const DEVICES=[{name:'iPhone 13',tag:''},{name:'iPhone SE (3rd gen)',tag:'-se'}];
let URL0;
async function newPage(browser,device,seed){const ctx=await browser.newContext({...pw.devices[device],serviceWorkers:'block'});
  if(seed)await ctx.addInitScript(s=>{if(!localStorage.getItem('salahSave2'))localStorage.setItem('salahSave2',s)},JSON.stringify(seed));
  const page=await ctx.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))page.errors.push(m.text())});
  await page.goto(URL0);await page.waitForSelector('#tPlay');return {ctx,page}}
// real touch hold through CDP (touchStart … wait … touchEnd)
async function hold(page,sel,ms){const b=await page.locator(sel).boundingBox();const cdp=await page.context().newCDPSession(page);
  const pt=[{x:b.x+b.width/2,y:b.y+b.height/2}];await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pt});
  await page.waitForTimeout(ms);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300)}
const visible=(page,sel)=>page.locator(sel).isVisible();
async function pin(page,digits){for(const d of digits)await page.click(`#pinPad [data-k="${d}"]`)}
const getSave=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('salahSave2')));
async function toMap(page){await page.click('#tPlay');await page.waitForSelector('#map.on');await page.waitForTimeout(400)}
async function openAdmin(page,p){await hold(page,'#mHow',3200);await page.waitForSelector('#pinPanel');await pin(page,p||'1994');await page.waitForSelector('#admScroll')}

(async()=>{
  await new Promise(r=>srv.listen(0,r));URL0=`http://127.0.0.1:${srv.address().port}${BASE}`;
  const browser=await pw.chromium.launch();
  for(const D of DEVICES){console.log(D.name);
    const {ctx,page}=await newPage(browser,D.name);let code='';
    await check('short tap on ? still opens How to play (no PIN)',async()=>{await toMap(page);await page.tap('#mHow');await page.waitForSelector('#howOk');assert(!(await visible(page,'#pinPanel')));await page.click('#howOk')});
    await check('a 1 s hold does not open the PIN',async()=>{await hold(page,'#mHow',1000);assert(!(await visible(page,'#pinPanel')));if(await visible(page,'#howOk'))await page.click('#howOk')});
    await check('3 s hold on ? opens the PIN pad (and not How to play)',async()=>{await hold(page,'#mHow',3200);await page.waitForSelector('#pinPanel');assert(!(await visible(page,'#howOk')),'How opened too');
      await page.waitForTimeout(400);await page.screenshot({path:`${SHOTS}/1-pin${D.tag}.png`})});
    await check('wrong PIN (and the old 1234) is refused, 1994 opens parent mode',async()=>{await pin(page,'0000');await page.waitForTimeout(250);assert(/Wrong PIN/.test(await page.textContent('#pinMsg')));assert(!(await visible(page,'#admScroll')));
      await pin(page,'1234');await page.waitForTimeout(250);assert(!(await visible(page,'#admScroll')),'1234 should no longer work');await pin(page,'1994');await page.waitForSelector('#admScroll');await page.waitForTimeout(400);await page.screenshot({path:`${SHOTS}/2-admin${D.tag}.png`})});
    await check('jump to level 26 (levels 1–25 done)',async()=>{for(let i=0;i<25;i++)await page.click('#admPlus');assert((await page.textContent('#admN'))==='26');
      await page.click('#admUnlock');const s=await getSave(page);assert(Object.keys(s.done).length===25&&!s.done[25],'done='+JSON.stringify(s.done));
      assert(/level 26/.test(await page.textContent('#admMsg')));await page.click('#admClose');await page.waitForTimeout(600);
      assert(await page.evaluate(()=>{const n=document.querySelector('.node.cur');return n&&n.dataset.i==='25'}),'current node is not 26');
      assert(await page.evaluate(()=>document.getElementById('endNode').classList.contains('lock')),'endless should still be locked');
      await page.screenshot({path:`${SHOTS}/3-map-level26${D.tag}.png`})});
    await check('unlock Endless ∞ directly',async()=>{await openAdmin(page);await page.click('#admEndless');const s=await getSave(page);assert(s.eOpen===1);
      await page.click('#admClose');await page.waitForTimeout(500);
      assert(await page.evaluate(()=>{const e=document.getElementById('endNode');return !e.classList.contains('lock')&&e.textContent.includes('∞')}));
      await page.evaluate(()=>{const e=document.getElementById('endNode');document.getElementById('mapScroll').scrollTop=e.offsetTop-innerHeight*.5});await page.waitForTimeout(500);
      await page.screenshot({path:`${SHOTS}/4-endless-unlocked${D.tag}.png`})});
    await check('set stars on a level',async()=>{await openAdmin(page);await page.click('[data-st="4:1"]');assert((await getSave(page)).done[4]===1);await page.click('[data-st="4:3"]');assert((await getSave(page)).done[4]===3)});
    await check('make a transfer code',async()=>{await page.click('#admMake');code=(await page.textContent('#admCode')).trim();assert(/^RR-[0-9A-Z]{13}-/.test(code),code);
      await page.evaluate(()=>document.getElementById('admCode').scrollIntoView({block:'center'}));await page.waitForTimeout(200);await page.screenshot({path:`${SHOTS}/5-transfer-code${D.tag}.png`});await page.click('#admClose')});
    // second "phone": already has a little progress of its own that must survive
    const seed={v:2,done:{0:3,1:3,2:2},best:{0:900},endless:{lv:1,best:0},sound:true,music:true,lastCity:null,tut:{},cur:null,mig:0};
    const B=await newPage(browser,D.name,seed);
    await check('existing salahSave2 progress is kept on load (not wiped)',async()=>{const s=await getSave(B.page);assert(s.done[0]===3&&s.done[1]===3&&s.done[2]===2&&s.best[0]===900,JSON.stringify(s))});
    await check('typo code is refused',async()=>{await toMap(B.page);await openAdmin(B.page);await B.page.fill('#admCodeIn',code.slice(0,-1)+(code.endsWith('0')?'1':'0'));await B.page.click('#admLoad');
      assert(/typo|not a Royal/.test(await B.page.textContent('#admMsg')));assert(Object.keys((await getSave(B.page)).done).length===3)});
    await check('transfer code round-trips to the second phone',async()=>{await B.page.fill('#admCodeIn',code.toLowerCase());await B.page.click('#admLoad');await B.page.waitForSelector('#admLoadYes');
      await B.page.click('#admLoadYes');const a=await getSave(page),b=await getSave(B.page);
      assert(JSON.stringify(a.done)===JSON.stringify(Object.assign({},b.done,{2:Math.max(2,a.done[2])})),'A='+JSON.stringify(a.done)+' B='+JSON.stringify(b.done));
      assert(b.eOpen===1&&b.done[2]===3&&b.best[0]===900);await B.page.click('#admClose');await B.page.waitForTimeout(500);
      assert(await B.page.evaluate(()=>!document.getElementById('endNode').classList.contains('lock')&&document.querySelector('.node.cur').dataset.i==='25'))});
    await check('forgot PIN → math gate → new PIN works, old one does not',async()=>{await hold(B.page,'#mHow',3200);await B.page.click('#pinForgot');const q=await B.page.textContent('#gateQ');
      await B.page.fill('#gateIn','1');await B.page.click('#gateOk');assert(/Not quite/.test(await B.page.textContent('#pinMsg')));
      const m=/(\d+) × (\d+)/.exec(await B.page.textContent('#gateQ'));await B.page.fill('#gateIn',String(m[1]*m[2]));await B.page.click('#gateOk');await B.page.waitForSelector('#admScroll');
      await B.page.fill('#admPin','2468');await B.page.click('#admPinSave');await B.page.click('#admClose');
      await hold(B.page,'#mHow',3200);await pin(B.page,'1994');await B.page.waitForTimeout(250);assert(!(await visible(B.page,'#admScroll')));await pin(B.page,'2468');await B.page.waitForSelector('#admScroll')});
    await check('reset needs a confirm and then clears progress',async()=>{await B.page.click('#admReset');assert(Object.keys((await getSave(B.page)).done).length>0);await B.page.click('#admResetYes');
      const s=await getSave(B.page);assert(Object.keys(s.done).length===0&&!s.eOpen&&s.sound===true);await B.page.click('#admClose')});
    await check('normal play unaffected: level 1 opens and a game starts',async()=>{await B.page.evaluate(()=>document.querySelector('.node[data-i="0"]').click());await B.page.waitForSelector('#game.on');
      await B.page.waitForTimeout(800);assert(await B.page.evaluate(()=>!!window.g||document.getElementById('board').width>0))});
    await check('level 26 opens from the map after the jump',async()=>{await page.evaluate(()=>document.querySelector('.node[data-i="25"]').click());await page.waitForSelector('#game.on');await page.waitForTimeout(600);
      assert(/26/.test(await page.textContent('#levelTag')),await page.textContent('#levelTag'))});
    await check('no JS errors',async()=>{assert(!page.errors.length&&!B.page.errors.length,[...page.errors,...B.page.errors].join(' | '))});
    await ctx.close();await B.ctx.close()}
  await browser.close();srv.close();console.log(fails?`\n${fails} FAILED`:'\nall e2e checks passed');process.exit(fails?1:0)})();
