/* Swarm Surge simulation. DOM-free (runs in node for bot balancing). Flat typed-array pools, no per-frame allocation.
 * World: x 0..100 across the lane, y 0 (cannon line) .. LL (enemy bases). Player units run +y, enemies run -y. */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { root.SG = root.SG || {}; root.SG.createSim = m.createSim; root.SG.SIM = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var LW = 100, LL = 170, BREACH = 3, MAXU = 1900, MAXPLAYER = 1000, MAXENEMY = 750, MAXP = 1400, MAXT = 24;
  var LEAK_PIP = 5, WALL_CAP = 40, SEP = 3.1, PCS = 3, PGW = 34, PGH = 62; // 5 leaked enemies cost one shield pip; left wall: max free units per level
  var STEP = 1 / 60, CS = 8, GW = 14, GH = 24;
  var K_NORMAL = 0, K_CHAMP = 1, K_GIANT = 2, K_RUNNER = 3, K_TANK = 4;
  // particle colours: 0 player, 1 enemy, 2 white, 3 orange, 4 yellow, 5 gold, 6 green
  var CHAMP_HP = 200, CHAMP_DMG = 8, CHAMP_BASE = 120;

  function createSim(env) {
    env = env || {};
    var S = { LW: LW, LL: LL, BREACH: BREACH, MAXU: MAXU, MAXP: MAXP, MAXT: MAXT };
    var seed = 12345;
    function rand() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    function emit(type, x, y, a) { if (env.onEvent) env.onEvent(type, x, y, a); }

    // ---- unit pool ----
    var alive = new Uint8Array(MAXU), ukind = new Uint8Array(MAXU), uhp = new Int16Array(MAXU), udm = new Uint8Array(MAXU);
    var ux = new Float32Array(MAXU), uy = new Float32Array(MAXU), uvx = new Float32Array(MAXU), uvy = new Float32Array(MAXU);
    var ur = new Float32Array(MAXU), uph = new Float32Array(MAXU), ugm = new Uint32Array(MAXU), umax = new Int16Array(MAXU), uhit = new Float32Array(MAXU);
    var free = new Int32Array(MAXU), freeN = 0, hi = 0;
    var gHead = new Int32Array(GW * GH), gNext = new Int32Array(MAXU), pHead = new Int32Array(PGW * PGH), pNext = new Int32Array(MAXU);
    S.alive = alive; S.ukind = ukind; S.uhp = uhp; S.umax = umax; S.ux = ux; S.uy = uy; S.ur = ur; S.uph = uph; S.uhit = uhit;
    S.hi = function () { return hi; };

    // ---- particles / texts ----
    var px = new Float32Array(MAXP), py = new Float32Array(MAXP), pz = new Float32Array(MAXP);
    var pvx = new Float32Array(MAXP), pvy = new Float32Array(MAXP), pvz = new Float32Array(MAXP);
    var plife = new Float32Array(MAXP), pcol = new Uint8Array(MAXP), psz = new Float32Array(MAXP), pnext = 0;
    S.px = px; S.py = py; S.pz = pz; S.plife = plife; S.pcol = pcol; S.psz = psz;
    var tx = new Float32Array(MAXT), ty = new Float32Array(MAXT), tlife = new Float32Array(MAXT), tsz = new Float32Array(MAXT);
    var tstr = [], tcol = new Uint8Array(MAXT), tnext = 0;
    for (var q = 0; q < MAXT; q++) tstr.push('');
    S.tx = tx; S.ty = ty; S.tlife = tlife; S.tsz = tsz; S.tstr = tstr; S.tcol = tcol;

    function burst(x, y, z, n, col, spd) {
      for (var k = 0; k < n; k++) {
        var i = pnext; pnext = (pnext + 1) % MAXP;
        var a = rand() * 6.283, s = (0.4 + rand()) * spd;
        px[i] = x; py[i] = y; pz[i] = z; pvx[i] = Math.cos(a) * s; pvy[i] = Math.sin(a) * s * 0.7; pvz[i] = 8 + rand() * 18;
        plife[i] = 0.35 + rand() * 0.45; pcol[i] = col; psz[i] = 0.7 + rand() * 0.9;
      }
    }
    function text(x, y, str, col, sz) {
      var i = tnext; tnext = (tnext + 1) % MAXT;
      tx[i] = x; ty[i] = y; tstr[i] = str; tlife[i] = 1; tcol[i] = col; tsz[i] = sz;
    }
    S.burst = burst; S.text = text;

    function spawn(team, kind, x, y, hp, dmg, r, vy, gm) {
      if (freeN === 0) return -1;
      var i = free[--freeN];
      alive[i] = team; ukind[i] = kind; ux[i] = x; uy[i] = y; uhp[i] = hp; umax[i] = hp; udm[i] = dmg; ur[i] = r; uvy[i] = vy;
      uph[i] = rand() * 6.283; ugm[i] = gm; uvx[i] = 0; uhit[i] = 0;
      if (i >= hi) hi = i + 1;
      if (team === 1) S.nPlayer++; else S.nEnemy++;
      return i;
    }
    function kill(i) {
      if (alive[i] === 1) S.nPlayer--; else S.nEnemy--;
      alive[i] = 0; free[freeN++] = i;
    }

    // ---- setup ----
    S.over = true; S.result = null; S.nPlayer = 0; S.nEnemy = 0; S.time = 0; S.bases = []; S.gates = [];
    S.cannonX = 50; S.targetX = 50; S.held = false; S.shake = 0; S.flash = 0; S.red = 0; S.recoil = 0; S.charge = 0; S.level = null; S.ai = null;
    S.stats = { rate: 8, perShot: 4, charge: 1, skin: 0 };
    S.killPulse = 0; S.wallUsed = 0; S.leakAcc = 0;
    var acc = 0, fireCd = 0, shotAcc = 0, burstI = 0, giantI = 0, aiCd = 0;

    S.start = function (level, stats, ai) {
      S.level = level; S.stats = stats || S.stats; S.ai = ai || null; seed = (level.n * 2654435761) >>> 0;
      for (var i = 0; i < MAXU; i++) { alive[i] = 0; free[i] = MAXU - 1 - i; }
      freeN = MAXU; hi = 0; S.nPlayer = 0; S.nEnemy = 0;
      for (i = 0; i < MAXP; i++) plife[i] = 0;
      for (i = 0; i < MAXT; i++) tlife[i] = 0;
      S.time = 0; S.over = false; S.result = null; S.cannonX = 50; S.targetX = 50; S.held = false; S.shake = 0; S.flash = 0; S.red = 0; S.recoil = 0;
      S.charge = 0; S.shield = S.shieldMax = level.shield; acc = 0; fireCd = 0.3; shotAcc = 0; burstI = 0; giantI = 0; aiCd = 0;
      S.fired = 0; S.kills = 0; S.killPulse = 0; S.wallUsed = 0; S.leakAcc = 0; S.peak = 0; S.peakUnits = 0; S.winTime = 0; S.baseMax = 0; S.leaks = 0;
      S.bases = level.bases.map(function (b) {
        S.baseMax += b.hp;
        return { x0: b.x0, x1: b.x1, hp: b.hp, max: b.hp, flash: 0, acc: 1.5, rate: b.rate, rageN: b.rageN, rage: 0, q: [0, 0, 0] };
      });
      S.gates = level.gates.map(function (g, i) {
        return { id: i, y: g.y, c0: g.c, w: g.w, amp: g.amp, spd: g.spd, ph: g.ph, t: g.t, v: g.v, cx: g.c, x0: g.c - g.w / 2, x1: g.c + g.w / 2, acc: 0, flash: 0, txt: 0, label: (g.t === 'x' ? 'x' : g.t === '+' ? '+' : '-') + g.v };
      });
      emit('start');
    };
    S.baseHp = function () { var h = 0; for (var i = 0; i < S.bases.length; i++) h += Math.max(0, S.bases[i].hp); return h; };

    S.launchChampion = function () {
      if (S.over || S.charge < 100) return false;
      S.charge = 0;
      spawn(1, K_CHAMP, S.cannonX, 6, CHAMP_HP, CHAMP_DMG, 4.6, 40, 0xffffffff);
      S.shake = Math.max(S.shake, 0.6); S.flash = 0.25;
      burst(S.cannonX, 5, 2, 24, 5, 40);
      emit('champion', S.cannonX, 5);
      return true;
    };

    function spawnEnemy(b, kind, hp) {
      if (S.nEnemy >= MAXENEMY) return -1;
      var x = b.x0 + 3 + rand() * (b.x1 - b.x0 - 6), y = LL - 4 - rand() * 16;
      if (kind === K_GIANT) return spawn(2, K_GIANT, (b.x0 + b.x1) / 2, LL - 6, hp, 1, 6.5, 9, 0);
      if (kind === K_RUNNER) return spawn(2, K_RUNNER, x, y, 1, 1, 1.5, 38 + rand() * 6, 0);
      if (kind === K_TANK) return spawn(2, K_TANK, x, y, 5, 1, 2.6, 15 + rand() * 3, 0);
      return spawn(2, K_NORMAL, x, y, 1, 1, 1.9, 21 + rand() * 6, 0);
    }
    function pickKind() {
      var r = rand(), L = S.level;
      if (r < L.tankP) return K_TANK;
      if (r < L.tankP + L.runnerP) return K_RUNNER;
      return K_NORMAL;
    }
    function sumBurst(bi, n, kind) {
      var b = S.bases[bi % S.bases.length];
      if (b.hp <= 0) { for (var k = 0; k < S.bases.length; k++) if (S.bases[k].hp > 0) { b = S.bases[k]; break; } }
      b.q[kind === K_RUNNER ? 1 : kind === K_TANK ? 2 : 0] += n; // staggered out of the base by drainQueue()
    }
    function drainQueue(b, dt) {
      var tot = b.q[0] + b.q[1] + b.q[2];
      if (tot <= 0) return;
      b.qa = (b.qa || 0) + Math.max(40, tot * 1.2) * dt;
      while (b.qa >= 1 && tot > 0 && S.nEnemy < MAXENEMY) {
        b.qa -= 1;
        var qk = b.q[0] > 0 ? 0 : b.q[1] > 0 ? 1 : 2;
        if (rand() < 0.5) qk = b.q[1] > 0 ? 1 : b.q[2] > 0 ? 2 : 0;
        if (b.q[qk] <= 0) qk = b.q[0] > 0 ? 0 : b.q[1] > 0 ? 1 : 2;
        b.q[qk]--; tot--;
        spawnEnemy(b, qk === 1 ? K_RUNNER : qk === 2 ? K_TANK : K_NORMAL, 0);
      }
      if (S.nEnemy >= MAXENEMY || tot <= 0) b.qa = Math.min(b.qa, 1);
    }

    function applyGate(i, g) {
      g.flash = 1;
      if (ukind[i] === K_CHAMP) return;
      var cl = 0;
      if (g.t === 'x') cl = g.v - 1;
      else if (g.t === '+') { g.acc += g.v / 5; cl = g.acc | 0; g.acc -= cl; }
      else if (rand() < Math.min(1, g.v / 20)) {
        burst(ux[i], uy[i], 1, 3, 3, 14); kill(i); return;
      }
      for (var k = 0; k < cl; k++) {
        if (S.nPlayer >= MAXPLAYER) break;
        var j = spawn(1, K_NORMAL, ux[i] + (rand() - 0.5) * 4.5, uy[i] + 0.5 + rand() * 3, 1, 1, 1.9, uvy[i], ugm[i]);
        if (j < 0) break;
        uvx[j] = (rand() - 0.5) * 10;
      }
      if (S.time - g.txt > 0.28) { g.txt = S.time; text(ux[i], g.y + 4, g.label, g.t === '-' ? 1 : 6, g.t === '-' ? 1 : 1.1); emit('gate', g.cx, g.y, g.t === '-' ? 1 : 0); }
    }

    function popEnemy(j) {
      var k = ukind[j];
      S.kills++; S.killPulse = 1;
      if (k === K_GIANT) {
        burst(ux[j], uy[j], 6, 40, 3, 50); burst(ux[j], uy[j], 6, 20, 4, 40);
        S.shake = Math.max(S.shake, 0.7); emit('giant', ux[j], uy[j]);
        text(ux[j], uy[j] + 6, 'SMASH!', 4, 1.5);
      }
      kill(j);
    }

    function hitBase(i, b) {
      var dmg = ukind[i] === K_CHAMP ? CHAMP_BASE : 1;
      b.hp -= dmg; b.flash = 1; S.shake = Math.max(S.shake, dmg > 1 ? 0.5 : 0.05);
      burst(ux[i], LL - 1, 2, dmg > 1 ? 24 : 2, 4, 22);
      if (dmg > 1) emit('basebig', ux[i], LL);
      if (b.hp <= 0) {
        b.hp = 0; burst((b.x0 + b.x1) / 2, LL - 2, 6, 60, 3, 60); burst((b.x0 + b.x1) / 2, LL - 2, 8, 30, 4, 50);
        S.shake = 1; S.flash = 0.5; emit('basedown', (b.x0 + b.x1) / 2, LL);
        text((b.x0 + b.x1) / 2, LL - 10, 'DESTROYED!', 4, 1.6);
        // remaining enemies near the broken base panic and pop
      }
    }

    function aiUpdate(dt) {
      aiCd -= dt; S.held = true;
      var a = S.ai;
      if (aiCd <= 0) {
        aiCd = 0.22;
        var best = 50, bs = -1, tt, k, x, c, sc, g, b;
        for (x = 6; x <= 94; x += 2) {
          sc = 1;
          for (k = 0; k < S.gates.length; k++) {
            g = S.gates[k]; tt = g.y / 58;
            c = g.c0 + g.amp * Math.sin((S.time + tt) * g.spd + g.ph);
            if (x >= c - g.w / 2 + 1.5 && x <= c + g.w / 2 - 1.5) sc *= g.t === 'x' ? g.v : g.t === '+' ? 1 + g.v / 5 : Math.max(0.05, 1 - g.v / 20);
          }
          var bf = 0.15;
          for (k = 0; k < S.bases.length; k++) { b = S.bases[k]; if (b.hp > 0 && x >= b.x0 && x <= b.x1) bf = 1 + 0.5 * (1 - b.hp / b.max); }
          var sco = sc * bf - Math.abs(x - S.cannonX) * 0.004;
          if (sco > bs) { bs = sco; best = x; }
        }
        S.targetX = best + (rand() - 0.5) * (a.sloppy || 0);
      }
      if (S.charge >= 100 && S.nEnemy > (a.champAt || 25)) S.launchChampion();
    }

    function step() {
      var dt = STEP, i, j, k, g, b;
      S.time += dt;
      if (S.ai && !S.over) aiUpdate(dt);
      // decay
      S.shake = Math.max(0, S.shake - dt * 2.2); S.flash = Math.max(0, S.flash - dt * 2); S.red = Math.max(0, S.red - dt * 1.6); S.recoil = Math.max(0, S.recoil - dt * 8); S.killPulse = Math.max(0, S.killPulse - dt * 4);
      for (k = 0; k < S.gates.length; k++) {
        g = S.gates[k]; g.cx = g.c0 + g.amp * Math.sin(S.time * g.spd + g.ph); g.x0 = g.cx - g.w / 2; g.x1 = g.cx + g.w / 2; g.flash = Math.max(0, g.flash - dt * 3);
      }
      for (k = 0; k < S.bases.length; k++) S.bases[k].flash = Math.max(0, S.bases[k].flash - dt * 4);
      if (!S.over) {
        // cannon
        var dx = S.targetX - S.cannonX, mx = 230 * dt;
        S.cannonX += Math.max(-mx, Math.min(mx, dx * Math.min(1, dt * 20)));
        S.cannonX = Math.max(4, Math.min(96, S.cannonX));
        fireCd -= dt;
        var interval = 1 / (S.stats.rate * (S.held ? 1 : 0.55));
        while (fireCd <= 0) {
          fireCd += interval;
          shotAcc += S.stats.perShot;
          var n = shotAcc | 0; shotAcc -= n;
          for (k = 0; k < n; k++) {
            if (S.nPlayer >= MAXPLAYER) break;
            // tight blob: two staggered rows, slight fan so the cluster stays together while flying
            var off = (k - (n - 1) / 2) * 2.2 + (rand() - 0.5) * 1.2;
            j = spawn(1, K_NORMAL, S.cannonX + off, 5 + (k & 1) * 2.2 + rand() * 1.2, 1, 1, 1.9, 56 + rand() * 3, 0);
            if (j >= 0) { uvx[j] = off * 0.7; S.fired++; if (S.charge < 100) S.charge = Math.min(100, S.charge + 0.1 * S.stats.charge); }
          }
          S.recoil = 1;
          emit('shoot', S.cannonX, 4);
        }
        // spawning
        var L = S.level, ramp = 1 + S.time / 100;
        for (k = 0; k < S.bases.length; k++) {
          b = S.bases[k]; if (b.hp <= 0) continue;
          b.acc += b.rate * ramp * dt;
          while (b.acc >= 1) { b.acc -= 1; spawnEnemy(b, pickKind(), 0); }
          drainQueue(b, dt);
          var frac = b.hp / b.max;
          if (b.rage < 3 && frac < 1 - 0.25 * (b.rage + 1)) {
            b.rage++;
            for (j = 0; j < b.rageN; j++) b.q[0]++;
            if (L.boss && b.rage === 2) spawnEnemy(b, K_GIANT, Math.round(L.giants[0].hp * 0.8));
            text((b.x0 + b.x1) / 2, LL - 14, 'RAGE!', 1, 1.2); b.flash = 1; S.shake = Math.max(S.shake, 0.3); emit('rage');
          }
        }
        while (burstI < L.bursts.length && L.bursts[burstI].t <= S.time) {
          var bu = L.bursts[burstI++];
          sumBurst(bu.b, bu.n, bu.kind === 'runner' ? K_RUNNER : bu.kind === 'tank' ? K_TANK : K_NORMAL);
          emit('wave');
        }
        while (giantI < L.giants.length && L.giants[giantI].t <= S.time) {
          var gi = L.giants[giantI++], gb = S.bases[Math.min(gi.b, S.bases.length - 1)];
          if (gb.hp <= 0) for (k = 0; k < S.bases.length; k++) if (S.bases[k].hp > 0) gb = S.bases[k];
          if (gb.hp > 0) { spawnEnemy(gb, K_GIANT, gi.hp); emit('giantspawn'); text((gb.x0 + gb.x1) / 2, LL - 16, L.boss ? 'BOSS!' : 'GIANT!', 1, 1.4); }
        }
      }
      // enemy grid
      for (i = 0; i < GW * GH; i++) gHead[i] = -1;
      for (i = 0; i < hi; i++) {
        if (alive[i] !== 2) continue;
        var cx = (ux[i] / CS) | 0, cy = (uy[i] / CS) | 0;
        if (cx < 0) cx = 0; else if (cx >= GW) cx = GW - 1;
        if (cy < 0) cy = 0; else if (cy >= GH) cy = GH - 1;
        var cell = cy * GW + cx; gNext[i] = gHead[cell]; gHead[cell] = i;
      }
      for (i = 0; i < PGW * PGH; i++) pHead[i] = -1;
      for (i = 0; i < hi; i++) {
        if (alive[i] !== 1 || ukind[i] !== K_NORMAL) continue;
        var qx = (ux[i] / PCS) | 0, qy = (uy[i] / PCS) | 0;
        if (qx < 0) qx = 0; else if (qx >= PGW) qx = PGW - 1;
        if (qy < 0) qy = 0; else if (qy >= PGH) qy = PGH - 1;
        pNext[i] = pHead[qy * PGW + qx]; pHead[qy * PGW + qx] = i;
      }
      // units
      for (i = 0; i < hi; i++) {
        var team = alive[i];
        if (!team) continue;
        if (uhit[i] > 0) uhit[i] -= dt;
        if (team === 2) {
          uy[i] -= uvy[i] * dt;
          if (ukind[i] === K_GIANT) { if (uy[i] < LL - 20) ux[i] += Math.max(-4, Math.min(4, S.cannonX - ux[i])) * dt; }
          else { var wx = S.cannonX + Math.sin(uph[i] * 7.3) * 11 - ux[i]; ux[i] += Math.max(-9, Math.min(9, wx * 0.5)) * dt + Math.sin(S.time * 2.3 + uph[i]) * 2 * dt; }
          if (ux[i] < 2) ux[i] = 2; else if (ux[i] > 98) ux[i] = 98;
          if (uy[i] <= BREACH) {
            var gnt = ukind[i] === K_GIANT;
            S.leaks++;
            if (gnt) S.shield = 0; else { S.leakAcc++; if (S.leakAcc >= LEAK_PIP) { S.leakAcc -= LEAK_PIP; S.shield--; } }
            S.shake = 1; S.red = 1;
            burst(ux[i], 3, 2, 10, 1, 40); emit('breach', ux[i], 3);
            kill(i);
            if (S.shield <= 0 && !S.over) lose();
          }
          continue;
        }
        // player unit
        var oy = uy[i], champ = ukind[i] === K_CHAMP;
        var pcx = (ux[i] / CS) | 0, pcy = (oy / CS) | 0, best = -1, bd = 1e9;
        if (S.nEnemy > 0 && !S.over) {
          for (var gy = pcy - 1; gy <= pcy + 1; gy++) {
            if (gy < 0 || gy >= GH) continue;
            for (var gx = pcx - 1; gx <= pcx + 1; gx++) {
              if (gx < 0 || gx >= GW) continue;
              j = gHead[gy * GW + gx];
              while (j >= 0) {
                if (alive[j] === 2) {
                  var ex = ux[j] - ux[i], ey = uy[j] - oy, d = ex * ex + ey * ey;
                  if (champ) {
                    var rr = ur[i] + ur[j];
                    if (d < rr * rr && uhp[i] > 0) {
                      uhp[j] -= udm[i]; uhp[i] -= 1; uhit[j] = 0.12;
                      burst(ux[j], uy[j], 1, 2, ukind[j] === K_GIANT ? 3 : 1, 22);
                      if (uhp[j] <= 0) popEnemy(j);
                      if (ukind[j] === K_GIANT) uhp[i] -= 2;
                    }
                  } else if (d < bd && ey > -2) { bd = d; best = j; }
                }
                j = gNext[j];
              }
            }
          }
        }
        if (champ) {
          if (uhp[i] <= 0) { burst(ux[i], uy[i], 3, 30, 5, 50); S.shake = Math.max(S.shake, 0.4); emit('pop', ux[i], uy[i]); kill(i); continue; }
          uy[i] += uvy[i] * dt;
        } else if (best >= 0) {
          j = best;
          var rr2 = ur[i] + ur[j];
          if (bd < rr2 * rr2) {
            uhp[j] -= udm[i]; uhp[i] -= udm[j]; uhit[j] = 0.1;
            var pxm = (ux[i] + ux[j]) * 0.5, pym = (uy[i] + uy[j]) * 0.5;
            if (S.nEnemy + S.nPlayer < 900 || rand() < 0.4) burst(pxm, pym, 1, 3, uhp[j] <= 0 || ukind[j] !== K_GIANT ? (rand() < 0.5 ? 2 : 1) : 3, 18);
            emit('pop', pxm, pym);
            if (uhp[j] <= 0) popEnemy(j);
            if (uhp[i] <= 0) { kill(i); continue; }
          } else {
            var eyy = uy[j] - uy[i]; if (eyy < 3) eyy = 3;
            var want = (ux[j] - ux[i]) * (uvy[i] + uvy[j]) / eyy; if (want > 70) want = 70; else if (want < -70) want = -70;
            uvx[i] += (want - uvx[i]) * Math.min(1, dt * 12);
          }
          uy[i] += uvy[i] * dt;
        } else {
          uvx[i] *= 1 - Math.min(1, dt * 3);
          uy[i] += uvy[i] * dt;
        }
        ux[i] += uvx[i] * dt;
        if (!champ) {
          // flocking: soft separation from nearby friends so clusters read as a crowd, not a line
          var sx = 0, sy = 0, sn = 0, qcx = (ux[i] / PCS) | 0, qcy = (uy[i] / PCS) | 0;
          for (var hy = qcy - 1; hy <= qcy + 1 && sn < 14; hy++) {
            if (hy < 0 || hy >= PGH) continue;
            for (var hx = qcx - 1; hx <= qcx + 1; hx++) {
              if (hx < 0 || hx >= PGW) continue;
              j = pHead[hy * PGW + hx];
              while (j >= 0 && sn < 14) {
                if (j !== i) {
                  var ddx = ux[i] - ux[j], ddy = uy[i] - uy[j], dd = ddx * ddx + ddy * ddy;
                  if (dd < SEP * SEP) {
                    if (dd < 0.0004) { sx += (rand() - 0.5) * SEP; sy += (rand() - 0.5) * SEP; }
                    else { dd = Math.sqrt(dd); var pf = (SEP - dd) / dd; sx += ddx * pf; sy += ddy * pf; }
                  }
                  sn++;
                }
                j = pNext[j];
              }
            }
          }
          ux[i] += sx * dt * 11; uy[i] += sy * dt * 5;
        }
        if (ux[i] < 1.5) {
          ux[i] = 1.5;
          // left wall: brushing it gives +1 unit per touching unit, capped per level (mini-reward for aiming wide)
          if (!champ && ((ugm[i] >>> 31) & 1) === 0) {
            ugm[i] |= 0x80000000;
            if (S.wallUsed < WALL_CAP && S.nPlayer < MAXPLAYER) {
              j = spawn(1, K_NORMAL, 3.2, uy[i] + 1, 1, 1, 1.9, uvy[i], ugm[i]);
              if (j >= 0) { S.wallUsed++; uvx[j] = 6; burst(2, uy[i], 1, 2, 6, 10); if (S.time - (S.wallTxt || -1) > 0.35) { S.wallTxt = S.time; text(6, uy[i] + 3, '+1', 6, 0.9); } }
            }
          }
        } else if (ux[i] > 98.5) ux[i] = 98.5;
        // gates
        var ny = uy[i];
        for (k = 0; k < S.gates.length; k++) {
          g = S.gates[k];
          if (oy < g.y && ny >= g.y && ((ugm[i] >>> g.id) & 1) === 0 && ux[i] >= g.x0 && ux[i] <= g.x1) {
            ugm[i] |= (1 << g.id);
            applyGate(i, g);
            if (!alive[i]) break;
          }
        }
        if (!alive[i]) continue;
        // base
        if (ny >= LL - 2) {
          var hitb = null;
          for (k = 0; k < S.bases.length; k++) { b = S.bases[k]; if (b.hp > 0 && ux[i] >= b.x0 - 1 && ux[i] <= b.x1 + 1) { hitb = b; break; } }
          if (hitb) hitBase(i, hitb); else burst(ux[i], ny, 1, 2, 2, 12);
          kill(i);
        }
      }
      // particles
      for (i = 0; i < MAXP; i++) {
        if (plife[i] <= 0) continue;
        plife[i] -= dt; px[i] += pvx[i] * dt; py[i] += pvy[i] * dt; pz[i] += pvz[i] * dt; pvz[i] -= 55 * dt;
        if (pz[i] < 0) { pz[i] = 0; pvz[i] *= -0.3; }
      }
      for (i = 0; i < MAXT; i++) if (tlife[i] > 0) { tlife[i] -= dt * 1.1; ty[i] += 14 * dt; }
      if (S.nPlayer + S.nEnemy > S.peak) S.peak = S.nPlayer + S.nEnemy;
      if (S.nPlayer > S.peakUnits) S.peakUnits = S.nPlayer;
      if (!S.over && S.baseHp() <= 0) win();
    }

    function popAll() {
      for (var i = 0; i < hi; i++) if (alive[i] === 2) { if (i % 2 === 0) burst(ux[i], uy[i], 1, 2, 1, 30); kill(i); }
    }
    function win() {
      S.over = true; S.result = 'win'; S.winTime = S.time; popAll(); S.shake = 1; S.flash = 0.6; emit('win');
    }
    function lose() {
      S.over = true; S.result = 'lose'; S.shake = 1.2; emit('lose');
    }
    S.winNow = function () { if (S.over) return; for (var i = 0; i < S.bases.length; i++) S.bases[i].hp = 0; win(); };
    S.loseNow = function () { if (S.over) return; S.shield = 0; lose(); };
    S.stress = function (n) {
      for (var i = 0; i < n; i++) {
        spawn(i % 2 ? 1 : 2, K_NORMAL, 10 + rand() * 80, 20 + rand() * 120, 1, 1, 1.9, i % 2 ? 0.5 : 0.5, 0);
      }
    };

    S.update = function (dt) {
      acc += Math.min(dt, 0.05);
      var n = 0;
      while (acc >= STEP && n < 4) { step(); acc -= STEP; n++; }
      if (acc > STEP) acc = 0;
    };
    S.step = step;
    return S;
  }

  return { createSim: createSim, LW: LW, LL: LL, STEP: STEP, K: { NORMAL: K_NORMAL, CHAMP: K_CHAMP, GIANT: K_GIANT, RUNNER: K_RUNNER, TANK: K_TANK } };
});
