// <pgn-study> (ChessPublica) bu sitede yalnızca tek sütunlu okuma görünümü olarak kullanılır: üstte tahta, altında
// kayan hamle ve yorum listesi. Eski sitedeki _js/chesspublica/study/ klasörünün (index, ribbon, keyboard, branch)
// bu siteye uyarlanmış hali. Otomatik oynatma, içindekiler, ayarlar ve daraltma kaldırılır; geri/ileri düğmeleri eklenir.
// ChessPublica'nın iç yapısına (`_engine`, `_loopRAF`, `_variationPlayTick`) bağlıdır; bu alanlara yalnızca bu dosyada
// erişilir. Ayrıntı: docs/chesspublica-quirks.md.
type Engine = {
  state?: { index?: number; playing?: boolean; moves?: string[]; startFEN?: string };
  _loopRAF: () => void;
  _variationPlayTick: (variation: { playing: boolean; index: number; maxIndex: number }) => void;
  _variation?: { playing: boolean; index: number; maxIndex: number } | null;
  variationGoTo: (index: number) => void;
  goTo: (index: number) => void;
  board?: { fen: () => string };
  togglePlay?: () => void;
};
type Player = HTMLElement & { _engine?: Engine };

import { ProseLinker } from './prose-moves.js';

type ChessGame = { move: (san: string, opts?: object) => { from: string; to: string } | null; fen: () => string; turn: () => string };
declare global {
  interface Window { Chess?: new (fen?: string) => ChessGame }
}

const STUDY = 'pgn-study';
const engineOf = (study: Element) => (study.querySelector('pgn-player') as Player | null)?._engine ?? null;

