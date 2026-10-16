// Unit tests for the game logic in ../index.html (the <script id="logic"> block).
// Run: node tests/tests.js
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const m=html.match(/<script id="logic">([\s\S]*?)<\/script>/);
if(!m)throw new Error('logic script block not found');
const ctx=vm.createContext({console,Math,JSON});
vm.runInContext(m[1],ctx);
const L=vm.runInContext(`({N,findMatches,groupRuns,specialFor,areaOf,resolveStep,applyGravity,resolveAll,planMove,planTap,doMove,hasMove,hasMatchMove,findHint,
  shuffleBoard,genBoard,spreadFire,countFixed,parseGoal,goalState,levelWon,starsFor,CITIES,LEVELS,LEVEL_DEFS,endlessLevel,migrateV1,freshSave,sanitizeSave,
  loadSave,validateCur,cleanCell,mulberry32,cloneBoard,isGem,isTile,isSpecial,nid,musicPlan,degFreq,musicStyleOf,MAQAMS})`,ctx);

let pass=0,fail=0;const fails=[];
function test(name,fn){try{fn();pass++}catch(e){fail++;fails.push(name+'\n    '+(e&&e.message||e))}}
const plain=v=>v===undefined?v:JSON.parse(JSON.stringify(v));
const eq=(a,b,msg)=>assert.deepStrictEqual(plain(a),plain(b),msg),ok=assert.ok;

// Board builder. Chars: 0-5 gem colour, '.' unique filler (never matches), F fire, B crate, D double crate, W water,
// h/v/x = rocketH/rocketV/bomb of colour 0, H/V/X = same with colour 1.
function bd(rows){return rows.map((s,r)=>[...s].map((ch,c)=>{
  if(ch>='0'&&ch<='5')return {id:L.nid(),type:+ch};
  if(ch==='.')return {id:L.nid(),type:100+r*8+c};
  if(ch==='F')return {id:L.nid(),fixed:'fire'};
  if(ch==='B')return {id:L.nid(),fixed:'box',hp:1};
  if(ch==='D')return {id:L.nid(),fixed:'box',hp:2};
  if(ch==='W')return {id:L.nid(),type:-1,sp:'water'};
  const sp={h:'rocketH',v:'rocketV',x:'bomb'}[ch.toLowerCase()];
  if(sp)return {id:L.nid(),type:ch===ch.toLowerCase()?0:1,sp};
  if(ch===' ')return null;
  throw new Error('bad char '+ch)}))}
const E='........';
const cellsOf=run=>run.cells.map(x=>x.join(',')).sort();
const fillerGen=()=>{let k=0;return ()=>({id:L.nid(),type:500+(k++)})};
const nulls=b=>b.flat().filter(x=>!x).length;
function randBoard(seed,colors){return L.genBoard({colors:colors||5},L.mulberry32(seed))}

// ---------- findMatches ----------
test('finds horizontal 3',()=>{const r=L.findMatches(bd(['000.....',E,E,E,E,E,E,E]));eq(r.length,1);eq(r[0].dir,'h');eq(cellsOf(r[0]),['0,0','0,1','0,2'])});
test('finds vertical 3',()=>{const r=L.findMatches(bd(['2.......','2.......','2.......',E,E,E,E,E]));eq(r.length,1);eq(r[0].dir,'v');eq(r[0].type,2)});
test('run of 5 is one run',()=>{const r=L.findMatches(bd([E,E,E,'.11111..',E,E,E,E]));eq(r.length,1);eq(r[0].cells.length,5)});
test('two separate runs',()=>{const r=L.findMatches(bd(['000.....',E,E,E,E,E,E,'.....333']));eq(r.length,2)});
test('L shape gives one h and one v run sharing the corner',()=>{const r=L.findMatches(bd(['4.......','4.......','444.....',E,E,E,E,E]));
  eq(r.length,2);eq(r.map(x=>x.dir).sort(),['h','v'])});
test('fixed cells break runs',()=>{eq(L.findMatches(bd(['00F00...','00B00...',E,E,E,E,E,E])).length,0)});
test('water never matches',()=>{eq(L.findMatches(bd(['WWW.....',E,E,E,E,E,E,E])).length,0)});
test('no false positives on a checker board',()=>{const b=bd([...Array(8)].map((_,r)=>[...Array(8)].map((_,c)=>(r+c)%2?'0':'1').join('')));eq(L.findMatches(b).length,0)});
test('specials match by colour',()=>{const r=L.findMatches(bd(['0h0.....',E,E,E,E,E,E,E]));eq(r.length,1)});
test('runs touching right and bottom edges',()=>{const r=L.findMatches(bd([E,E,E,E,E,'.......5','.......5','.....555']));eq(r.length,2)});
test('works on a non-8x8 board',()=>{eq(L.findMatches(bd(['111','2.2'])).length,1)});

