// Unit tests for the update module (<script id="update"> in ../index.html) and ../sw.js. Run: node tests/update-tests.js
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ROOT=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const m=html.match(/<script id="update">([\s\S]*?)<\/script>/);if(!m)throw new Error('update script block not found');
const box={module:{exports:{}}};box.self=box;vm.runInNewContext(m[1],box);
const {createUpdater,TEXT}=box.module.exports.createUpdater?box.module.exports:box.GameUpdate;
const STAMP=require('../tools/stamp-sw.js');
let pass=0,fail=0;const fails=[],queue=[];
const test=(n,fn)=>queue.push([n,fn]);
const eq=(a,b,msg)=>assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),msg),ok=assert.ok;

function ev(){const l={};return {on:(k,f)=>(l[k]=l[k]||[]).push(f),fire:(k,e)=>(l[k]||[]).forEach(f=>f(e||{}))}}
function worker(state){const e=ev();const w={state,msgs:[],addEventListener:e.on,postMessage:x=>w.msgs.push(x),go(s){w.state=s;e.fire('statechange')}};return w}
function fakeEnv(o){o=o||{};const swe=ev(),rege=ev();
  const reg={waiting:null,installing:null,updates:0,addEventListener:rege.on,
    update(){reg.updates++;if(env.nav.onLine===false||o.fail)return Promise.reject(new Error('offline'));if(o.next){const w=o.next();o.next=null;reg.installing=w;rege.fire('updatefound')}return Promise.resolve()}};
  const env={reg,reloads:0,banners:0,regOpts:null,nav:{onLine:true,serviceWorker:{controller:o.noController?null:{},addEventListener:swe.on,register(u,x){env.regOpts=x;return Promise.resolve(reg)}}},cc:()=>swe.fire('controllerchange')};
  env.up=createUpdater({navigator:env.nav,reload:()=>env.reloads++,onUpdate:()=>env.banners++,timeout:50,setTimeout:(f,ms)=>setTimeout(f,Math.min(ms,60))});return env}
const tick=()=>new Promise(r=>setTimeout(r,0));

test('registers with updateViaCache none',async()=>{const e=fakeEnv();await e.up.register('sw.js');eq(e.regOpts,{updateViaCache:'none'})});
test('button: latest / offline, bilingual texts, never reloads',async()=>{const e=fakeEnv();await e.up.register('sw.js');eq(await e.up.check(),'latest');
  e.nav.onLine=false;eq(await e.up.check(),'offline');const f=fakeEnv({fail:true});await f.up.register('sw.js');eq(await f.up.check(),'offline');eq(e.reloads+f.reloads,0);
  eq(TEXT.latest,'You have the latest version');eq(TEXT.offline,"You're offline, try again later");eq(TEXT.banner,'New version! Tap to update');ok(TEXT.bannerAr&&TEXT.latestAr&&TEXT.offlineAr&&TEXT.updatingAr)});
test('button: new version → install, SKIP_WAITING, reload once on controllerchange',async()=>{const w=worker('installing');const e=fakeEnv({next:()=>w});await e.up.register('sw.js');
  const p=e.up.check();await tick();w.go('installed');e.reg.waiting=w;eq(await p,'updating');eq(w.msgs,[{type:'SKIP_WAITING'}]);eq(e.reloads,0);e.cc();e.cc();eq(e.reloads,1)});
test('background poll → banner only; controllerchange without a tap never reloads',async()=>{const w=worker('installing');const e=fakeEnv({next:()=>w});await e.up.register('sw.js');
  ok(await e.up.poll());w.go('installed');eq(e.banners,1);e.cc();eq(e.reloads,0);e.up.apply();eq(w.msgs,[{type:'SKIP_WAITING'}]);e.cc();eq(e.reloads,1)});
test('first install shows no banner; waiting-at-load shows it; offline poll is quiet; failed install = latest',async()=>{
  const w=worker('installing');const a=fakeEnv({next:()=>w,noController:true});await a.up.register('sw.js');await a.up.poll();w.go('installed');eq(a.banners,0);
  const b=fakeEnv();b.reg.waiting=worker('installed');await b.up.register('sw.js');eq(b.banners,1);
  const c=fakeEnv();await c.up.register('sw.js');c.nav.onLine=false;eq(await c.up.poll(),false);eq(c.reg.updates,0);
  const w2=worker('installing');const d=fakeEnv({next:()=>w2});await d.up.register('sw.js');const p=d.up.check();await tick();w2.go('redundant');eq(await p,'latest');eq(d.reloads,0)});

