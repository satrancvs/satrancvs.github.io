import fs from 'fs';
import { Chess } from 'chess.js';
import { splitChunks } from '../src/lib/split-chunks.js';
const FIG = { '♔': 'K', '♕': 'Q', '♖': 'R', '♗': 'B', '♘': 'N' };
const SAN = /^(O-O(-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?)[+#]?$/;
const strip = (s) => s.replace(/[+#!?]+$/, '');
const normText = (t) => t.replace(/[♔♕♖♗♘]/g, (c) => FIG[c]).replace(/…/g, '...').replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O');
function proseRuns(text) {
  const raw = normText(text).replace(/[,;:]/g, ' ').replace(/[()[\]]/g, ' | ').split(/\s+/).filter(Boolean);
  const isSan = (x) => SAN.test(strip(x.replace(/[!?]+$/, '')));
  const toks = raw.map((x, i) => (/^\d{1,3}$/.test(x) && raw[i + 1] && isSan(raw[i + 1]) ? x + '.' : x))
    .map((x) => x.replace(/[’'][a-zçğıöşüâî]+$/i, '').replace(/[.]+$/, (d) => (/^\d+$/.test(x.slice(0, -d.length)) ? d : '')));
  const runs = [];
  for (let k = 0; k < toks.length; k++) {
    const mm = toks[k].match(/^(\d+)(\.\.\.|\.)(.*)$/);
    if (!mm) continue;
    const sans = []; let j = k; let lastPly = null; const first = toks[k];
    while (j < toks.length) {
      const nm = toks[j].match(/^(\d+)(\.\.\.|\.)/);
      let tk = toks[j].replace(/^\d+(\.\.\.|\.)/, '');
      if (nm) { const ply = 2 * parseInt(nm[1], 10) - (nm[2] === '.' ? 1 : 0); if (lastPly !== null && ply !== lastPly + 1) break; lastPly = ply - 1; }
      if (!tk) { j++; continue; }
      tk = tk.replace(/[!?]+$/, '').replace(/[⩲⩱∓±=+\-−]+$/, (x) => (/^[+#]$/.test(x) ? x : ''));
      if (SAN.test(tk)) { sans.push(strip(tk)); lastPly = (lastPly ?? 0) + 1; j++; } else break;
    }
    if (sans.length) runs.push({ sans, first });
    k = Math.max(k, j - 1);
  }
  return runs;
}
const md = fs.readFileSync('src/content/karlsruhe-ve-yol-ayrimlari.md', 'utf8');
const ch = splitChunks(md); const gi = ch.findIndex((c) => c.startsWith('1. c4'));
const mt = ch[gi];
// main line walk (skip variations)
const re = /\{[^}]*\}|\(|\)|[^\s(){}]+/g; let m; let depth = 0; const g = new Chess(); const ply = []; // {n, san, fenBefore, fenAfter, comments:[]}
while ((m = re.exec(mt))) { const t = m[0];
  if (t === '(') { depth++; continue; } if (t === ')') { depth--; continue; }
  if (depth) { if (t[0]==='{') console.log('VAR COMMENT skipped'); continue; }
  if (t[0] === '{') { ply[ply.length - 1].comments.push(t.slice(1, -1)); continue; }
  if (/^\$\d+$/.test(t) || /^(1-0|0-1)$/.test(t)) continue;
  const san = t.replace(/^\d+(\.\.\.|\.)/, '').replace(/[!?]+$/, ''); if (!san) continue;
  const fb = g.fen(); g.move(san, { strict: true }); ply.push({ n: ply.length + 1, san, fb, fa: g.fen(), comments: [] });
}
const positions = ply.map((p) => p.fb); positions.push(ply[ply.length-1].fa);
const play = (fen, sans) => { try { const c = new Chess(fen); for (const s of sans) c.move(s, { strict: true }); return true; } catch { return false; } };
const label = (p) => `${Math.ceil(p.n/2)}${p.n%2? '.':'...'} ${p.san}`;
for (const p of ply) for (const c of p.comments) {
  const runs = proseRuns(c).filter(r=>r.sans.length>=1);
  for (const r of runs) {
    const here = [p.fa, p.fb].some((f) => play(f, r.sans));
    const ok = ply.map((q,i)=>({q,i})).filter(({q}) => play(q.fb, r.sans)).map(({q})=>label(q));
    console.log(`${label(p).padEnd(10)} | ${r.first.padEnd(8)} ${r.sans.join(' ')}  ${r.sans.length<2?'(single)':''}\n     playable-from-before: ${ok.join(', ')}`);
  }
}