// ---------- special creation ----------
const groupsOf=b=>L.groupRuns(L.findMatches(b));
test('3 in a row makes no special',()=>{eq(L.specialFor(groupsOf(bd(['000.....',E,E,E,E,E,E,E]))[0],null),null)});
test('4 horizontal makes a vertical rocket at the swapped cell',()=>{const s=L.specialFor(groupsOf(bd(['0000....',E,E,E,E,E,E,E]))[0],[[0,2],[1,2]]);eq(s,{sp:'rocketV',r:0,c:2})});
test('4 vertical makes a horizontal rocket',()=>{const s=L.specialFor(groupsOf(bd(['3.......','3.......','3.......','3.......',E,E,E,E]))[0],null);eq(s.sp,'rocketH')});
test('5 in a row makes a bomb',()=>{const s=L.specialFor(groupsOf(bd(['22222...',E,E,E,E,E,E,E]))[0],null);eq(s.sp,'bomb');eq([s.r,s.c],[0,2])});
test('L shape makes a bomb at the corner',()=>{const gs=groupsOf(bd(['4.......','4.......','444.....',E,E,E,E,E]));eq(gs.length,1);const s=L.specialFor(gs[0],null);eq(s,{sp:'bomb',r:2,c:0})});
test('T shape makes a bomb at the junction',()=>{const gs=groupsOf(bd(['555.....','.5......','.5......',E,E,E,E,E]));eq(gs.length,1);eq(L.specialFor(gs[0],null),{sp:'bomb',r:0,c:1})});
test('plus shape makes a bomb',()=>{const gs=groupsOf(bd(['.1......','111.....','.1......',E,E,E,E,E]));eq(gs.length,1);eq(L.specialFor(gs[0],null).sp,'bomb')});

// ---------- resolveStep ----------
test('clears a simple match and counts colours',()=>{const b=bd(['000.....',E,E,E,E,E,E,E]);const ev=L.resolveStep(b);
  eq(ev.cleared.length,3);eq(ev.collected[0],3);ok(b[0][0]===null&&b[0][2]===null&&b[0][3]!==null);ok(ev.any)});
test('no match means nothing happens',()=>{const b=bd([E,E,E,E,E,E,E,E]);const ev=L.resolveStep(b);ok(!ev.any);eq(nulls(b),0)});
test('match next to fire puts it out; distant fire stays',()=>{const b=bd(['000F....','.......F',E,E,E,E,E,E]);const ev=L.resolveStep(b);
  eq(ev.fireOut,1);eq(b[0][3],null);eq(b[1][7].fixed,'fire')});
test('fire diagonal to a match is NOT put out',()=>{const b=bd(['000.....','...F....',E,E,E,E,E,E]);eq(L.resolveStep(b).fireOut,0)});
test('double crate needs two hits',()=>{const b=bd(['000D....',E,E,E,E,E,E,E]);let ev=L.resolveStep(b);eq(b[0][3].hp,1);eq(ev.boxOut,0);
  b[0][0]={id:L.nid(),type:0};b[0][1]={id:L.nid(),type:0};b[0][2]={id:L.nid(),type:0};ev=L.resolveStep(b);eq(ev.boxOut,1);eq(b[0][3],null)});
test('a crate is hit once per step even if touched by two matches',()=>{const b2=bd(['..0.....','..0D1...','..0.1...','....1...',E,E,E,E]);L.resolveStep(b2);eq(b2[1][3].hp,1)});
test('4-match creates a rocket in place',()=>{const b=bd(['0000....',E,E,E,E,E,E,E]);const ev=L.resolveStep(b,{swap:[[0,1],[1,1]]});
  eq(ev.created.length,1);eq(b[0][1].sp,'rocketV');eq(b[0][1].type,0);eq(b[0][0],null);eq(b[0][3],null)});
test('rocketH clears its whole row and hits fire on it',()=>{const b=bd([E,E,E,'..h..F..',E,E,E,E]);const ev=L.resolveStep(b,{forced:[[3,2]],noMatch:true});
  eq(ev.cleared.length,7);eq(ev.fireOut,1);for(let c=0;c<8;c++)eq(b[3][c],null);eq(nulls(b),8)});
