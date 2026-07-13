#!/usr/bin/env node
// Deterministic frame-by-frame recorder for demo animations built on the
// animation-skeleton.html machinery (window.__DURATION + window.__seek).
//
// Usage:
//   node record-frames.js <animation.html> <framesDir> [--fps 30] [--duration S] [--spots "3,11,20"]
//
//   --spots  capture only the listed timestamps (seconds) as spot_<t>s.png
//            — ALWAYS do this first and view the images before a full run.
//   --fps    frames per second for the full run (default 30)
//   --duration  override seconds if the page doesn't set window.__DURATION
//
// Requires: playwright (npm i playwright) with chromium installed.
// Encode afterwards:
//   ffmpeg -y -framerate 30 -i <framesDir>/f%04d.png -c:v libx264 -preset slow \
//     -crf 18 -pix_fmt yuv420p -movflags +faststart demo.mp4
const path = require('path');
const fs = require('fs');
// Resolve playwright from the skill dir OR the project you run this from.
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  const { createRequire } = require('module');
  ({ chromium } = createRequire(path.join(process.cwd(), 'package.json'))('playwright'));
}

const args = process.argv.slice(2);
const positional = args.filter(a => !a.startsWith('--'));
const flag = name => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};
const [htmlPath, framesDir] = positional;
if (!htmlPath || !framesDir) {
  console.error('usage: node record-frames.js <animation.html> <framesDir> [--fps 30] [--duration S] [--spots "3,11,20"]');
  process.exit(1);
}
const fps = Number(flag('fps') || 30);
const spots = flag('spots') ? flag('spots').split(',').map(Number) : null;
fs.mkdirSync(framesDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(htmlPath) + '#capture', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const duration = Number(flag('duration') || await page.evaluate(() => window.__DURATION));
  if (!duration || Number.isNaN(duration)) {
    console.error('No duration: set window.__DURATION in the page or pass --duration S');
    process.exit(1);
  }

  if (spots) {
    for (const t of spots) {
      await page.evaluate(ms => window.__seek(ms), t * 1000);
      await page.screenshot({ path: path.join(framesDir, `spot_${String(t).replace('.', '_')}s.png`) });
      console.log('spot', t);
    }
  } else {
    const total = Math.round(fps * duration);
    const pad = String(total - 1).length > 4 ? String(total - 1).length : 4;
    for (let i = 0; i < total; i++) {
      await page.evaluate(ms => window.__seek(ms), i * 1000 / fps);
      await page.screenshot({ path: path.join(framesDir, `f${String(i).padStart(pad, '0')}.png`) });
      if (i % (fps * 5) === 0) console.log(`frame ${i}/${total}`);
    }
    console.log('done', total, 'frames at', fps, 'fps =', duration, 's');
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