// Kaldırılan şerit düğmeleri: oynat, içindekiler, makale metni, hız, ayarlar, daralt.
const REMOVED = ['toggle-play', 'toc', 'article', 'speed', 'settings', 'collapse'];
const circleArrow = (paths: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/>${paths}</svg>`;
const NAV = [
  { dir: 'prev', label: 'Bir hamle geri', icon: circleArrow('<path d="m12 8-4 4 4 4"/><path d="M16 12H8"/>') },
  { dir: 'next', label: 'Bir hamle ileri', icon: circleArrow('<path d="M8 12h8"/><path d="m12 16 4-4-4-4"/>') },
] as const;

// Düzyazıdaki tıklanabilir hamleler (linkProseMoves) bir satır oluşturur: biri tıklanınca ileri/geri düğmesi ve ok tuşları satırı izler.
// Satır bitince bir sonraki ileri, ChessPublica'nın kendi ana hat adımına geçer; satırın başındayken geri, yorumun bağlı olduğu ana hat
// konumuna döner. Tahtadaki konum tıklanan hamlenin konumuyla uyuşmuyorsa (okur başka yere gittiyse) satır unutulur.
let proseLine: { run: string; step: number } | null = null;
const placement = (fen: string) => fen.split(' ')[0];

function proseSpans(study: Element, run: string) {
  return Array.from(study.querySelectorAll<HTMLElement>(`.cp-prose-move[data-run="${run}"]`));
}

/** Düzyazı satırındayken bir adım atar; ChessPublica'nın kendi adımına bırakılacaksa false döner. */
function proseStep(study: Element, dir: 'prev' | 'next') {
  if (!proseLine) return false;
  const engine = engineOf(study);
  const spans = proseSpans(study, proseLine.run);
  const current = spans[proseLine.step];
  if (!engine?.board || !current || placement(engine.board.fen()) !== placement(current.dataset.fen ?? '')) { proseLine = null; return false; }
  if (dir === 'next') {
    if (proseLine.step < spans.length - 1) { spans[proseLine.step + 1].click(); return true; }
    proseLine = null; // satır bitti: sıradaki ileri ana hamleye geçer
    return false;
  }
  if (proseLine.step > 0) { spans[proseLine.step - 1].click(); return true; }
  proseLine = null;
  engine.goTo(engine.state?.index ?? 0); // yorumun bağlı olduğu ana hat konumu
  return true;
}

// ChessPublica, bir dal noktasında düz "ileri" adımını, dal seçicisindeki ana hat satırına tıklanana kadar reddeder.
// Seçici gizlidir; okur her zaman ana hatta ilerler. Tıklama zaten bir adımdır: dal çözüldüyse true döner.
function resolveBranch(study: Element) {
  const row = study.querySelector<HTMLElement>('.pgn-study-picker-row.mainline');
  if (!row) return false;
  const engine = engineOf(study);
  row.click();
  // Tıklama oynatmayı başlatır; burada otomatik oynatma yoktur.
  if (engine?.state?.playing && typeof engine.togglePlay === 'function') engine.togglePlay();
  return true;
}

// ChessPublica kısayolları oyuncu ekranda değilse sessizce hiçbir şey yapmaz.
const activate = (study: Element) => study.querySelector('.player-wrapper')?.dispatchEvent(new MouseEvent('mouseenter'));

function step(study: Element, dir: 'prev' | 'next') {
  if (proseStep(study, dir)) return;
  if (dir === 'next' && resolveBranch(study)) return;
  study.querySelector('.player-container')?.scrollIntoView({ block: 'nearest' });
  activate(study);
  document.dispatchEvent(new KeyboardEvent('keydown', { code: dir === 'next' ? 'ArrowRight' : 'ArrowLeft', bubbles: true }));
}

const isTyping = (el: Element | null) => !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || (el as HTMLElement).isContentEditable);

let active: Element | null = null;
let keyboardInstalled = false;
function installKeyboard() {
  if (keyboardInstalled) return;
  keyboardInstalled = true;
  document.addEventListener('keydown', (e) => {
    if (!e.isTrusted || !active?.isConnected || isTyping(document.activeElement)) return;
    // Boşluk ChessPublica'nın otomatik oynatmasını açar; burada kaldırıldı. Olay burada durdurulunca sayfa kaydırma bozulmaz.
    if (e.code === 'Space') { e.stopImmediatePropagation(); return; }
    const dir = e.code === 'ArrowRight' ? 'next' : e.code === 'ArrowLeft' ? 'prev' : null;
    if (!dir) return;
    active.querySelector('.player-container')?.scrollIntoView({ block: 'nearest' });
    activate(active);
    if (proseStep(active, dir)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    // Dal noktasında ChessPublica'nın kendi işleyicisi ilerlemez; çözmek zaten adımdır, aynı tuş ikinci kez ilerletmesin.
    if (dir === 'next' && resolveBranch(active)) { e.preventDefault(); e.stopImmediatePropagation(); }
  });
  // Tahta tıklamaları (oynat/duraklat ve 300 ms içinde çift tıklamada "10 hamle atla") okurun ulaşmasını istemediği şeylerdir.
  // Belge üzerinde yakalama aşaması, ChessPublica'nın iki dinleyicisinden de önce çalışır.
  document.addEventListener('click', (e) => {
    if ((e.target as Element | null)?.closest?.('pgn-study .board-wrap')) e.stopImmediatePropagation();
  }, true);
}

// Yorum metnindeki hamle dizileri ("Beyaz 2. ♘c3 oynarsa hemen 2… ♗b4 oynayacaktım, devamında 3. ♘d5 ♗e7 4. d4 d6") ayrı bir varyant
// yazmadan tıklanabilir olur: oynanabilen her hamle, study'nin kendi varyant hamlesi gibi (data-fen, data-from, data-to) tahtayı o
// konuma götürür. Bulma ve oynama kuralları src/lib/prose-moves.js'te (derleme denetimiyle ortak). Yalnızca ana hat yorumları.
function linkProseMoves(study: Element) {
  const Chess = window.Chess;
  const state = (study.querySelector('pgn-player') as (Player & { _engine?: { state?: { moves?: string[]; startFEN?: string } } }) | null)?._engine?.state;
  if (!Chess || !state?.moves) return;
  const game = new Chess(state.startFEN || undefined);
  const fens = [(game as ChessGame).fen()];
  for (const san of state.moves) { if (!game.move(san, { sloppy: true, strict: false })) break; fens.push(game.fen()); }

  study.querySelectorAll<HTMLElement>('.pgn-moves > p.pgn-comment').forEach((comment, commentNo) => {
    const prev = comment.previousElementSibling;
    const last = prev?.classList.contains('pgn-mainline') ? Array.from(prev.querySelectorAll<HTMLElement>('.pgn-move[data-ply]')).pop() : null;
    const ply = last ? Number(last.dataset.ply) : NaN;
    // Yorumdaki satır, yorumun bağlı olduğu hamleden sonraki konumdan ya da (o hamlenin alternatifiyse) önceki konumdan başlar.
    const bases = [fens[ply + 1], fens[ply]].filter(Boolean);
    if (!bases.length) return;
    const linker = new ProseLinker(Chess as never, bases);
    const walker = document.createTreeWalker(comment, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
    for (const node of nodes) {
      const { moves } = linker.scan(node.data);
      if (!moves.length) continue;
      const text = node.data;
      const frag = document.createDocumentFragment();
      let at = 0;
      for (const m of moves) {
        frag.append(text.slice(at, m.index));
        const span = document.createElement('span');
        span.className = 'pgn-move cp-prose-move';
        span.dataset.fen = m.fen;
        span.dataset.from = m.from;
        span.dataset.to = m.to;
        span.dataset.run = `${commentNo}-${m.run}`;
        span.dataset.step = String(m.step);
        span.textContent = m.text;
        frag.append(span);
        at = m.end;
      }
      frag.append(text.slice(at));
      node.replaceWith(frag);
    }
  });
}

function prepare(study: HTMLElement) {
  const engine = engineOf(study);
  if (engine) {
    // Sürekli döngüler yerine tek adım: tahta tıklaması ve dal seçicisi play() çağırır; adımı korur, oynatmayı durdurur.
    engine._loopRAF = () => {};
    engine._variationPlayTick = (v) => {
      if (engine._variation !== v || !v.playing) return;
      v.playing = false;
      if (v.index < v.maxIndex) engine.variationGoTo(v.index + 1);
    };
  }
  for (const action of REMOVED) study.querySelector(`[data-ribbon-action="${action}"]`)?.remove();
  study.querySelector('.pgn-study-ribbon-title')?.remove();
  study.querySelector('.pgn-study-settings-inline')?.classList.add('open');
  const right = study.querySelector('.pgn-study-ribbon-right');
  if (right && !study.querySelector('[data-pgn-nav]')) {
    for (const { dir, label, icon } of NAV) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pgn-study-ribbon-btn';
      btn.dataset.pgnNav = dir;
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.innerHTML = icon;
      btn.addEventListener('click', () => step(study, dir));
      right.append(btn);
    }
  }
  const mark = () => { active = study; };
  study.addEventListener('mouseenter', mark);
  study.addEventListener('click', mark);
  study.addEventListener('touchstart', mark, { passive: true });
  active = study;
  linkProseMoves(study);
  // Tıklanan düzyazı hamlesi satırı belirler; başka bir hamle ya da diyagram tıklanırsa satır unutulur.
  study.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    const span = target?.closest<HTMLElement>('.cp-prose-move');
    if (span?.dataset.run !== undefined) proseLine = { run: span.dataset.run, step: Number(span.dataset.step) };
    else if (target?.closest('.pgn-move, .pgn-clickable-diagram')) proseLine = null;
  });
  // Tahta tıklaması ve dal seçicisi aynı oyuncuya gider; ilk tuşa basıldığında klavye bu çalışmanın olmalı.
  activate(study);
}

/** `root` içindeki <pgn-study> öğelerini kurar (hazır olunca bir kez) ve daraltmayı engeller. Durdurma işlevi döndürür. */
export function watchStudy(root: Element) {
  installKeyboard();
  const prepared = new WeakSet<Element>();
  const sweep = () => {
    root.querySelectorAll<HTMLElement>(STUDY).forEach((study) => {
      // Panel tıklanınca açılıp kapanır; sınıf, yalnızca varsa kaldırılır (kaldırma işlemi gözlemciyi yeniden tetiklemesin).
      if (study.classList.contains('pgn-study-collapsed')) study.classList.remove('pgn-study-collapsed');
      if (!prepared.has(study) && study.classList.contains('cp-ready') && engineOf(study)) {
        prepared.add(study);
        prepare(study);
      }
    });
  };
  const observer = new MutationObserver(sweep);
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  sweep();
  return () => observer.disconnect();
}