test('rocketV clears its column',()=>{const b=bd([E,E,E,'....v...',E,E,E,E]);L.resolveStep(b,{forced:[[3,4]],noMatch:true});for(let r=0;r<8;r++)eq(b[r][4],null);eq(nulls(b),8)});
test('bomb clears a 5x5 area without corners (21 cells)',()=>{const b=bd([E,E,E,'...x....',E,E,E,E]);const ev=L.resolveStep(b,{forced:[[3,3]],noMatch:true});eq(ev.cleared.length,21);eq(b[1][1]!==null,true);eq(b[1][2],null)});
test('bomb at a corner stays inside the board',()=>{const b=bd(['x.......',E,E,E,E,E,E,E]);const ev=L.resolveStep(b,{forced:[[0,0]],noMatch:true});eq(ev.cleared.length,8)});
test('chain reaction: rocket hits a bomb which explodes',()=>{const b=bd([E,E,E,'h......x',E,E,E,E]);const ev=L.resolveStep(b,{forced:[[3,0]],noMatch:true});
  eq(ev.blasts.map(x=>x.kind).sort(),['bomb','rocketH']);ok(b[5][6]===null&&b[1][6]===null)});
test('a special inside a normal match activates',()=>{const b=bd([E,E,E,'.0h0....',E,E,E,E]);const ev=L.resolveStep(b);eq(ev.blasts.length,1);for(let c=0;c<8;c++)eq(b[3][c],null)});
test('water splash puts out fire within 2 steps but not 3',()=>{const b=bd([E,E,'F.......','..W.F...',E,'..F.....','..F.....','........'].map((s,i)=>i===0?'..F.....':s));
  // fires: (0,2) d=3, (2,0) d=3, (3,4) d=2, (5,2) d=2, (6,2) d=3
  const ev=L.resolveStep(b,{forced:[[3,2]],noMatch:true});eq(ev.fireOut,2);eq(b[3][4],null);eq(b[5][2],null);eq(b[6][2].fixed,'fire');eq(b[0][2].fixed,'fire');eq(b[3][2],null)});
test('water drop hit by a rocket also splashes',()=>{const b=bd([E,E,'....F...','h...W...',E,E,E,E]);const ev=L.resolveStep(b,{forced:[[3,0]],noMatch:true});eq(ev.fireOut,1)});
test('combo rocket+rocket = row + column',()=>{const b=bd([E,E,E,'...hV...',E,E,E,E]);const ev=L.resolveStep(b,{combo:{r:3,c:4,r2:3,c2:3,a:'rocketH',b:'rocketV'},noMatch:true});
  eq(ev.cleared.length,15);for(let r=0;r<8;r++)eq(b[r][4],null)});
test('combo rocket+bomb = 3 rows + 3 columns',()=>{const b=bd([E,E,E,'...hx...',E,E,E,E]);const ev=L.resolveStep(b,{combo:{r:3,c:4,r2:3,c2:3,a:'rocketH',b:'bomb'},noMatch:true});eq(ev.cleared.length,24+24-9)});
test('combo bomb+bomb = 7x7 without corners',()=>{const b=bd([E,E,E,'...xX...',E,E,E,E]);const ev=L.resolveStep(b,{combo:{r:3,c:4,r2:3,c2:3,a:'bomb',b:'bomb'},noMatch:true});
  eq(ev.cleared.length,45)});
test('combo water+water puts out every fire',()=>{const b=bd(['F......F',E,E,'...WW...',E,E,E,'F..F...F']);const ev=L.resolveStep(b,{combo:{r:3,c:4,r2:3,c2:3,a:'water',b:'water'},noMatch:true});
  eq(ev.fireOut,5);eq(L.countFixed(b).fire,0)});
test('combo water+rocket = line blast plus splash radius 3',()=>{const b=bd([E,'.....F..',E,'...Wh...',E,'...F....',E,'F.......']);const ev=L.resolveStep(b,{combo:{r:3,c:4,r2:3,c2:3,a:'rocketH',b:'water'},noMatch:true});
  eq(ev.fireOut,2);eq(b[7][0].fixed,'fire');for(let c=0;c<8;c++)eq(b[3][c],null)});
test('score increases with cascade multiplier',()=>{const b1=bd(['000.....',E,E,E,E,E,E,E]),b2=bd(['000.....',E,E,E,E,E,E,E]);ok(L.resolveStep(b2,{mult:3}).score>L.resolveStep(b1,{mult:1}).score)});

