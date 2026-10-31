// Renders every published article in a real browser (against `vite preview` on :4173, run `pnpm build` first)
// and fails on anything ChessPublica reports: "Error parsing PGN", invalid moves, a raw NAG code such as $132, or the red ⚠ marker that the
// patched bundle shows for an unplayable move line in a comment. Usage: `pnpm check:render`.
// Set CHROMIUM_PATH to use a specific browser binary.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const base = process.env.BASE_URL ?? 'http://localhost:4173';
const articles = JSON.parse(fs.readFileSync(new URL('../src/data/articles.json', import.meta.url), 'utf8')).filter((a) => !a.draft && a.slug);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
let failures = 0;
for (const a of articles) {
  await page.goto(`${base}/${a.slug}#check`);
  await page.waitForTimeout(8000);
  const bad = await page.evaluate(() => [
    ...[...document.querySelectorAll('.pgn-error, .pgn-invalid-move, .cp-game mark, pgn-player .player-error')].map((e) => e.textContent.trim().slice(0, 160)),
    // A NAG code ChessPublica does not know ($132 …) is printed as is: add it to NAG_TO_GLYPH (helpers.js and the bundle).
    ...[...document.body.textContent.matchAll(/.{0,25}\$\d+.{0,15}/g)].map((m) => `unknown NAG code: ${m[0]}`),
  ]);
  if (bad.length) { failures += bad.length; console.error(`ERROR ${a.slug}:\n  ${bad.join('\n  ')}`); }
  else console.log(`ok    ${a.slug}`);
}
await browser.close();
process.exit(failures ? 1 : 0);
