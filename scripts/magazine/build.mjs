// Satranç vs. — dijital dergi (PDF) derleyicisi.
// Siteye ait articles.json + src/content/*.md dosyalarından tek bir HTML üretir; PDF'e Chromium ile basılır (print.mjs).
// Kullanım: node build.mjs [--pages '{"kapak":5,...}']   (sayfa numaraları ikinci geçişte içindekilere işlenir)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { marked } from 'marked';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = process.env.REPO || '/home/user/satranckahvesi.github.io';
const OUT = process.env.OUT || HERE;
const { toTypography } = await import(path.join(REPO, 'src/lib/curly.js'));
const meta = JSON.parse(fs.readFileSync(path.join(REPO, 'src/data/articles.json'), 'utf8'));
const imageMeta = JSON.parse(fs.readFileSync(path.join(REPO, 'src/data/image-meta.json'), 'utf8'));
const pagesArg = process.argv.indexOf('--pages');
const PAGES = pagesArg > 0 ? JSON.parse(process.argv[pagesArg + 1]) : {};

const SITE = 'https://satrancvs.com';
const ISSUE = 'Ekim 2026';
const ORDER = ['kapak', 'karlsruhe', 'atfil', 'analiz', 'acilis', 'zebra', 'gomori', 'mugla'];
const FILES = {
  kapak: 'mar-del-plata-1982.md', mugla: 'amman-mugla.md', zebra: 'zebralar-icin-satranc.md',
  karlsruhe: 'karlsruhe-ve-yol-ayrimlari.md', gomori: 'eugen-gomori.md', atfil: 'at-ve-fil.md',
};
const SHORT = { kapak: 'Mar del Plata 1982', karlsruhe: 'Karlsruhe ve yol ayrımları', atfil: 'At ve fil', analiz: 'Lucena köprüsü', acilis: 'Damı Gambiti', zebra: 'Zebralar için Satranç', gomori: '1926: “Nasıl usta oldum?”', mugla: 'Amman’dan Muğla’ya' };

// ---------------------------------------------------------------- yardımcılar
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NAG = { 1: '!', 2: '?', 3: '!!', 4: '??', 5: '!?', 6: '?!', 10: '=', 13: '∞', 14: '⩲', 15: '⩱', 16: '±', 17: '∓', 18: '+−', 19: '−+', 36: '↑', 40: '→', 44: '⯹', 132: '⇆', 146: 'N' };
const GLYPH = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' };
const fg = (g) => `<span class="fg">${g}</span>`;