// ---------- gravity ----------
test('tiles fall down and keep their order',()=>{const b=bd(['1.......','2.......',' .......',' .......',E,E,E,E]);const id1=b[0][0].id,id2=b[1][0].id;
  L.applyGravity(b,fillerGen());eq(b[3][0].id,id2);eq(b[2][0].id,id1);ok(b[0][0].fromAbove===2&&b[1][0].fromAbove===2);eq(nulls(b),0)});
test('fixed cells stay put and block falling',()=>{const b=bd(['1.......','B.......',' .......',E,E,E,E,E]);const id1=b[0][0].id;L.applyGravity(b,fillerGen());
  eq(b[1][0].fixed,'box');eq(b[0][0].id,id1);ok(b[2][0].spawn===1);eq(nulls(b),0)});
test('gen is called exactly once per empty cell',()=>{const b=bd([E,E,E,E,E,E,E,E]);b[2][2]=b[5][5]=b[7][0]=null;let n=0;L.applyGravity(b,()=>{n++;return {id:L.nid(),type:0}});eq(n,3);eq(nulls(b),0)});
test('applyGravity works with the v1 signature and returns the board',()=>{const b=bd([E,E]);b[1][3]=null;const r=L.applyGravity(b,()=>({id:L.nid(),type:1}));ok(r===b);eq(nulls(b),0)});

// ---------- moves ----------
test('planMove rejects non-adjacent and out-of-bounds swaps',()=>{const b=bd([E,E,E,E,E,E,E,E]);eq(L.planMove(b,0,0,2,0),null);eq(L.planMove(b,0,0,0,-1),null);eq(L.planMove(b,0,0,1,1),null)});
test('planMove rejects swaps that make no match and restores the board',()=>{const b=bd([E,E,E,E,E,E,E,E]);const before=b.map(r=>r.map(t=>t.id));eq(L.planMove(b,0,0,0,1),null);eq(b.map(r=>r.map(t=>t.id)),before)});
test('planMove rejects swapping a fixed cell',()=>{const b=bd(['00F0....',E,E,E,E,E,E,E]);eq(L.planMove(b,0,2,0,3),null)});
test('planMove accepts a matching swap and leaves it swapped',()=>{const b=bd(['001.....','..0.....',E,E,E,E,E,E]);const id=b[1][2].id;const p=L.planMove(b,1,2,0,2);ok(p&&p.swap);eq(b[0][2].id,id)});
test('special swapped with a normal tile is activated',()=>{const b=bd([E,'..h.....',E,E,E,E,E,E]);const p=L.planMove(b,1,2,1,3);eq(p.forced,[[1,3]])});
test('water swapped with any neighbour is activated',()=>{const b=bd([E,'..W.....',E,E,E,E,E,E]);const p=L.planMove(b,1,2,2,2);eq(p.forced,[[2,2]])});
test('two specials swapped make a combo',()=>{const b=bd([E,'..hx....',E,E,E,E,E,E]);const p=L.planMove(b,1,2,1,3);ok(p.combo);eq([p.combo.a,p.combo.b].sort(),['bomb','rocketH'])});
test('planTap only works on specials',()=>{const b=bd(['h.......',E]);ok(L.planTap(b,0,0));eq(L.planTap(b,0,1),null)});
test('doMove cascades until the board is stable',()=>{for(let s=1;s<=150;s++){const b=randBoard(s);const mv=L.hasMatchMove(b);const t=L.doMove(b,...mv,()=>({id:L.nid(),type:Math.floor(Math.random()*5)}));
  ok(t&&t.steps>=1);eq(L.findMatches(b).length,0);eq(nulls(b),0)}});
test('random specials and combos never leave holes or matches',()=>{const rnd=L.mulberry32(42);const sp=['rocketH','rocketV','bomb','water'];
  for(let s=0;s<200;s++){const b=randBoard(1000+s,6);for(let k=0;k<6;k++){const r=Math.floor(rnd()*8),c=Math.floor(rnd()*8),w=sp[Math.floor(rnd()*4)];b[r][c]=w==='water'?{id:L.nid(),type:-1,sp:'water'}:{id:L.nid(),type:b[r][c].type,sp:w}}
    const r=Math.floor(rnd()*8),c=Math.floor(rnd()*7);const t=L.doMove(b,r,c,r,c+1,()=>({id:L.nid(),type:Math.floor(rnd()*6)}));
    if(t){eq(L.findMatches(b).length,0);eq(nulls(b),0)}}});