function loadSW(existing,online){const store=new Map(existing.map(k=>[k,new Map()]));const h={},calls={skip:0,fetched:[]};
  const B='https://x/salah-royal-rescue/';const abs=u=>new URL(typeof u==='string'?u:u.url,B).href.split('?')[0];
  const caches={open:async k=>{if(!store.has(k))store.set(k,new Map());const mm=store.get(k);return {addAll:async rs=>rs.forEach(r=>{calls.fetched.push(r);mm.set(abs(r),'cached:'+abs(r))}),put:async(r,v)=>mm.set(abs(r),v)}},
    keys:async()=>[...store.keys()],delete:async k=>store.delete(k),match:async r=>{for(const mm of store.values())if(mm.has(abs(r)))return mm.get(abs(r))}};
  class Req{constructor(u,o){this.url=new URL(u,B).href;this.cache=o&&o.cache}}
  const self={location:new URL(B+'sw.js'),addEventListener:(k,f)=>(h[k]=f),skipWaiting:()=>{calls.skip++;return Promise.resolve()},clients:{claim:async()=>{}}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,'sw.js'),'utf8'),{self,caches,Request:Req,URL,Promise,setTimeout,clearTimeout,Response:{error:()=>'ERR'},
    fetch:async(u,o)=>{calls.fetched.push({url:u,cache:o&&o.cache});if(!online())throw new Error('offline');return {ok:true,status:200,type:'basic',clone(){return 'net:'+u},body:'net:'+u}}});
  return {h,calls,store,run:async(k,e)=>{let p;e.waitUntil=x=>(p=x);e.respondWith=x=>(p=x);h[k](e);return p}}}
test('sw: precache past the HTTP cache; waits for a tap unless upgrading from salah-v1..v6',async()=>{
  const a=loadSW(['salah-v7'],()=>true);await a.run('install',{});eq(a.calls.skip,0);ok(a.calls.fetched.every(r=>r.cache==='reload'));
  const b=loadSW(['salah-v6','engineer-v2'],()=>true);await b.run('install',{});eq(b.calls.skip,1);
  a.h.message({data:{type:'SKIP_WAITING'}});eq(a.calls.skip,1);
  await b.run('activate',{});eq([...b.store.keys()].sort(),['engineer-v2','salah-v7'],'only old salah-* caches removed')});
test('sw: network-first (no-cache) online, cache offline, navigation fallback; /engineer/ and /learn/ untouched',async()=>{
  let on=true;const s=loadSW([],()=>on);await s.run('install',{});
  const r=await s.run('fetch',{request:{method:'GET',url:'https://x/salah-royal-rescue/index.html',mode:'navigate'}});eq(r.body,'net:https://x/salah-royal-rescue/index.html');
  ok(s.calls.fetched.some(f=>f.cache==='no-cache'));on=false;
  eq(await s.run('fetch',{request:{method:'GET',url:'https://x/salah-royal-rescue/?x=1',mode:'navigate'}}),'cached:https://x/salah-royal-rescue/');
  eq(await s.run('fetch',{request:{method:'GET',url:'https://x/salah-royal-rescue/zzz',mode:'navigate'}}),'net:https://x/salah-royal-rescue/index.html','fresh copy from the last online visit');
  for(const p of ['engineer/','engineer','learn/index.html','learn']){let called=false;s.h.fetch({request:{method:'GET',url:'https://x/salah-royal-rescue/'+p},respondWith:()=>called=true});ok(!called,p)}});
test('sw: cache salah-v7 and BUILD stamp is current (node tools/stamp-sw.js)',()=>{ok(/const C='salah-v7'/.test(fs.readFileSync(path.join(ROOT,'sw.js'),'utf8')));eq(STAMP.currentBuild(),STAMP.buildHash())});
test('page registers via the updater, How panel has the Update button, banner hidden in a level',()=>{
  ok(/updater\.register\('sw\.js'\)/.test(html));ok(!/serviceWorker\.register\('sw\.js'\)\.catch/.test(html));ok(html.includes('id="updBtn"'));ok(html.includes("if($('game').classList.contains('on'))return false"))});

(async()=>{for(const [n,fn] of queue){try{await fn();pass++}catch(e){fail++;fails.push(n+'\n    '+(e&&e.message||e))}}
  console.log(`\n${pass} passed, ${fail} failed`);if(fail){console.log('\nFAILURES:\n- '+fails.join('\n- '));process.exit(1)}})();
