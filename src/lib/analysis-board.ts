// Serbest analiz tahtası (Dünya Şampiyonası yazısındaki maç seçici oynatıcıları): taşlar oynatılabilir, sağ tıkla ok çizilir / kare boyanır,
// Stockfish yeni konumu analiz eder, "Oyuna dön" düğmesi oyundaki konuma döndürür. Yeni hamleler oynatıcının hamle listesine (notasyona) EKLENMEZ:
// oynatıcının motoru olduğu gibi kalır, analiz konumu yalnızca tahtada çizilir ve kendi chess.js durumunda tutulur.
//   - Olaylar (oynatıcı öğesinde, kabarcıklanır): `cp-analysis` {on}  analiz modu açıldı/kapandı (düğme "Oyuna dön" olur),
//     `cp-analyze` {fen}  eval-bar.ts yeni konumu Stockfish'e verir; `cp-analysis-exit`  (dinlenir) analizden çık.
//   - Oynatıcı kendi başına konum değiştirirse (hamle listesine tıklama, ok tuşları, oynatma) `cp-move` / `cp-variation-move` gelir ve analiz biter.
import { Chess } from 'chess.js';

type Eng = {
  state: { index: number; cache: string[]; playing: boolean };
  board: { position(fen: string, animate?: boolean): void; orientation(): string };
  boardEl: HTMLElement;
  pause(): void;
  goTo(i: number): void;
  _variation?: unknown;
  puzzle?: { active?: boolean };
};
type PlayerEl = HTMLElement & { _engine?: Eng };

const NS = 'http://www.w3.org/2000/svg';
const COLORS = { green: '#15781b', red: '#c0282d', blue: '#2a5fd0', yellow: '#e6a100' };
const FILES = 'abcdefgh';