// ---------- move detection / shuffle ----------
test('hasMatchMove finds a move',()=>{ok(L.hasMatchMove(bd(['001.....','..0.....',E,E,E,E,E,E])))});
test('hasMove is false on a dead board',()=>{const b=bd([E,E,E,E,E,E,E,E]);eq(L.hasMove(b),false);eq(L.findHint(b),null)});
test('hasMove counts specials (tap to use)',()=>{const b=bd([E,'...x....',E,E,E,E,E,E]);eq(L.hasMove(b),true);eq(L.findHint(b),[1,3,1,3])});
test('shuffle keeps fixed cells and tiles, leaves no matches and a valid move',()=>{
  for(let s=0;s<40;s++){const b=bd(['F.......','........','..B.....',E,E,E,E,'.......D']);const rnd=L.mulberry32(s);for(const row of b)for(const t of row)if(t.type>=100)t.type=Math.floor(rnd()*5);
    // make sure we start without matches by recolouring
    const idsBefore=b.flat().filter(L.isTile).map(t=>t.id).sort();L.shuffleBoard(b,rnd,5);
    eq(b[0][0].fixed,'fire');eq(b[2][2].fixed,'box');eq(b[7][7].hp,2);eq(b.flat().filter(L.isTile).map(t=>t.id).sort(),idsBefore);eq(L.findMatches(b).length,0);ok(L.hasMatchMove(b))}});

// ---------- board generation ----------
test('every level generates a valid starting board',()=>{L.LEVELS.forEach((lv,i)=>{for(let s=0;s<15;s++){const b=L.genBoard(lv,L.mulberry32(i*100+s));
  eq(L.findMatches(b).length,0,'level '+(i+1));ok(L.hasMatchMove(b),'move on level '+(i+1));const f=L.countFixed(b);eq(f.fire,lv.fires.length);eq(f.box,lv.boxes.length);
  ok(b.flat().every(t=>t&&(t.fixed||t.sp==='water'||(t.type>=0&&t.type<lv.colors)))) }})});

// ---------- fire ----------
test('fire spreads onto a neighbouring plain gem',()=>{const b=bd([E,E,E,'...F....',E,E,E,E]);const o=L.spreadFire(b,L.mulberry32(1));ok(o);eq(Math.abs(o.r-3)+Math.abs(o.c-3),1);eq(b[o.r][o.c].fixed,'fire');eq(L.countFixed(b).fire,2)});
test('fire never spreads onto specials, water or crates',()=>{const b=bd([E,E,'...W....','..xFh...','...B....',E,E,E]);eq(L.spreadFire(b,Math.random),null)});
test('no fire means no spread',()=>{eq(L.spreadFire(bd([E,E,E,E,E,E,E,E])),null)});

// ---------- goals ----------
test('goal parsing and state',()=>{eq(L.parseGoal('c3:20'),{k:'color',t:3,n:20});eq(L.parseGoal('fire'),{k:'fire'});
  const st={score:100,collected:{3:25},fires:0,boxes:2};ok(L.goalState(L.parseGoal('c3:20'),st).done);ok(L.goalState({k:'fire'},st).done);eq(L.goalState({k:'box'},st).left,2);
  ok(!L.levelWon([{k:'fire'},{k:'box'}],st));ok(L.levelWon([{k:'fire'},{k:'score',n:50}],st))});
test('stars depend on moves left',()=>{eq(L.starsFor(10,20),3);eq(L.starsFor(3,20),2);eq(L.starsFor(0,20),1)});

// ---------- level data ----------
test('at least 20 levels, all cities used, journey alternates Morocco/Kuwait',()=>{ok(L.LEVELS.length>=20);
  L.CITIES.forEach((c,i)=>{ok(L.LEVELS.some(l=>l.city===i),'city has a level: '+c.en);ok(c.ar&&c.fact&&c.en);if(i)ok(c.c!==L.CITIES[i-1].c,'alternates at '+c.en)});
  ok(L.CITIES.some(c=>c.en==='Casablanca')&&L.CITIES.some(c=>c.en==='Merzouga')&&L.CITIES.some(c=>c.en==='Failaka Island'));
  ok(L.CITIES.filter(c=>L.LEVELS.filter(l=>l.city===L.CITIES.indexOf(c)).length===2).length>=3,'some cities have 2 levels')});