// Etiketleri yer tutucuya çevirip kıvrık tırnak/tire dönüşümünü yalnızca metne uygular (siteki curly-dom'un karşılığı).
function typo(html) {
  const tags = [];
  const masked = html.replace(/<\/?[a-zA-Z][^>]*>/g, (t) => {
    tags.push(t);
    return `${tags.length - 1}${t.startsWith('</') ? ')' : '('}`;
  });
  return toTypography(masked.replace(/&quot;/g, '"').replace(/&#39;/g, "'")).replace(/(\d+)[()]/g, (_, i) => tags[+i]);
}
// Metindeki hamleleri (Nf3, Bxf3+, Rab1 …) ve satranç figürlerini figürin biçimine çevirir; etiketlerin içine dokunmaz.
const MOVE_RE = /(?<![\p{L}\p{N}])([KQRBN])([a-h1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)(?![\p{L}\p{N}])/gu;
function figurize(html) {
  return html.split(/(<[^>]+>)/g).map((seg) => {
    if (seg.startsWith('<')) return seg;
    return seg.replace(MOVE_RE, (_, p, rest) => fg(GLYPH[p]) + rest.replace(/=([QRBN])/, (__, q) => '=' + fg(GLYPH[q])))
      .replace(/[♔♕♖♗♘♙♚♛♜♝♞♟]/g, (g) => fg(g)).replace(/<span class="fg"><span class="fg">(.)<\/span><\/span>/g, '<span class="fg">$1</span>');
  }).join('');
}
// Çift sarmalamayı önlemek için: önce ham glifleri sar, sonra harfleri çevir.
function prose(html) {
  const t = typo(html);
  const parts = t.split(/(<[^>]+>)/g).map((seg) => {
    if (seg.startsWith('<')) return seg;
    return seg
      .replace(MOVE_RE, (_, p, rest) => GLYPH[p] + rest.replace(/=([QRBN])/, (__, q) => '=' + GLYPH[q]))
      .replace(/[♔♕♖♗♘♙♚♛♜♝♞♟]/g, (g) => fg(g));
  });
  return parts.join('');
}
const inline = (md) => prose(marked.parseInline(md, { breaks: true }));
const para = (md) => marked.parse(md, { breaks: false });
const linkFix = (html) => html.replace(/href="\/(?!\/)/g, `href="${SITE}/`);
const plain = (md) => inline(md).replace(/<[^>]+>/g, '');

function parseTags(chunk) {
  const tags = {};
  for (const m of chunk.matchAll(/^\[(\w+)\s+"([^"]*)"\]\s*$/gm)) tags[m[1]] = m[2];
  return tags;
}
const WATCH = /^\[View\s+"player"\]\s*$/im;
const MOVETEXT_START = /^\s*(\d+\s*\.|\{)/;
const gameKey = (h) => { const t = parseTags(h); return [t.White, t.Black, t.Date, t.Round].join('|'); };
function gameMoves(chunks, i) {
  const next = chunks[i + 1] ?? '';
  if (!WATCH.test(chunks[i]) || MOVETEXT_START.test(next)) return { moves: next, own: true };
  const key = gameKey(chunks[i]);
  for (let j = 0; j < i; j++) {
    const h = chunks[j].trim();
    if (h.startsWith('[Event ') && !WATCH.test(h) && gameKey(h) === key && MOVETEXT_START.test(chunks[j + 1] ?? '')) return { moves: chunks[j + 1], own: false };
  }
  return { moves: next, own: true };
}
const fullName = (n) => (n ?? '').split(',').map((x) => x.trim()).filter(Boolean).reverse().join(' ');
const surname = (n) => (n ?? '').split(',')[0].trim();
const resultFmt = (r) => (r ?? '').replace('1/2-1/2', '½–½').replace(/-/g, '–');

// ---------------------------------------------------------------- diyagram
const FILES_AB = 'abcdefgh';
function board(fen, { orient = 'w', hl = [], crop = false, cls = '', size } = {}) {
  const rows = fen.split(' ')[0].split('/');
  const sq = {};
  rows.forEach((r, ri) => { let f = 0; for (const ch of r) { if (/\d/.test(ch)) f += +ch; else { sq[FILES_AB[f] + (8 - ri)] = ch; f++; } } });
  const ranks = crop ? [8, 7, 6, 5] : [8, 7, 6, 5, 4, 3, 2, 1];
  const rk = orient === 'b' ? [...ranks].reverse() : ranks;
  const fl = orient === 'b' ? [...FILES_AB].reverse() : [...FILES_AB];
  let h = '';
  const lastRank = rk[rk.length - 1];
  rk.forEach((r) => fl.forEach((f) => {
    const id = f + r;
    const light = (FILES_AB.indexOf(f) + r) % 2 === 1;
    const p = sq[id];
    const pc = p ? (p === p.toUpperCase() ? 'w' : 'b') + p.toUpperCase() : '';
    const lab = (f === fl[0] ? `<b class="rl">${r}</b>` : '') + (r === lastRank ? `<b class="fl">${f}</b>` : '');
    h += `<i class="${light ? 'l' : 'd'}${hl.includes(id) ? ' hl' : ''}${pc ? ' ' + pc : ''}">${lab}</i>`;
  }));
  return `<div class="bd ${cls}${crop ? ' crop' : ''}"${size ? ` style="width:${size}"` : ''}>${h}</div>`;
}
const diagram = (fen, caption, opts = {}) => `<figure class="dg${opts.puzzle ? ' pz' : ''}${opts.small ? ' sm' : ''}">${board(fen, opts)}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;

// ---------------------------------------------------------------- PGN
function tokenize(text) {
  const re = /\{[^}]*\}|[()]|\$\d+|\d+\.+|1-0|0-1|1\/2-1\/2|\*|[^\s(){}]+/g;
  return [...text.matchAll(re)].map((m) => m[0]);
}
function parseLine(tokens, pos, depth = 0) {
  const line = { lead: [], moves: [] };
  while (pos.i < tokens.length) {
    const t = tokens[pos.i++];
    if (t === '(') { const sub = parseLine(tokens, pos, depth + 1); const last = line.moves[line.moves.length - 1]; if (last) last.after.push({ v: sub }); else line.lead.push({ v: sub }); }
    else if (t === ')') { if (depth > 0) return line; }
    else if (t[0] === '{') { const c = t.slice(1, -1); const last = line.moves[line.moves.length - 1]; if (last) last.after.push({ c }); else line.lead.push({ c }); }
    else if (t[0] === '$') { const last = line.moves[line.moves.length - 1]; if (last) last.nags.push(+t.slice(1)); }
    else if (/^\d+\.+$/.test(t) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)) { if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)) line.result = t; }
    else line.moves.push({ raw: t, nags: [], after: [] });
  }
  return line;
}
const SUFFIX = /([!?]+)$/;
function annotate(line, fen, where) {
  const ch = new Chess(fen);
  for (const m of line.moves) {
    m.fenBefore = ch.fen();
    m.turn = ch.turn();
    m.num = Number(ch.fen().split(' ')[5]);
    const sfx = m.raw.match(SUFFIX)?.[1] ?? '';
    const san = m.raw.replace(SUFFIX, '').replace(/^0-0-0$/, 'O-O-O').replace(/^0-0$/, 'O-O');
    let mv;
    try { mv = ch.move(san, { strict: false }); } catch (e) { throw new Error(`Geçersiz hamle "${m.raw}" (${where}) — ${ch.fen()}`); }
    m.san = mv.san + sfx;
    m.from = mv.from; m.to = mv.to;
    m.fenAfter = ch.fen();
    for (const a of m.after) if (a.v) annotate(a.v, m.fenBefore, where);
  }
}
const sanHtml = (san) => {
  const m = san.match(/^([KQRBN])(.*)$/);
  let s = m ? fg(GLYPH[m[1]]) + m[2] : san;
  s = s.replace(/=([QRBN])/, (_, q) => '=' + fg(GLYPH[q]));
  return s;
};
const nagHtml = (nags) => nags.map((n) => NAG[n]).filter(Boolean).map((g) => `<span class="nag">${g}</span>`).join('');
const moveHtml = (m, needNum, cls = 'm') => {
  const num = m.turn === 'w' ? `${m.num}. ` : needNum ? `${m.num}… ` : '';
  return `<span class="${cls}">${num}${sanHtml(m.san)}${nagHtml(m.nags) ? ' ' + nagHtml(m.nags) : ''}</span>`;
};
// Yorum metni: işaretleri çıkar, [D]/[P] bayraklarını döndür.
function commentInfo(c) {
  const hasD = /\[D\]/.test(c);
  const hasP = /\[P\s*\d*\]/.test(c);
  let t = c.replace(/\[%[^\]]*\]/g, '').replace(/\[D\]/g, '').replace(/\[P\s*\d*\]/g, '').replace(/\s+/g, ' ').trim();
  return { hasD, hasP, text: t };
}
const commentHtml = (t) => prose(esc(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])[_*]([^_*\s][^_*]*?)[_*](?=[\s).,;:!?]|$)/g, '$1<em>$2</em>'));

