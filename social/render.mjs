// Kullanım: node social/render.mjs social/instagram/01-tanitim   (slides.html -> 01.png … NN.png, 1080×1350)
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const dir = path.resolve(process.argv[2]);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 1500 } });
await page.goto('file://' + path.join(dir, 'slides.html'), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const fonts = await page.evaluate(() => ['Fraunces', 'Newsreader', 'JetBrains Mono'].map((f) => [f, document.fonts.check(`16px "${f}"`)]));
console.log('fonts', JSON.stringify(fonts));
const slides = await page.$$('.slide');
for (let i = 0; i < slides.length; i++) await slides[i].screenshot({ path: path.join(dir, String(i + 1).padStart(2, '0') + '.png') });
await browser.close();