test('levels go in journey order and goals are varied',()=>{for(let i=1;i<L.LEVELS.length;i++)ok(L.LEVELS[i].city>=L.LEVELS[i-1].city);
  const kinds=new Set(L.LEVELS.flatMap(l=>l.goals.map(g=>g.k)));['score','color','fire','box'].forEach(k=>ok(kinds.has(k),k))});
test('the first level with each mechanic has a tutorial',()=>{const first=pred=>L.LEVELS.find(pred);
  eq(first(l=>l.fires.length).tut,'fire');eq(first(l=>l.water.length).tut,'water');eq(first(l=>l.boxes.length).tut,'box');
  ok(L.LEVELS.some(l=>l.tut==='rocket')&&L.LEVELS.some(l=>l.tut==='bomb')&&L.LEVELS[0].tut==='match')});
test('later levels are harder (more colours / obstacles)',()=>{const half=Math.floor(L.LEVELS.length/2),avg=a=>a.reduce((x,l)=>x+l.colors+l.fires.length/4+l.boxes.length/8+l.goals.length,0)/a.length;
  ok(avg(L.LEVELS.slice(half))>avg(L.LEVELS.slice(0,half)))});
test('endless levels get harder forever and are deterministic',()=>{let pm=99,pf=0;for(let n=1;n<=200;n++){const e=L.endlessLevel(n);ok(e.moves<=pm&&e.moves>=12);ok(e.fires.length>=pf||e.fires.length>=20);
  pm=e.moves;pf=Math.max(pf,e.fires.length);ok(e.goals.length>=1);const b=L.genBoard(e,L.mulberry32(n));eq(nulls(b),0)}
  eq(JSON.stringify(L.endlessLevel(7)),JSON.stringify(L.endlessLevel(7)));ok(L.endlessLevel(60).spread>L.endlessLevel(1).spread);ok(L.endlessLevel(1e9).moves>=12);ok(L.endlessLevel('x').endless===1)});

// ---------- save / migration ----------
test('migrateV1 handles any shape',()=>{eq(L.migrateV1(null),0);eq(L.migrateV1(''),0);eq(L.migrateV1('garbage{'),0);eq(L.migrateV1('42'),0);eq(L.migrateV1('null'),0);
  eq(L.migrateV1('{}'),0);eq(L.migrateV1('{"done":{"0":1,"1":1,"2":1}}'),3);eq(L.migrateV1('{"done":[1,1,0,1]}'),3);eq(L.migrateV1('{"done":{"0":true,"4":1,"x":1,"-1":1}}'),2);
  eq(L.migrateV1('{"done":{"0":1,"1":1,"2":1,"3":1,"4":1,"5":1,"6":1}}'),5);eq(L.migrateV1('{"done":"yes"}'),0);eq(L.migrateV1('[1,2]'),0);eq(L.migrateV1({done:{0:1}}),1)});
test('loadSave migrates v1 progress into the first levels',()=>{const s=L.loadSave(k=>k==='salahSave'?JSON.stringify({done:{0:1,1:1,2:1},best:{0:999},last:3}):null);
  eq(s.done,{0:1,1:1,2:1});eq(s.mig,3);eq(s.cur,null)});
test('loadSave prefers salahSave2 and survives corruption / exceptions',()=>{
  const v2=JSON.stringify({v:2,done:{0:3,1:2},best:{0:500},endless:{lv:4,best:3},sound:false,tut:{fire:1}});
  const s=L.loadSave(k=>k==='salahSave2'?v2:'{"done":{"0":1,"1":1,"2":1,"3":1}}');eq(s.done,{0:3,1:2});eq(s.endless,{lv:4,best:3});eq(s.sound,false);
  const s2=L.loadSave(k=>k==='salahSave2'?'{oops':'{"done":{"0":1}}');eq(s2.done,{0:1});
  const s3=L.loadSave(()=>{throw new Error('no storage')});eq(s3.done,{});
  const s4=L.loadSave(k=>k==='salahSave2'?'"string"':null);eq(s4.done,{})});
test('sanitizeSave clamps bad values',()=>{const s=L.sanitizeSave({done:{0:9,1:'2',2:-1,999:3,abc:1},best:{0:'NaN'},endless:{lv:-5,best:'x'},sound:'yes'});
  eq(s.done,{0:3,1:2});eq(s.best,{});eq(s.endless.lv,1);eq(s.sound,true);eq(L.sanitizeSave(null).done,{});eq(L.sanitizeSave([1,2]).done,{})});
