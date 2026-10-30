// X/Twitter geniş paylaşım kartı (1200 × 628, twitter:image): scripts/og-images.json -> public/og-x/<id>.jpg (+ home.jpg).
// Solda yazının fotoğrafı (aynı odak noktasıyla kare kırpılır), sağda dergi adı. Kare og/<id>.jpg (WhatsApp/Facebook) aynen kalır.
// Kullanım: node scripts/make-og-x.mjs   (Playwright; yazı tipleri Google Fonts'tan)
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/og-images.json'), 'utf8'));
const color = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/image-color.json'), 'utf8')).colors || []);
const out = path.join(ROOT, 'public/og-x');
fs.mkdirSync(out, { recursive: true });

const cards = Object.entries(cfg).filter(([k]) => k !== '_').map(([id, [file, fx, fy]]) => ({
  id, src: path.join(ROOT, 'public/images', file), pos: `${fx * 100}% ${fy * 100}%`, gray: !color.has(file),
}));
cards.push({ id: 'home', src: path.join(ROOT, 'public/favicon.svg'), pos: '50% 50%', gray: false, logo: true });

const html = (c) => `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&family=JetBrains+Mono:wght@400&display=swap">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:1200px;height:628px;background:#0E0C0A;color:#F1E9DC;display:flex;overflow:hidden}
.ph{width:628px;height:628px;flex:none;background:#17130F}
.ph img{width:100%;height:100%;object-fit:cover;object-position:${c.pos};display:block;${c.gray ? 'filter:grayscale(1);' : ''}}
.tx{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 56px 0 64px}
.m{font-family:'JetBrains Mono',monospace;font-size:17px;letter-spacing:.2em;text-transform:uppercase;color:#C8893E}
h1{font-family:'Fraunces',serif;font-weight:300;font-size:118px;line-height:.92;letter-spacing:-.04em;margin:28px 0 0;font-variation-settings:'opsz' 72}
h1 em{display:block;color:#C8893E}
</style></head><body>
<div class="ph"><img style="${c.logo ? 'object-fit:contain;padding:72px;background:#0E0C0A' : ''}" src="file://${c.src}"></div>
<div class="tx"><span class="m">Dijital satranç dergisi</span><h1>Satranç<em>vs.</em></h1></div>
</body></html>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 628 } });
for (const c of cards) {
  const tmp = path.join(os.tmpdir(), 'og-x.html');
  fs.writeFileSync(tmp, html(c));
  await page.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, c.id + '.jpg'), type: 'jpeg', quality: 88 });
  console.log(c.id);
}
await browser.close();
