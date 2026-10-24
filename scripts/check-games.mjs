// Validates every chess game in src/content/*.md so that nothing in an article is lost silently
// (ChessPublica drops or mangles text it cannot parse). Run: `pnpm check:games` (also part of `pnpm test`).
//
// Errors (fail the build):
//  - unbalanced / nested `{ }` or `( )` in movetext;
//  - an illegal move anywhere (main line, variations, nested variations);
//  - a `(12. Ne2 ...)` move line inside a comment that is illegal from the comment's position
//    (ChessPublica would delete it; the patched bundle shows a red ⚠ instead);
//  - a move line in a comment prose (2+ numbered plies) that is not a variation / main-line excerpt
//    of the same game: every playable line must be a real variation. Genuine exceptions (move-order
//    notes from the start position, known typos waiting for the author) go to `check-games.allow.json`;
//  - a game header with no movetext (and no `[View "player"]`), `[#]` in a `<pgn>` game, `[Round "?"]`.
// Warnings (printed with --warnings): single numbered moves in comments that are not in any line.
import { Chess } from 'chess.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitChunks } from '../src/lib/split-chunks.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIG = { '♔': 'K', '♕': 'Q', '♖': 'R', '♗': 'B', '♘': 'N' };
const SAN = /^(O-O(-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?)[+#]?$/;
const strip = (s) => s.replace(/[+#!?]+$/, '');
const normText = (t) => t.replace(/[♔♕♖♗♘]/g, (c) => FIG[c]).replace(/…/g, '...').replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O');

const allowPath = path.join(ROOT, 'scripts/check-games.allow.json');
const ALLOW = fs.existsSync(allowPath) ? JSON.parse(fs.readFileSync(allowPath, 'utf8')) : [];
const allowed = (file, run) => ALLOW.some((a) => a.file === file && a.run === run);

const tagOf = (hdr, name) => (hdr.match(new RegExp(`\\[${name} "([^"]*)"\\]`)) || [])[1];

// Walks one movetext. Returns { errors, lines: SAN[][], comments: [{text, depth, fenAfter, fenBefore, lastColor}] }.
function walk(movetext, fen, where) {
  const errors = [];
  const lines = [];
  const comments = [];
  const start = fen || new Chess().fen();
  let cur = new Chess(start);
  let before = start;
  let line = [];
  lines.push(line);
  const stack = [];
  const re = /\{[^}]*\}|\{|\}|\(|\)|[^\s(){}]+/g;
  let m;
  while ((m = re.exec(movetext))) {
    const t = m[0];
    if (t === '{' || t === '}') { errors.push(`${where}: unbalanced "${t}" near "${movetext.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, ' ')}"`); continue; }
    if (t[0] === '{') {
      const body = t.slice(1, -1);
      if (body.includes('{')) errors.push(`${where}: nested "{" inside a comment: "${body.slice(0, 60).replace(/\s+/g, ' ')}…"`);
      comments.push({ text: body, depth: stack.length, fenAfter: cur.fen(), fenBefore: before, last: line[line.length - 1] });
      continue;
    }
    if (t === '(') {
      if (!line.length) errors.push(`${where}: variation with no preceding move`);
      stack.push({ cur, before, line });
      cur = new Chess(before);
      line = line.slice(0, -1); // a variation replaces the last move: keep the path from the start
      lines.push(line);
      continue;
    }
    if (t === ')') {
      if (!stack.length) { errors.push(`${where}: unbalanced ")"`); continue; }
      ({ cur, before, line } = stack.pop());
      continue;
    }
    if (/^\$\d+$/.test(t) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)) continue;
    let san = t.replace(/^\d+(\.\.\.|\.)/, '');
    if (!san) continue;
    san = san.replace(/^0-0-0/, 'O-O-O').replace(/^0-0/, 'O-O').replace(/[!?]+$/, '');
    before = cur.fen();
    try { cur.move(san, { strict: true }); line.push(strip(san)); }
    catch { errors.push(`${where}: illegal move "${t}" (position ${before})`); return { errors, lines, comments, broken: true }; }
  }
  if (stack.length) errors.push(`${where}: ${stack.length} unclosed "("`);
  return { errors, lines, comments };
}

const playFrom = (fen, sans) => { try { const g = new Chess(fen); for (const s of sans) g.move(s, { strict: true }); return true; } catch { return false; } };

// Prose runs: numbered SAN tokens in comment text (figurines normalised). Returns [{ sans, numbered }].
function proseRuns(text) {
  const raw = normText(text).replace(/[,;:]/g, ' ').replace(/[()[\]]/g, ' | ').split(/\s+/).filter(Boolean);
  // Book style "9 e5" (number without a dot) counts as a numbered move when a SAN token follows.
  const isSan = (x) => SAN.test(strip(x.replace(/[!?]+$/, '')));
  const toks = raw.map((x, i) => (/^\d{1,3}$/.test(x) && raw[i + 1] && isSan(raw[i + 1]) ? x + '.' : x))
    .map((x) => x.replace(/[’'][a-zçğıöşüâî]+$/i, '').replace(/[.]+$/, (d) => (/^\d+$/.test(x.slice(0, -d.length)) ? d : '')));
  const runs = [];
  for (let k = 0; k < toks.length; k++) {
    const mm = toks[k].match(/^(\d+)(\.\.\.|\.)(.*)$/);
    if (!mm) continue;
    const sans = [];
    let j = k;
    let lastPly = null;
    while (j < toks.length) {
      const nm = toks[j].match(/^(\d+)(\.\.\.|\.)/);
      let tk = toks[j].replace(/^\d+(\.\.\.|\.)/, '');
      if (nm) {
        const ply = 2 * parseInt(nm[1], 10) - (nm[2] === '.' ? 1 : 0);
        if (lastPly !== null && ply !== lastPly + 1) break; // a new, unrelated line starts here
        lastPly = ply - 1;
      }
      if (!tk) { j++; continue; }
      tk = tk.replace(/[!?]+$/, '').replace(/[⩲⩱∓±=+\-−]+$/, (x) => (/^[+#]$/.test(x) ? x : ''));
      if (SAN.test(tk)) { sans.push(strip(tk)); lastPly = (lastPly ?? 0) + 1; j++; } else break;
    }
    if (sans.length) runs.push({ sans, from: k });
    k = Math.max(k, j - 1);
  }
  return runs;
}

const covered = (lines, sans) => lines.some((l) => { for (let i = 0; i + sans.length <= l.length; i++) { if (sans.every((s, n) => l[i + n] === s)) return true; } return false; });

export function checkContent(dir = path.join(ROOT, 'src/content')) {
  const errors = [];
  const warnings = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    const chunks = splitChunks(fs.readFileSync(path.join(dir, file), 'utf8'));
    const gameMoves = []; // for "[View player]" copies
    for (let i = 0; i < chunks.length; i++) {
      const hdr = chunks[i];
      if (!/^\[Event /.test(hdr)) continue;
      const white = tagOf(hdr, 'White'); const black = tagOf(hdr, 'Black');
      const where = `${file}: ${white ?? '?'} – ${black ?? '?'}`;
      const fen = tagOf(hdr, 'FEN');
      const isPlayer = ['player', 'study'].includes(tagOf(hdr, 'View'));
      if (tagOf(hdr, 'Round') === '?') errors.push(`${where}: [Round "?"] prints "? . tur"; remove the tag`);
      const next = chunks[i + 1] ?? '';
      const hasMoves = /^(\d+\s?\.|\{)/.test(next);
      if (!hasMoves) {
        if (!isPlayer) errors.push(`${where}: game header without movetext (the game would be lost)`);
        else if (!gameMoves.some((g) => g.white === white && g.black === black && g.date === tagOf(hdr, 'Date'))) errors.push(`${where}: [View "player"] without movetext and no earlier copy of the game`);
        continue;
      }
      i++;
      gameMoves.push({ white, black, date: tagOf(hdr, 'Date') });
      if (!isPlayer && /\[#\]/.test(next)) errors.push(`${where}: [#] shows as text in a <pgn> game; use [D]`);
      const w = walk(next, fen, where);
      errors.push(...w.errors);
      if (w.broken) continue;
      for (const c of w.comments) {
        // (a) move-number-led parentheses inside a comment: ChessPublica plays them (or drops them).
        for (const pm of c.text.matchAll(/\(\s*\d+\.+[^()]*\)/g)) {
          const sans = proseRuns(pm[0])[0]?.sans ?? [];
          const black = /^\(\s*\d+\.\.\./.test(pm[0]);
          const ok = sans.length && [c.fenAfter, c.fenBefore].some((f) => new Chess(f).turn() === (black ? 'b' : 'w') && playFrom(f, sans));
          if (!ok) errors.push(`${where}: comment contains "${pm[0].slice(0, 70)}", a move line ChessPublica cannot play (it would be deleted)`);
        }
        for (const r of proseRuns(c.text)) {
          if (covered(w.lines, r.sans)) continue;
          const text = r.sans.join(' ');
          if (r.sans.length < 2) { warnings.push(`${where}: single move "${text}" in a comment is not in any line`); continue; }
          if (allowed(file, text)) continue;
          const turn = (f) => new Chess(f).turn();
          const legal = [c.fenAfter, c.fenBefore].some((f) => playFrom(f, r.sans) && (turn(f) === 'w' || turn(f) === 'b'));
          errors.push(`${where}: comment move line "${text}" is ${legal ? 'playable here but not a variation' : 'not playable from the position (typo or wrong move number?)'}`);
        }
      }
    }
  }
  return { errors, warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, warnings } = checkContent();
  if (process.argv.includes('--warnings')) warnings.forEach((w) => console.warn('warn  ' + w));
  errors.forEach((e) => console.error('ERROR ' + e));
  console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}