test('validateCur accepts a real saved game',()=>{const b=L.genBoard(L.LEVELS[8],L.mulberry32(3));b[0][0]={id:1,type:2,sp:'bomb'};
  const cur={mode:'story',lv:8,en:0,b:JSON.parse(JSON.stringify(b)),moves:12,score:3400,turn:9,collected:{0:5,2:7},plus:0};
  const v=L.validateCur(JSON.parse(JSON.stringify(cur)));ok(v);eq(v.moves,12);eq(v.b[0][0].sp,'bomb');eq(L.countFixed(v.b),L.countFixed(b));
  ok(L.validateCur({mode:'endless',en:5,b:cur.b,moves:3,score:0,turn:0,collected:{}}))});
test('validateCur rejects bad data',()=>{const b=JSON.parse(JSON.stringify(L.genBoard(L.LEVELS[0],L.mulberry32(1))));
  const base={mode:'story',lv:0,b,moves:5,score:0,turn:0,collected:{}};const bad=o=>eq(L.validateCur(Object.assign({},base,o)),null);
  ok(L.validateCur(base));bad({mode:'x'});bad({lv:999});bad({lv:-1});bad({lv:1.5});bad({moves:0});bad({moves:'5'});bad({score:-1});bad({b:b.slice(1)});
  bad({b:b.map((r,i)=>i?r:r.slice(1))});bad({b:b.map((r,i)=>i?r:[null,...r.slice(1)])});bad({b:b.map((r,i)=>i?r:[{type:9},...r.slice(1)])});
  bad({b:b.map((r,i)=>i?r:[{type:1,sp:'nuke'},...r.slice(1)])});bad({b:b.map((r,i)=>i?r:[{fixed:'lava'},...r.slice(1)])});bad({collected:{0:-3}});bad({mode:'endless',en:0});
  eq(L.validateCur(null),null);eq(L.validateCur('str'),null);eq(L.validateCur({}),null)});

// ---------- music settings / migration ----------
test('fresh save has music on and no last city',()=>{const s=L.freshSave();eq(s.music,true);eq(s.lastCity,null);eq(s.sound,true)});
test('old saves without a music flag migrate to music on and keep sound',()=>{
  const s=L.loadSave(k=>k==='salahSave2'?JSON.stringify({v:2,done:{0:3},sound:false}):null);eq(s.music,true);eq(s.sound,false);eq(s.done,{0:3});
  const s1=L.loadSave(k=>k==='salahSave'?JSON.stringify({done:{0:1}}):null);eq(s1.music,true);
  eq(L.loadSave(()=>{throw new Error('x')}).music,true);eq(L.loadSave(k=>k==='salahSave2'?'{bad':null).music,true)});
test('music flag is independent of the sound flag and survives a round trip',()=>{
  const s=L.loadSave(k=>k==='salahSave2'?JSON.stringify({v:2,sound:true,music:false}):null);eq(s.music,false);eq(s.sound,true);
  const back=L.sanitizeSave(JSON.parse(JSON.stringify(s)));eq(back.music,false);eq(back.sound,true);
  const s2=L.sanitizeSave({sound:false,music:true});eq([s2.sound,s2.music],[false,true])});
test('sanitizeSave rejects non-boolean music and clamps lastCity',()=>{
  ['yes',1,0,null,'false',{}].forEach(v=>eq(L.sanitizeSave({music:v}).music,true,String(v)));
  eq(L.sanitizeSave({lastCity:3}).lastCity,3);eq(L.sanitizeSave({lastCity:'4'}).lastCity,4);eq(L.sanitizeSave({lastCity:999}).lastCity,L.CITIES.length-1);
  eq(L.sanitizeSave({lastCity:-2}).lastCity,0);eq(L.sanitizeSave({lastCity:'x'}).lastCity,null);eq(L.sanitizeSave({lastCity:null}).lastCity,null);eq(L.sanitizeSave({}).lastCity,null)});

// ---------- music plans ----------
test('music style follows the country of each city',()=>{L.CITIES.forEach((c,i)=>{const p=L.musicPlan(i);eq(p.style,c.c==='KW'?'samri':'chaabi',c.en);eq(L.musicStyleOf(i),p.style);
  if(c.c==='MA'){eq(p.steps,12);eq(p.perBeat,6)}else{eq(p.steps,16);eq(p.perBeat,4)}})});
test('music plans are deterministic and every city has its own melody',()=>{
  L.CITIES.forEach((c,i)=>eq(JSON.stringify(L.musicPlan(i)),JSON.stringify(L.musicPlan(i))));
  eq(new Set(L.CITIES.map((c,i)=>JSON.stringify(L.musicPlan(i).melody))).size,L.CITIES.length);
  eq(L.musicPlan(999).city,L.CITIES.length-1);eq(L.musicPlan(-3).city,0);eq(L.musicPlan('x').city,0)});