export function attachAnalysis(player: PlayerEl) {
  const eng = player._engine;
  if (!eng) return;
  const boardEl = eng.boardEl;
  let chess: Chess | null = null;
  let fens: string[] = []; // analiz hattı: [başlangıç konumu, 1. hamleden sonra, ...]
  let pos = 0;             // hattaki gösterilen konum
  let active = false;
  let sel: string | null = null;
  const marks = new Map<string, string>();
  let arrows: { from: string; to: string; color: string }[] = [];

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'cp-an-svg');
  svg.setAttribute('viewBox', '0 0 8 8');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  boardEl.appendChild(svg);

  const grid = () => (boardEl.querySelector('.board-b72b1') as HTMLElement | null)?.getBoundingClientRect() ?? boardEl.getBoundingClientRect();
  const white = () => eng.board.orientation() !== 'black';
  const sqAt = (x: number, y: number): string | null => {
    const r = grid();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
    const f = Math.min(7, Math.floor(((x - r.left) / r.width) * 8));
    const rk = Math.min(7, Math.floor(((y - r.top) / r.height) * 8));
    return `${FILES[white() ? f : 7 - f]}${white() ? 8 - rk : rk + 1}`;
  };
  const center = (sq: string): [number, number] => {
    const f = FILES.indexOf(sq[0]);
    const rk = Number(sq[1]) - 1;
    return [(white() ? f : 7 - f) + 0.5, (white() ? 7 - rk : rk) + 0.5];
  };
  const cur = () => chess ?? new Chess(eng.state.cache[eng.state.index]);

  const el = (name: string, attrs: Record<string, string | number>) => {
    const n = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
    return n;
  };
  const render = () => {
    // Kapsayıcı (.board-b72b1) ile aynı konum/ölçü
    const g = grid();
    const b = boardEl.getBoundingClientRect();
    svg.style.left = `${g.left - b.left}px`;
    svg.style.top = `${g.top - b.top}px`;
    svg.style.width = `${g.width}px`;
    svg.style.height = `${g.height}px`;
    svg.replaceChildren();
    marks.forEach((color, sq) => {
      const [cx, cy] = center(sq);
      svg.appendChild(el('rect', { x: cx - 0.5, y: cy - 0.5, width: 1, height: 1, fill: color, opacity: 0.5 }));
    });
    if (sel) {
      const [cx, cy] = center(sel);
      svg.appendChild(el('rect', { x: cx - 0.5, y: cy - 0.5, width: 1, height: 1, fill: '#e6c200', opacity: 0.5 }));
      cur().moves({ square: sel as never, verbose: true }).forEach((m) => {
        const [tx, ty] = center(m.to);
        svg.appendChild(m.captured ? el('circle', { cx: tx, cy: ty, r: 0.44, fill: 'none', stroke: '#14551e', 'stroke-width': 0.09, opacity: 0.45 }) : el('circle', { cx: tx, cy: ty, r: 0.17, fill: '#14551e', opacity: 0.45 }));
      });
    }
    arrows.forEach((a) => {
      const [x1, y1] = center(a.from);
      const [x2, y2] = center(a.to);
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const head = 0.4;
      const sx = x1 + ux * 0.18, sy = y1 + uy * 0.18; // başlangıç karenin ortasından biraz dışarı
      const bx = x2 - ux * head, by = y2 - uy * head;
      svg.appendChild(el('line', { x1: sx, y1: sy, x2: bx, y2: by, stroke: a.color, 'stroke-width': 0.17, 'stroke-linecap': 'round', opacity: 0.82 }));
      const px = -uy * 0.24, py = ux * 0.24;
      svg.appendChild(el('polygon', { points: `${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}`, fill: a.color, opacity: 0.82 }));
    });
  };
  // Elle yapılan hamlede gerçek hamlenin gri oku, oyunun ok/kare notları ve hamle rozeti tahtada kalmaz (oyuna dönünce goTo hepsini yeniden çizer).
  const clearGameOverlays = () => {
    boardEl.querySelectorAll('.board-overlay, .gm-badge').forEach((n) => n.remove());
  };
  const clearShapes = () => { marks.clear(); arrows = []; sel = null; };
  const dispatch = (name: string, detail: unknown) => player.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));

  const doMove = (from: string, to: string, animate: boolean) => {
    if (!active) {
      if (eng._variation || eng.puzzle?.active) return;
      if (eng.state.playing) eng.pause(); // pause(), oyundaki konumu yeniden çizer; analiz ondan sonra başlar
      chess = new Chess(eng.state.cache[eng.state.index]);
      fens = [chess.fen()];
      pos = 0;
    }
    try { chess!.move({ from, to, promotion: 'q' }); } catch { return; }
    fens = fens.slice(0, pos + 1);
    fens.push(chess!.fen());
    pos = fens.length - 1;
    active = true;
    clearShapes();
    clearGameOverlays();
    eng.board.position(chess!.fen(), animate);
    render();
    dispatch('cp-analysis', { on: true });
    dispatch('cp-analyze', { fen: chess!.fen() });
  };
  // Analizi bitir: oynatıcının kendi konumu zaten çizildiyse (silent) yalnızca durumu sıfırlar, değilse oyundaki konumu geri yükler.
  const finish = (restore: boolean) => {
    const was = active;
    chess = null; active = false; fens = []; pos = 0;
    clearShapes();
    render();
    if (was) dispatch('cp-analysis', { on: false });
    if (was && restore) eng.goTo(eng.state.index);
  };
  player.addEventListener('cp-analysis-exit', () => finish(true));
  const engineMoved = () => { if (active) finish(false); else if (marks.size || arrows.length || sel) { clearShapes(); render(); } };
  player.addEventListener('cp-move', engineMoved);
  player.addEventListener('cp-variation-move', engineMoved);
  window.addEventListener('resize', render);
  new ResizeObserver(render).observe(boardEl);

  // ---- Klavye: analiz hattında ileri/geri (sol/sağ ok). Analizdeyken oklar oyunun hamlelerine değil analiz hattına uygulanır. ----
  const step = (to: number) => {
    if (!active || to < 0 || to > fens.length - 1 || to === pos) return;
    pos = to;
    chess = new Chess(fens[pos]);
    clearShapes();
    clearGameOverlays();
    eng.board.position(fens[pos], true);
    render();
    dispatch('cp-analyze', { fen: fens[pos] });
  };
  window.addEventListener('keydown', (e) => {
    if (!active || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    step(pos + (e.key === 'ArrowRight' ? 1 : -1));
  }, true);

  // ---- Fare / dokunma ----
  boardEl.addEventListener('contextmenu', (e) => e.preventDefault());
  let drag: { from: string; sx: number; sy: number; moved: boolean; ghost: HTMLElement | null; src: HTMLElement | null } | null = null;
  let rdown: { sq: string; color: string } | null = null;

  const colorOf = (e: PointerEvent) => (e.shiftKey ? COLORS.red : e.ctrlKey || e.metaKey ? COLORS.blue : e.altKey ? COLORS.yellow : COLORS.green);
  const moveGhost = (e: PointerEvent) => { if (drag?.ghost) { drag.ghost.style.left = `${e.clientX}px`; drag.ghost.style.top = `${e.clientY}px`; } };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
      const src = boardEl.querySelector(`[data-square="${drag.from}"] img`) as HTMLImageElement | null;
      if (src) {
        const g = grid();
        const ghost = document.createElement('img');
        ghost.src = src.src;
        ghost.className = 'cp-an-ghost';
        ghost.style.width = `${g.width / 8}px`;
        ghost.style.height = `${g.width / 8}px`;
        document.body.appendChild(ghost);
        drag.ghost = ghost;
        drag.src = src;
        src.style.opacity = '0.3';
      }
      drag.moved = true;
    }
    moveGhost(e);
  };
  const onUp = (e: PointerEvent) => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (rdown && e.button === 2) {
      const to = sqAt(e.clientX, e.clientY);
      if (to) {
        if (to === rdown.sq) { if (marks.get(to) === rdown.color) marks.delete(to); else marks.set(to, rdown.color); }
        else {
          const i = arrows.findIndex((a) => a.from === rdown!.sq && a.to === to);
          if (i >= 0) arrows.splice(i, 1); else arrows.push({ from: rdown.sq, to, color: rdown.color });
        }
        render();
      }
      rdown = null;
      return;
    }
    if (!drag) return;
    const d = drag;
    drag = null;
    d.ghost?.remove();
    if (d.src) d.src.style.opacity = '';
    if (d.moved) {
      const to = sqAt(e.clientX, e.clientY);
      if (to && to !== d.from && cur().moves({ square: d.from as never, verbose: true }).some((m) => m.to === to)) doMove(d.from, to, false);
      else { sel = null; render(); }
    }
  };
  boardEl.addEventListener('pointerdown', (e) => {
    const sq = sqAt(e.clientX, e.clientY);
    if (!sq) return;
    if (e.button === 2) {
      e.preventDefault();
      rdown = { sq, color: colorOf(e) };
      window.addEventListener('pointerup', onUp);
      return;
    }
    if (e.button !== 0) return;
    if (marks.size || arrows.length) { marks.clear(); arrows = []; }
    const c = cur();
    if (sel && sel !== sq && c.moves({ square: sel as never, verbose: true }).some((m) => m.to === sq)) { doMove(sel, sq, true); return; }
    const piece = c.get(sq as never);
    if (piece && piece.color === c.turn() && !c.isGameOver()) {
      sel = sq;
      drag = { from: sq, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, src: null };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      e.preventDefault();
    } else sel = null;
    render();
  }, true);
  render();
}
