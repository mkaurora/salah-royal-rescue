// Royal Rescue service worker (scope: the site root; /engineer/ and /learn/ have their own and are skipped here).
// Game files are network-first, past the HTTP cache, so an online launch always gets the newest version; the cached
// copy is used offline or on a very slow network. Music is cache-first. A new version waits until the page asks it to
// take over (SKIP_WAITING after a tap on "Update"), so nothing reloads in the middle of a level.
// BUILD changes whenever index.html changes (node tools/stamp-sw.js), so every deploy is a new SW version.
const BUILD='3b958d99';
const C='salah-v7',F=['./','index.html','manifest.json','icon-180.png','icon-192.png','icon-512.png','music/kuwait.m4a','music/morocco.m4a'];
const LEGACY=['salah-v1','salah-v2','salah-v3','salah-v4','salah-v5','salah-v6']; // builds without the update banner: take over at once
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:'reload'})))).then(()=>caches.keys()).then(k=>{if(k.some(x=>LEGACY.includes(x)))return self.skipWaiting()})));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('salah-')&&x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{const d=e.data||{};if(d.type==='SKIP_WAITING')self.skipWaiting();if(d.type==='VERSION'&&e.ports&&e.ports[0])e.ports[0].postMessage({cache:C,build:BUILD})});
const skip=p=>p.includes('/engineer/')||p.endsWith('/engineer')||p.includes('/learn/')||p.endsWith('/learn');
function put(req,res){if(res&&res.status===200&&res.type==='basic'){const cp=res.clone();caches.open(C).then(c=>c.put(req,cp))}return res}
function fromCache(req){return caches.match(req,{ignoreSearch:true}).then(h=>h||(req.mode==='navigate'?caches.match('index.html').then(x=>x||caches.match('./')):h))}
function networkFirst(req){return new Promise(resolve=>{let settled=false;const done=r=>{if(!settled&&r){settled=true;resolve(r)}};
  const slow=setTimeout(()=>fromCache(req).then(done),6000);
  fetch(req.url,{cache:'no-cache',credentials:'same-origin'}).then(res=>{clearTimeout(slow);if(res&&res.ok){put(req,res);done(res)}else fromCache(req).then(h=>done(h||res))})
   .catch(()=>{clearTimeout(slow);fromCache(req).then(h=>{if(h)done(h);else if(!settled){settled=true;resolve(Response.error())}})})})}
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);if(u.origin!==self.location.origin||skip(u.pathname))return;
  if(/\.m4a$/.test(u.pathname)){e.respondWith(caches.match(req,{ignoreSearch:true}).then(h=>h||fetch(req).then(r=>put(req,r))));return}
  e.respondWith(networkFirst(req))});