test('melodies fill the 8-bar loop without overlaps and resolve to the tonic',()=>{L.CITIES.forEach((c,i)=>{const p=L.musicPlan(i),tot=p.steps*p.bars;let s=0;
  for(const e of p.melody){eq(e.s,s,c.en);ok(e.l>=1);ok(e.d===null||Number.isInteger(e.d));s+=e.l}eq(s,tot,c.en);
  ok(p.melody.some(e=>e.s===6*p.steps-p.perBeat&&e.d!==null),'B phrase ends on a note');eq(p.melody[p.melody.length-1].d,0,c.en);
  for(const k of ['drum','clap','extra'])eq(p[k].length,p.steps,c.en+' '+k);ok(p.bpm>=80&&p.bpm<=120);ok(p.themeBpm<p.bpm)})});
test('Kuwait tunes use maqam quarter tones, scale degrees map to pitches',()=>{
  ok(L.CITIES.some((c,i)=>c.c==='KW'&&L.musicPlan(i).scale.some(x=>x%1)),'some Kuwaiti city uses a quarter-tone maqam');
  ok(new Set(L.CITIES.map((c,i)=>L.musicPlan(i).maqam)).size>=3,'several maqams in use');
  const p=L.musicPlan(1);ok(Math.abs(L.degFreq(p,0)-p.tonic)<1e-9);ok(Math.abs(L.degFreq(p,7)-2*p.tonic)<1e-9);ok(Math.abs(L.degFreq(p,-7)-p.tonic/2)<1e-9);
  const bay={scale:L.MAQAMS.bayati,tonic:293.66};ok(Math.abs(L.degFreq(bay,1)/293.66-Math.pow(2,1.5/12))<1e-9)});

// ---------- playability (seeded greedy bot) ----------
function botPlay(lv,seed){
  const rnd=L.mulberry32(seed),b=L.genBoard(lv,rnd);
  const gen=()=>rnd()<(L.countFixed(b).fire?lv.waterRate:0)?{id:L.nid(),type:-1,sp:'water'}:{id:L.nid(),type:Math.floor(rnd()*lv.colors)};
  const fake=()=>({id:L.nid(),type:-5}),st={score:0,collected:{}};let moves=lv.moves;
  const stat=()=>{const f=L.countFixed(b);return {score:st.score,collected:st.collected,fires:f.fire,boxes:f.box}};
  while(moves>0){const s=stat();let best=null,bv=-1;
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)for(const mv of [[r,c,r,c+1],[r,c,r+1,c],[r,c,r,c]]){
      if(mv[2]>7||mv[3]>7)continue;const bb=L.cloneBoard(b);const p=mv[0]===mv[2]&&mv[1]===mv[3]?L.planTap(bb,r,c):L.planMove(bb,...mv);if(!p)continue;
      const t=L.resolveAll(bb,fake,p);let v=t.score/200+t.created*2+(s.fires?t.fireOut*4:0)+rnd()*.5;
      for(const g of lv.goals){if(g.k==='fire')v+=t.fireOut*10;else if(g.k==='box')v+=t.boxOut*6;else if(g.k==='color')v+=Math.min(L.goalState(g,s).left,t.collected[g.t]||0)*1.2;else v+=t.score/100}
      if(v>bv){bv=v;best=mv}}
    if(!best){L.shuffleBoard(b,rnd,lv.colors);continue}
    const t=L.doMove(b,...best,gen);moves--;st.score+=t.score;for(const k in t.collected)st.collected[k]=(st.collected[k]||0)+t.collected[k];
    if(L.levelWon(lv.goals,stat()))return true;
    if(!t.fireOut)for(let i=0;i<lv.spread;i++)L.spreadFire(b,rnd);
    if(!L.hasMove(b))L.shuffleBoard(b,rnd,lv.colors)}
  return false;
}
test('every story level can be won by a simple bot',()=>{L.LEVELS.forEach((lv,i)=>{let w=0;for(let s=1;s<=4&&!w;s++)if(botPlay(lv,s*101+i))w++;ok(w,'level '+(i+1)+' never won')})});

console.log(`\n${pass} passed, ${fail} failed`);
if(fail){console.log('\nFAILURES:\n- '+fails.join('\n- '));process.exit(1)}
