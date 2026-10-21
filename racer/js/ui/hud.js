/* Race HUD (DOM over the canvas): health bar, lives, fuel gauge, coins (+ coin-star goal), progress bar with
 * checkpoint flags, timer, boss health, countdown and short callouts. update() runs every frame but only touches
 * the DOM when a shown value changes. Browser only: RR.hud.create(el). */
(function (root) {
  'use strict';
  var RR = root.RR;

  function create(el) {
    function q(s) { return el.querySelector(s); }
    var E = { hp: q('.hp'), hpFill: q('.hp-fill'), lives: q('.lives'), fuel: q('.fuel'), fuelFill: q('.fuel-fill'),
      prog: q('.prog-fill'), marks: q('.marks'), car: q('.car-dot'), timer: q('.timer'), timerB: q('.timer b'),
      boss: q('.boss'), bossIcon: q('.boss-icon'), bossFill: q('.boss-fill'), coins: q('.coins'), coinsB: q('.coins b'),
      goal: q('.coin-goal'), callout: q('.callout'), count: q('.countdown'), track: q('.progress .track') };
    var last = {}, def = null, track = null, goal = 0, marks = [];

    function setup(d, t, carIcon) {
      def = d; track = t; last = {};
      goal = RR.stars.coinsNeeded(d, t.coinTotal);
      E.fuel.hidden = !d.fuel;
      E.timer.hidden = !d.timer;
      E.boss.hidden = !d.boss;
      if (d.boss) E.bossIcon.textContent = d.boss.icon;
      E.car.textContent = carIcon || '🚗';
      E.marks.innerHTML = '';
      marks = t.checkpoints.map(function (z) {
        var i = document.createElement('i');
        i.textContent = '🚩';
        i.style.left = 'calc(4px + (100% - 22px) * ' + (z / t.length).toFixed(4) + ')';
        E.marks.appendChild(i);
        return i;
      });
      E.lives.innerHTML = '';
      for (var k = 0; k < RR.sim.LIVES; k++) { var s = document.createElement('span'); s.textContent = '🚗'; E.lives.appendChild(s); }
      E.callout.className = 'callout';
      E.count.className = 'countdown'; E.count.textContent = '';
    }

    /** Per frame; touches the DOM only when a shown value changed (no closures / allocation). */
    function update(s) {
      var c = s.car, v, i;
      v = Math.round(Math.max(0, Math.min(100, c.health)));
      if (last.hp !== v) {
        last.hp = v;
        E.hpFill.style.transform = 'scaleX(' + (v / 100) + ')';
        E.hp.classList.toggle('low', v <= 30); E.hp.classList.toggle('mid', v > 30 && v <= 60);
      }
      if (last.lives !== c.lives) {
        last.lives = c.lives;
        for (i = 0; i < E.lives.children.length; i++) E.lives.children[i].classList.toggle('gone', i >= c.lives);
      }
      if (def.fuel) {
        v = Math.round(c.fuel);
        if (last.fuel !== v) { last.fuel = v; E.fuelFill.style.transform = 'scaleX(' + (v / 100) + ')'; E.fuel.classList.toggle('low', v <= 25); }
      }
      v = Math.round(Math.max(0, Math.min(1, c.z / track.length)) * 400);
      if (last.prog !== v) {
        last.prog = v;
        E.prog.style.transform = 'scaleX(' + (v / 400) + ')';
        E.car.style.left = 'calc(4px + (100% - 22px) * ' + (v / 400).toFixed(4) + ')';
      }
      if (last.cp !== s.cp) { last.cp = s.cp; for (i = 0; i < marks.length; i++) marks[i].classList.toggle('passed', i < s.cp); }
      if (last.coins !== s.coins) {
        last.coins = s.coins;
        E.coinsB.textContent = s.coins;
        E.goal.textContent = s.coins >= goal ? '⭐' : '/' + goal;
        E.goal.classList.toggle('ok', s.coins >= goal);
        E.coins.classList.remove('pop'); void E.coins.offsetWidth; E.coins.classList.add('pop');
      }
      if (def.timer && s.timeLeft !== null) {
        v = Math.ceil(s.timeLeft);
        if (last.time !== v) { last.time = v; E.timerB.textContent = v; E.timer.classList.toggle('low', v <= 10); }
      }
      if (s.boss && last.boss !== s.boss.hp) { last.boss = s.boss.hp; E.bossFill.style.transform = 'scaleX(' + (s.boss.hp / s.boss.maxHp) + ')'; }
    }

    var cT = 0;
    function callout(text, cls, ms) {
      E.callout.textContent = text;
      E.callout.className = 'callout';
      void E.callout.offsetWidth;
      E.callout.className = 'callout show' + (cls ? ' ' + cls : '');
      clearTimeout(cT);
      cT = setTimeout(function () { E.callout.className = 'callout'; }, ms || 1700);
    }
    function countdown(n) {
      E.count.textContent = n === 0 ? 'GO!' : String(n);
      E.count.className = 'countdown';
      void E.count.offsetWidth;
      E.count.className = 'countdown ' + (n === 0 ? 'go' : 'tick');
    }
    function show(on) { el.hidden = !on; }

    return { setup: setup, update: update, callout: callout, countdown: countdown, show: show, el: el, coinsEl: E.coins };
  }

  RR.hud = { create: create };
})(window);