function diagramFor(m, ctx, puzzle) {
  const label = m ? `${m.turn === 'w' ? `${m.num}.` : `${m.num}…`} ${sanHtml(m.san)}` : '';
  const fen = m ? m.fenAfter : ctx.startFen;
  const turn = fen.split(' ')[1];
  const cap = puzzle
    ? `<span class="pzl">Bulmaca</span> · Hamle sırası ${turn === 'w' ? 'Beyazda' : 'Siyahda'}`
    : m ? `${label} sonrası` : 'Başlangıç konumu';
  return diagram(fen, cap, { orient: ctx.orient, hl: m && !puzzle ? [m.from, m.to] : [], puzzle, small: ctx.small });
}

function renderMain(line, ctx) {
  let html = '';
  let run = [];
  let needNum = true;
  const flush = () => { if (run.length) html += `<p class="mv">${run.join(' ')}</p>`; run = []; needNum = true; };
  const block = (info, m) => {
    flush();
    const dg = (info.hasD || info.hasP) ? diagramFor(m, ctx, info.hasP) : '';
    const t = info.text ? `<p class="gc">${commentHtml(info.text)}</p>` : '';
    if (dg && t && info.text.length <= 640) html += `<div class="gcd">${t}${dg}</div>`;
    else html += `${t}${dg ? `<div class="dgc">${dg}</div>` : ''}`;
  };
  for (const a of line.lead) { if (a.c) { const info = commentInfo(a.c); if (info.text || info.hasD || info.hasP) block(info, null); } else html += renderVar(a.v, ctx); }
  for (const m of line.moves) {
    run.push(moveHtml(m, needNum)); needNum = false;
    const hasVar = m.after.some((a) => a.v);
    for (const a of m.after) {
      if (a.c) {
        const info = commentInfo(a.c);
        if (!info.text && !info.hasD && !info.hasP) continue;
        const inlineOk = !info.hasD && !info.hasP && info.text.length <= 150 && !hasVar;
        if (inlineOk) { run.push(`<span class="c">${commentHtml(info.text)}</span>`); needNum = true; }
        else block(info, m);
      } else { flush(); html += renderVar(a.v, ctx); }
    }
  }
  flush();
  return html;
}
function renderVar(line, ctx) {
  const blocks = [];
  let cur = '';
  const flush = () => { if (cur.trim()) blocks.push(`<p class="vl">${cur.trim()}</p>`); cur = ''; };
  const walk = (ln, top) => {
    cur += '(';
    let needNum = true;
    const lead = ln.lead;
    for (const a of lead) { if (a.c) { const info = commentInfo(a.c); if (info.text) cur += `<span class="c">${commentHtml(info.text)}</span> `; } }
    for (const m of ln.moves) {
      cur += moveHtml(m, needNum, 'vm') + ' '; needNum = false;
      for (const a of m.after) {
        if (a.c) {
          const info = commentInfo(a.c);
          if (info.text) { cur += `<span class="c">${commentHtml(info.text)}</span> `; needNum = true; }
          if (info.hasD || info.hasP) { cur = cur.trimEnd(); flush(); blocks.push(`<div class="dgc">${diagramFor(m, { ...ctx, small: true }, info.hasP)}</div>`); needNum = true; }
        } else { walk(a.v, false); needNum = true; }
      }
    }
    cur = cur.trimEnd() + ')' + ' ';
  };
  walk(line, true);
  if (cur.trim() === ')') {
    for (let k = blocks.length - 1; k >= 0; k--) if (blocks[k].startsWith('<p class="vl">')) { blocks[k] = blocks[k].replace(/<\/p>$/, ')</p>'); cur = ''; break; }
  }
  flush();
  return `<div class="var">${blocks.join('')}</div>`;
}

