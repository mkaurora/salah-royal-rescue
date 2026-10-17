/* Generates the PNG app icons from an inline SVG using headless Chromium (Playwright).
 * Run: npm run icons   (icons are committed, so this is only needed to change the artwork) */
'use strict';
const path = require('path');
const { chromium } = require('playwright');

function gear(cx, cy, r, teeth, fill, stroke) {
  let d = '';
  const n = teeth * 2;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, rr = i % 2 ? r * 0.8 : r;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a0) * rr).toFixed(1) + ' ' + (cy + Math.sin(a0) * rr).toFixed(1) +
      'L' + (cx + Math.cos(a1) * rr).toFixed(1) + ' ' + (cy + Math.sin(a1) * rr).toFixed(1);
  }
  return `<path d="${d}Z" fill="${fill}" stroke="${stroke}" stroke-width="10" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="${r * 0.32}" fill="#fff3c4" stroke="${stroke}" stroke-width="10"/>`;
}

// 512x512 artwork. `scale` shrinks the character for the maskable safe zone.
function iconSVG(scale, rounded) {
  const s = scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5cc8ff"/><stop offset="1" stop-color="#2f6ff0"/></linearGradient>
    <linearGradient id="head" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ef0ff"/><stop offset="1" stop-color="#2fa8e0"/></linearGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7b0"/><stop offset="1" stop-color="#ffe14d" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  <circle cx="256" cy="230" r="230" fill="rgba(255,255,255,.08)"/>
  <g transform="translate(256 270) scale(${s}) translate(-256 -270)">
    <g opacity=".95">${gear(392, 120, 70, 10, '#ffc83d', '#b07a00')}</g>
    <g opacity=".95">${gear(112, 400, 60, 9, '#ff8a5c', '#a3361d')}</g>
    <line x1="256" y1="110" x2="256" y2="60" stroke="#1b6f8f" stroke-width="16" stroke-linecap="round"/>
    <circle cx="256" cy="56" r="44" fill="url(#glow)"/>
    <circle cx="256" cy="56" r="22" fill="#ffe14d" stroke="#c99a00" stroke-width="8"/>
    <rect x="90" y="196" width="40" height="96" rx="20" fill="#ff9f1c" stroke="#c97a00" stroke-width="10"/>
    <rect x="382" y="196" width="40" height="96" rx="20" fill="#ff9f1c" stroke="#c97a00" stroke-width="10"/>
    <rect x="112" y="106" width="288" height="250" rx="84" fill="url(#head)" stroke="#1b6f8f" stroke-width="12"/>
    <rect x="146" y="146" width="220" height="168" rx="60" fill="#173a5e"/>
    <ellipse cx="200" cy="168" rx="30" ry="10" fill="rgba(255,255,255,.25)"/>
    <ellipse cx="210" cy="222" rx="26" ry="32" fill="#7ff3ff"/>
    <ellipse cx="302" cy="222" rx="26" ry="32" fill="#7ff3ff"/>
    <circle cx="218" cy="208" r="9" fill="#fff"/><circle cx="310" cy="208" r="9" fill="#fff"/>
    <circle cx="170" cy="272" r="17" fill="#ff7aa2" opacity=".8"/><circle cx="342" cy="272" r="17" fill="#ff7aa2" opacity=".8"/>
    <path d="M222 268 q34 32 68 0" fill="none" stroke="#7ff3ff" stroke-width="13" stroke-linecap="round"/>
    <rect x="176" y="356" width="160" height="96" rx="36" fill="#ffb02e" stroke="#c97a00" stroke-width="12"/>
    <path d="M256 424 l-22 -22 a13 13 0 0 1 22 -16 a13 13 0 0 1 22 16z" fill="#ff4f6d"/>
  </g>
</svg>`;
}

(async () => {
  const out = path.resolve(__dirname, '..', 'icons');
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const jobs = [
    { file: 'icon-512.png', size: 512, svg: iconSVG(1, true), transparent: true },
    { file: 'icon-192.png', size: 192, svg: iconSVG(1, true), transparent: true },
    { file: 'icon-maskable-512.png', size: 512, svg: iconSVG(0.78, false) },
    { file: 'icon-maskable-192.png', size: 192, svg: iconSVG(0.78, false) },
    { file: 'apple-touch-icon.png', size: 180, svg: iconSVG(0.92, false) },
    { file: 'favicon-32.png', size: 32, svg: iconSVG(1, true), transparent: true }
  ];
  for (const j of jobs) {
    await page.setViewportSize({ width: j.size, height: j.size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${j.svg.replace('width="512" height="512"', `width="${j.size}" height="${j.size}"`)}</body></html>`);
    await page.screenshot({ path: path.join(out, j.file), omitBackground: !!j.transparent, clip: { x: 0, y: 0, width: j.size, height: j.size } });
    console.log('wrote', j.file);
  }
  await browser.close();
})();