function renderGame(header, moves, ctx0) {
  const t = parseTags(header);
  const watch = WATCH.test(header);
  const startFen = t.FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const tokens = tokenize(moves);
  const line = parseLine(tokens, { i: 0 });
  const label = `${fullName(t.White)} – ${fullName(t.Black)}`;
  annotate(line, startFen, label);
  // Yönelim: [Orientation], aksi halde ana hattaki ilk [P] işaretinde hamle sırası Siyahdaysa Siyah.
  let orient = /black/i.test(t.Orientation ?? '') ? 'b' : 'w';
  if (!t.Orientation) {
    const look = [line.lead.map((a) => a.c).filter(Boolean).map((c) => ({ c, fen: startFen })), ...line.moves.map((m) => m.after.filter((a) => a.c).map((a) => ({ c: a.c, fen: m.fenAfter })))].flat();
    const first = look.find((x) => /\[P\s*\d*\]/.test(x.c));
    if (first && first.fen.split(' ')[1] === 'b') orient = 'b';
  }
  const ctx = { startFen, orient };
  const players = `${fullName(t.White)}${t.WhiteElo ? ` (${t.WhiteElo})` : ''} – ${fullName(t.Black)}${t.BlackElo ? ` (${t.BlackElo})` : ''}`;
  const place = t.EventLine || [t.Event, t.Site, (t.Date ?? '').match(/^\d{4}/)?.[0]].filter((v, i, a) => v && v !== a[i - 1]).join(', ');
  let head;
  if (t.Round && !watch) {
    head = `<header class="gh gh-round"><span class="gr">${esc(t.Round)}. tur</span><span class="gp">${esc(surname(t.White))} – ${esc(surname(t.Black))}</span><span class="gs">${resultFmt(t.Result)}</span></header>`;
  } else {
    head = `<header class="gh gh-info"><h4>${esc(players)}</h4>${place ? `<p>${prose(marked.parseInline(place))}</p>` : ''}<span class="gs">${resultFmt(t.Result)}</span></header>`;
  }
  const ann = t.Annotator ? `<p class="gann">Notlar: ${esc(t.Annotator)}</p>` : '';
  const leadP = line.lead.some((a) => a.c && /\[P\s*\d*\]/.test(a.c));
  const sd = t.FEN && !leadP ? `<div class="dgc">${diagram(startFen, 'Başlangıç konumu', { orient })}</div>` : '';
  return `<section class="game">${head}${ann}${sd}${renderMain(line, ctx)}</section>`;
}

// ---------------------------------------------------------------- bloklar
const IMG = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([\s\S]*)")?\)$/;
function imgKind(p) {
  const f = path.basename(p);
  if (/adventurous-way|chess-for-zebras/.test(f)) return 'c';
  return imageMeta[p]?.kind ?? 'h';
}
function figureInner(m, cls = '') {
  const [, alt, p, cap] = m;
  const kind = imgKind(p);
  const capHtml = cap ? `<figcaption class="credit">${linkFix(inline(cap))}</figcaption>` : '';
  return `<figure class="ph ph-${kind} ${cls}"><img src="img/${path.basename(p)}" alt="${esc(alt)}">${capHtml}</figure>`;
}
function quoteHtml(chunk, opts = {}) {
  let lines = chunk.split('\n').map((l) => l.replace(/^>\s?/, ''));
  const marks = [];
  while (lines.length && /^\[(sağa yaslı|şiir)\]\s*$/.test(lines[0])) { marks.push(lines[0].match(/\[(.*)\]/)[1] === 'şiir' ? 'poem' : 'right'); lines.shift(); }
  const blocks = lines.join('\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const last = blocks[blocks.length - 1] ?? '';
  const cite = /^[—–-]\s+\S/.test(last) ? last.replace(/^[—–-]\s+/, '') : null;
  const body = cite ? blocks.slice(0, -1) : blocks;
  let n = 0;
  const inner = body.map((b) => {
    const im = b.match(IMG);
    if (im) return figureInner(im, 'in-quote');
    const fm = b.match(/^\[FEN\s+"([^"]+)"\](\s*\(crop:\s*top-half\))?$/);
    if (fm) return `<div class="art-fen">${board(fm[1], { crop: !!fm[2] })}</div>`;
    n++;
    return `<p>${linkFix(inline(b.replace(/ {2}\n/g, '  \n')))}</p>`;
  }).join('');
  const citeHtml = cite ? `<footer class="quote-cite">— ${cite.split(' · ').map((p) => linkFix(inline(p))).join('<br>')}</footer>` : '';
  const len = chunk.length;
  return `<blockquote class="quote ${marks.map((x) => 'q-' + x).join(' ')}${len > 900 ? ' q-long' : ''}${opts.cls ? ' ' + opts.cls : ''}">${inner}${citeHtml}</blockquote>`;
}
function videoHtml(chunk) {
  const id = chunk.match(/embed\/([\w-]+)(?:\?start=(\d+))?/);
  const title = chunk.match(/<iframe[^>]*\btitle="([^"]*)"/)?.[1] ?? 'Video';
  const caps = (chunk.match(/<figcaption>([\s\S]*?)<\/figcaption>/)?.[1] ?? '').split(/<br\s*\/?>/).map((l) => l.trim()).filter(Boolean);
  const href = `https://www.youtube.com/watch?v=${id[1]}${id[2] ? `&t=${id[2]}s` : ''}`;
  return `<aside class="video"><span class="vplay">▶</span><div><p class="vlabel">Video · ${esc(title)}</p>${caps.map((l) => `<p class="vcap">${linkFix(inline(l))}</p>`).join('')}<p class="vlink"><a href="${href}">YouTube’da izle ↗</a></p></div></aside>`;
}

function isParagraph(c) { return !(c.startsWith('[Event ') || c.startsWith('###') || c.startsWith('<') || c.startsWith('>') || IMG.test(c) || /^\[FEN/.test(c) || /^Devamı gelecek\./.test(c) || c.startsWith('- ')); }
function paragraphHtml(c) {
  if (c.startsWith('- ')) {
    return `<ul>${c.split('\n').map((l) => `<li>${linkFix(inline(l.replace(/^-\s+/, '')))}</li>`).join('')}</ul>`;
  }
  return `<p>${linkFix(inline(c))}</p>`;
}

function renderChunks(chunks) {
  const out = [];
  let firstPara = true;
  const dropcap = (html) => {
    if (out.length) return html;
    return html.replace(/^<p>/, '<p class="lead">');
  };
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i].trim();
    if (c.startsWith('### ')) {
      // "Oyunu izleyin" bölümü: oyun oynatıcı kopyasıdır ve hamle metni yukarıda zaten metin olarak var.
      const nx = (chunks[i + 1] ?? '').trim();
      if (nx.startsWith('[Event ') && WATCH.test(nx) && !gameMoves(chunks, i + 1).own) { i++; continue; }
      out.push(`<h3>${linkFix(inline(c.replace(/^###\s+/, '')))}</h3>`);
      continue;
    }
    if (c.startsWith('[Event ')) {
      const { moves, own } = gameMoves(chunks, i);
      if (WATCH.test(c) && !own) continue; // aynı oyunun oynatıcı kopyası: metin olarak yukarıda var
      out.push(renderGame(c, moves, {}));
      if (own) i++;
      continue;
    }
    if (/^Devamı gelecek\./.test(c)) {
      const rest = c.replace(/^Devamı gelecek\./, '').trim().replace(/\.$/, '');
      out.push(`<aside class="tbc"><p class="tbc-label">Devamı gelecek</p><p class="tbc-text">${linkFix(inline(rest))}</p></aside>`);
      continue;
    }
    if (/^\[FEN\s+"([^"]+)"\]$/.test(c)) { out.push(`<div class="art-fen">${board(c.match(/"([^"]+)"/)[1])}</div>`); continue; }
    if (c.startsWith('<pre>')) { out.push(`<pre class="crosstable">${esc(c.replace(/<\/?pre>/g, '').replace(/^\n/, ''))}</pre>`); continue; }
    if (c.startsWith('<figure')) { out.push(videoHtml(c)); continue; }
    if (c.startsWith('>')) { out.push(quoteHtml(c)); continue; }
    const im = c.match(IMG);
    if (im) {
      const kind = imgKind(im[2]);
      const next = (chunks[i + 1] ?? '').trim();
      // Küçük portre + hemen ardından gelen alıntı (Gömöri anketi): fotoğraf solda, alıntı sağda.
      if (kind === 's' && next.startsWith('>') && !/^>\s*(!\[|\[FEN)/m.test(next)) {
        out.push(`<div class="pq">${figureInner(im)}${quoteHtml(next)}</div>`);
        i++; continue;
      }
      if (kind === 'h') { out.push(figureInner(im, 'center')); continue; }
      // Dikey/küçük fotoğraf: ardından gelen düz paragraflarla yan yana (dönüşümlü taraf).
      const group = [];
      let len = 0;
      let j = i + 1;
      while (j < chunks.length && len < 620) {
        const cj = chunks[j].trim();
        if (!isParagraph(cj) && !(cj.startsWith('>') && !/^>\s*(!\[|\[FEN)/m.test(cj))) break;
        group.push(cj); len += cj.length; j++;
      }
      if (group.length) {
        const side = out.filter((x) => x.includes('class="side ')).length % 2 ? 'sl' : 'sr';
        const body = group.map((g) => (g.startsWith('>') ? quoteHtml(g) : paragraphHtml(g))).join('');
        out.push(`<div class="side ${side} k-${kind}">${figureInner(im)}<div class="sb">${linkFix(body)}</div></div>`);
        i = j - 1; continue;
      }
      out.push(figureInner(im, 'center'));
      continue;
    }
    out.push(dropcap(linkFix(paragraphHtml(c))));
  }
  return out.join('\n');
}

// ---------------------------------------------------------------- yazı şablonları
const photoCredit = `<span lang='nl'>Jan Timman</span>, 1973 · Fotoğraf: <span lang='nl'>Rob Mieremet / Anefo</span> · Hollanda Ulusal Arşivi · Lisans: [CC0 1.0 (Kamu Bağışı)](https://creativecommons.org/publicdomain/zero/1.0/deed.tr) · Kaynak: [<span lang='en'>Wikimedia Commons</span>](https://commons.wikimedia.org/wiki/File:AVRO-schaaktoernooi,_Jan_Timman,_Bestanddeelnr_926-4781.jpg)`;

function titleHtml(a) {
  if (a.id === 'kapak') return `Mar del Plata 1982:<br><em>Jan Timman</em><br><em>ve bir zaferin anatomisi</em>`;
  if (a.titleLines) return `${esc(toTypography(a.titleLines[0]))}<br><em>${esc(toTypography(a.titleLines[1]))}</em>`;
  const t = toTypography(a.title);
  const k = t.indexOf(': ');
  if (k > 0) return `${esc(t.slice(0, k + 1))}<br><em>${esc(t.slice(k + 2))}</em>`;
  return esc(t);
}
function bylineHtml(a) {
  const parts = [`${esc(a.authorLabel ?? 'Yazar')}: <span lang="${a.authorLang ?? 'tr'}">${esc(a.author)}</span>`];
  if (a.translator) parts.push(`Türkçesi: ${esc(a.translator)}`);
  parts.push(a.date);
  return parts.join(' · ');
}

function article(a, n, total) {
  const file = FILES[a.id];
  let chunks;
  let short = false;
  if (file) chunks = fs.readFileSync(path.join(REPO, 'src/content', file), 'utf8').trim().split(/\n\s*\n/);
  else { chunks = a.body; short = true; }
  if (a.id === 'kapak') chunks = [`![Jan Timman, AVRO satranç turnuvası, 1973 (siyah-beyaz fotoğraf)](images/jan-timman-1973.jpg "${photoCredit}")`, ...chunks];
  const body = renderChunks(chunks);
  const nn = String(n).padStart(2, '0');
  const dek = a.dek ?? a.excerpt;
  const cleanNote = a.note ? `<p class="onote">${linkFix(inline(a.note)).replace(/ title="lang:([a-z]{2})"/g, ' lang="$1"')}</p>` : '';
  const opener = `
<section class="opener" id="${a.id}">
  <div class="op-top"><span class="op-no">${nn}</span><span class="op-of">MAKALE ${nn} / ${String(total).padStart(2, '0')}</span></div>
  <div class="op-mid">
    <p class="op-cat">${esc(a.cat)}</p>
    <h1>${titleHtml(a)}</h1>
    ${dek ? `<p class="op-dek">${linkFix(inline(dek))}</p>` : ''}
    <p class="op-by">${bylineHtml(a)}</p>
    ${cleanNote}
    ${short ? `<div class="op-body">${body}</div>` : ''}
  </div>
  <div class="op-foot"><span>SATRANÇ VS. · ${ISSUE.toLocaleUpperCase('tr')}</span><a href="${SITE}/${a.slug}/">${SITE.replace('https://', '')}/${a.slug}/</a></div>
</section>`;
  const bodySec = short ? '' : `<section class="art art-${a.id}"><div class="abody">${body}</div></section>`;
  return { opener, bodySec };
}

// ---------------------------------------------------------------- sayfa kenarları (künye, içindekiler, kapak, arka kapak)
const AUTHORS = [
  { name: 'Nazmi Can Doğan', role: 'Kurucu, Yayın Yönetmeni', bio: 'FIDE ustası (FM). [YouTube kanalında](https://www.youtube.com/satranchess) içerik üretiyor ve canlı yayınlar yapıyor.' },
  { name: 'Tarık Selbes', role: 'Kurucu, Yazar', bio: 'FIDE ustası (FM). [Café Chigorin](https://cafechigorin.com/) kişisel blogunda satranç tarihi, teorisi ve kültürü üzerine yazıyor.' },
  { name: 'Oğul Köseoğlu', role: 'Kurucu, Editör', bio: 'Amatör satranççı, profesyonel [çevirmen](https://ogulkoseoglu.com/). Satranç vs.’nin ve [ChessPublica](https://chesspublica.github.io/)’nın web geliştiricisi.' },
  { name: 'Ahmad Al-Khatib', role: 'Konuk yazar', bio: 'Ürdün’ün ilk büyük ustası (GM). [YouTube kanalında](https://www.youtube.com/@GMAhmadAlkhatib) satranç içerikleri üretiyor.' },
];
const ATTR = [
  'Oyun ve diyagramlar: [<span lang="en">ChessPublica</span>](https://chesspublica.github.io/) (MIT) ve içindeki [<span lang="en">jQuery</span>](https://jquery.com/) (MIT), [chess.js](https://github.com/jhlywa/chess.js) (BSD-2-Clause) ve [chessboard.js](https://chessboardjs.com/) (MIT, © <span lang="en">Chris Oakman</span>). Bu PDF’teki diyagramlar da aynı taş görselleriyle çizilmiştir.',
  'Satranç taşı görselleri: [<span lang="en">Colin M.L. Burnett</span>](https://commons.wikimedia.org/wiki/User:Cburnett) (Cburnett), <span lang="en">Wikimedia Commons</span> aracılığıyla, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.tr).',
  'Yazı tipleri: [Fraunces](https://fonts.google.com/specimen/Fraunces), [Manrope](https://fonts.google.com/specimen/Manrope) ve [<span lang="en">JetBrains Mono</span>](https://fonts.google.com/specimen/JetBrains+Mono) (<span lang="en">SIL Open Font License</span>), <span lang="en">Google Fonts</span> aracılığıyla.',
  'Fotoğraflar: Künyeler (fotoğrafçı, kaynak, lisans) her fotoğrafın altında yer alır.',
];
const coords = (arr) => arr.map((x) => `<span>${x}</span>`).join('');

function cover(arts) {
  const c = arts[0];
  const teasers = arts.slice(1).map((a) => `<li><span>${esc(a.cat)}</span> ${esc(toTypography(SHORT[a.id]))}</li>`).join('');
  return `
<section class="cover">
  <div class="cv-bg"></div>
  <div class="cv-files cv-files-top">${coords([...'abcdefgh'])}</div>
  <div class="cv-top">
    <p class="cv-mast">Satranç <em>vs.</em></p>
    <p class="cv-tag">Satranç üzerine uzun okumalar, analizler ve hikâyeler</p>
  </div>
  <div class="cv-ranks">${coords([8, 7, 6, 5, 4, 3, 2, 1])}</div>
  <div class="cv-bottom">
    <p class="cv-cat">KAPAK · ${esc(c.cat)}</p>
    <h1>Mar del Plata 1982:<br><em>Jan Timman</em><br><em>ve bir zaferin anatomisi</em></h1>
    <p class="cv-by">${esc(c.author)} · ${ISSUE}</p>
    <ul class="cv-list">${teasers}</ul>
  </div>
  <div class="cv-foot"><span>DİJİTAL DERGİ · ${ISSUE.toLocaleUpperCase('tr')}</span><span>${SITE.replace('https://', '')}</span></div>
</section>`;
}
function toc(arts) {
  const rows = arts.map((a, i) => {
    const pg = PAGES[a.id];
    const dek = a.dek ?? a.excerpt ?? '';
    return `<li><a href="#${a.id}"><span class="t-no">${String(i + 1).padStart(2, '0')}</span><span class="t-main"><span class="t-cat">${esc(a.cat)}</span><span class="t-title">${prose(esc(a.title).replace(/&quot;/g, '"'))}</span><span class="t-by">${esc(a.author)}${a.translator ? ' · Türkçesi: ' + esc(a.translator) : ''}</span></span><span class="t-pg">${pg ?? '··'}</span></a></li>`;
  }).join('');
  return `
<section class="toc">
  <p class="eyebrow"><span>01</span> — Bu Sayıda</p>
  <h2>İçindekiler</h2>
  <ol>${rows}</ol>
  <div class="toc-foot"><p>Satranç vs., satranç üzerine uzun okumalar, analizler, röportajlar ve hikâyeler yayımlayan bağımsız bir dergidir. Bir fincan kahve eşliğinde, acele etmeden okunsun diye.</p></div>
</section>`;
}
function backmatter() {
  return `
<section class="backm">
  <p class="eyebrow"><span>03</span> — Yazarlar</p>
  <h2>Katkıda <em>bulunanlar</em></h2>
  <div class="authors">${AUTHORS.map((au, i) => `<div class="au"><span class="au-ic">${'♔♕♖♘'[i]}</span><h3>${esc(au.name)}</h3><p class="au-role">${esc(au.role)}</p><p>${linkFix(inline(au.bio))}</p></div>`).join('')}</div>
  <p class="eyebrow" style="margin-top:12mm"><span>04</span> — Hakkında</p>
  <p class="about">Satranç vs., satranç üzerine uzun okumalar, analizler ve hikâyeler yayınlayan bağımsız bir dergidir. Bir fincan kahve eşliğinde, acele etmeden okunsun diye.</p>
  <p class="about">Bize ulaşmak, yayın ekibine katılmak ya da yazı taslaklarınızı göndermek için <a href="mailto:editor@satrancvs.com">editor@satrancvs.com</a> adresine e-posta gönderebilirsiniz. Yayın ekibi, paylaştığınız tüm öneri ve yazı taslaklarını büyük bir özenle inceler.</p>
  <div class="legal">
    <p class="lg-h">Telif hakları</p>
    <p>Sitede yayınlanan yazıların telif hakları yazarlarına, yayınlama ve çoğaltma yetkisi ise Satranç vs.’ye aittir. Önceden yazılı izin alınmaksızın kısmen veya tamamen kopyalanamaz, çoğaltılamaz ve kaynak gösterilmeden başka platformlarda yayınlanamaz.</p>
    <p class="lg-h" style="margin-top:6mm">Atıflar</p>
    <ul>${ATTR.map((t) => `<li>${linkFix(inline(t))}</li>`).join('')}</ul>
  </div>
</section>`;
}
function backcover() {
  return `
<section class="backcover">
  <div class="cv-files cv-files-top">${coords([...'abcdefgh'])}</div>
  <div class="bc-mid">
    <p class="bc-mast">Satranç <em>vs.</em></p>
    <p class="bc-line"><em>‘Satranç ve siz’ demek.</em></p>
  </div>
  <div class="bc-foot">
    <p>Bir fincan kahve eşliğinde, acele etmeden okunsun diye.</p>
    <p class="bc-url"><a href="${SITE}">satrancvs.com</a> · <a href="mailto:editor@satrancvs.com">editor@satrancvs.com</a></p>
    <p class="bc-copy">© Satranç vs. · Yazıların telif hakları yazarlarına aittir.</p>
  </div>
</section>`;
}

// ---------------------------------------------------------------- derleme
const arts = ORDER.map((id) => meta.find((a) => a.id === id)).filter((a) => a && !a.draft);
const total = arts.length;
const built = arts.map((a, i) => article(a, i + 1, total));
const pieceCss = ['w', 'b'].flatMap((c) => 'KQRBNP'.split('').map((k) => `.bd i.${c}${k}{background-image:url(data:image/png;base64,${fs.readFileSync(path.join(HERE, `pieces/${c}${k}.b64`), 'utf8')})}`)).join('\n');
const fontCss = fs.readFileSync(path.join(HERE, 'local.css'), 'utf8');
const pageCss = arts.map((a) => `@page art-${a.id} { margin: 20mm 19mm 23mm 19mm; background: #F4EEE2;
  @bottom-left { content: "SATRANÇ VS.  ·  ${ISSUE.toLocaleUpperCase('tr')}"; font: 500 5.6pt/1 'JetBrains Mono', monospace; letter-spacing: .16em; color: #8A7B68; vertical-align: top; padding-top: 7mm; }
  @bottom-center { content: "${toTypography(SHORT[a.id]).toLocaleUpperCase('tr').replace(/"/g, '\\"')}"; font: 500 5.6pt/1 'JetBrains Mono', monospace; letter-spacing: .16em; color: #9A5F1E; vertical-align: top; padding-top: 7mm; }
  @bottom-right { content: counter(page); font: 500 7pt/1 'JetBrains Mono', monospace; letter-spacing: .1em; color: #1B1612; vertical-align: top; padding-top: 6.6mm; } }`).join('\n');
const pageNames = arts.map((a) => `.art-${a.id}{page:art-${a.id}}`).join('\n');
const css = pageNames + fs.readFileSync(path.join(HERE, 'style.css'), 'utf8');

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<title>Satranç vs. — ${ISSUE}</title>
<meta name="author" content="Satranç vs.">
<meta name="description" content="Satranç üzerine uzun okumalar, analizler, röportajlar ve hikâyeler yayımlayan bağımsız dergi.">
<style>${fontCss}</style>
<style>${pieceCss}</style>
<style>${css}</style>
<style>${pageCss}</style>
</head><body>
${cover(arts)}
${toc(arts)}
${built.map((b) => b.opener + b.bodySec).join('\n')}
${backmatter()}
${backcover()}
</body></html>`;
fs.writeFileSync(path.join(OUT, 'magazine.html'), html);
fs.writeFileSync(path.join(OUT, 'articles.list.json'), JSON.stringify(arts.map((a, i) => ({ id: a.id, n: i + 1, total })), null, 1));
console.log('magazine.html', (html.length / 1024).toFixed(0), 'KB');
