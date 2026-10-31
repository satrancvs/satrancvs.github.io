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
  board?: { fen: () => string; position: (fen?: string, animate?: boolean) => unknown };
  togglePlay?: () => void;
};
type Lined = HTMLElement & { cpFens?: string[] };
type Player = HTMLElement & { _engine?: Engine };

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
    // Dal noktasında ChessPublica'nın kendi işleyicisi ilerlemez; çözmek zaten adımdır, aynı tuş ikinci kez ilerletmesin.
    if (dir === 'next' && resolveBranch(active)) { e.preventDefault(); e.stopImmediatePropagation(); }
  });
  // Tahta tıklamaları (oynat/duraklat ve 300 ms içinde çift tıklamada "10 hamle atla") okurun ulaşmasını istemediği şeylerdir.
  // Belge üzerinde yakalama aşaması, ChessPublica'nın iki dinleyicisinden de önce çalışır.
  document.addEventListener('click', (e) => {
    if ((e.target as Element | null)?.closest?.('pgn-study .board-wrap')) e.stopImmediatePropagation();
  }, true);
}


// Bir hamle listesine (ana hat ya da dal) tıklamak tahtayı birkaç yarım hamle uzağa atlatır; chessboard.js bu farkı tek
// seferde, bütün taşları aynı anda en yakın kareye kaydırarak canlandırır ve taşlar "karışır". Aynı hat üzerindeki
// atlamalar bunun yerine aradaki konumlardan sırayla, tek hamlelik kaydırmalarla oynatılır. Dal değiştiren atlamalar da
// ortak konumdan geçen en kısa yolla oynatılır; yol bulunamazsa ya da çok uzunsa kısa bir solma kullanılır.
const placement = (fen: string) => fen.split(' ')[0];
const STEP_MS = 230;
const MAX_STEPS = 24;
function smoothJumps(study: HTMLElement, engine: Engine) {
  const board = engine.board;
  if (!board || (board as { __smooth?: boolean }).__smooth) return;
  (board as { __smooth?: boolean }).__smooth = true;
  const original = board.position.bind(board);
  let timer = 0;
  const lines = () => {
    const out: string[][] = [];
    const cache = (engine as unknown as { state?: { cache?: string[] } }).state?.cache;
    if (cache) out.push(cache.map(placement));
    study.querySelectorAll<Lined>('.pgn-variation').forEach((v) => { if (v.cpFens) out.push(v.cpFens.map(placement)); });
    return out;
  };
  const fade = () => {
    const el = study.querySelector<HTMLElement>('.board-wrap, .jc-board-wrapper, [class*="board-"]');
    const target = (el ?? study.querySelector<HTMLElement>('.player-container'))?.querySelector<HTMLElement>('[class*="piece"]')?.parentElement;
    target?.animate?.([{ opacity: 0.25 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
  };
  board.position = (fen?: string, animate?: boolean) => {
    // Okuma çağrıları ("fen", "start", argümansız) ve FEN olmayan değerler olduğu gibi geçer; board.fen() de position("fen") kullanır.
    if (typeof fen !== 'string' || !fen.includes('/')) return (original as (...a: unknown[]) => unknown)(fen, animate);
    window.clearTimeout(timer);
    if (animate === false) return original(fen, animate);
    const to = placement(fen);
    const from = placement(board.fen() as string);
    if (from === to) return original(fen, animate);
    // Ana hat ve bütün dallar tek bir konum grafiğine konur (kenar = bir hamle, iki yönlü); dallar çıktıkları konumda
    // ana hatta bağlanır. Aradaki en kısa yol, dallar arası geçişte de tek hamlelik kaymalarla oynatılır.
    const graph = new Map<string, Set<string>>();
    const link = (x: string, y: string) => {
      if (x === y) return;
      if (!graph.has(x)) graph.set(x, new Set());
      if (!graph.has(y)) graph.set(y, new Set());
      graph.get(x)!.add(y);
      graph.get(y)!.add(x);
    };
    for (const line of lines()) for (let i = 1; i < line.length; i++) link(line[i - 1], line[i]);
    let best: string[] | null = null;
    if (graph.has(from) && graph.has(to)) {
      const prev = new Map<string, string | null>([[from, null]]);
      const queue = [from];
      for (let q = 0; q < queue.length && !prev.has(to); q++) {
        for (const n of graph.get(queue[q])!) if (!prev.has(n)) { prev.set(n, queue[q]); queue.push(n); }
      }
      if (prev.has(to)) {
        best = [];
        for (let n: string | null = to; n && n !== from; n = prev.get(n) ?? null) best.unshift(n);
      }
    }
    if (best && best.length === 1) return original(fen, true);
    if (!best || best.length > MAX_STEPS) { const r = original(fen, false); fade(); return r; }
    const path = best;
    const run = (i: number) => {
      if (i >= path.length) return;
      original(i === path.length - 1 ? fen : path[i], true);
      timer = window.setTimeout(() => run(i + 1), path.length > 8 ? 150 : STEP_MS);
    };
    run(0);
  };
}

function prepare(study: HTMLElement) {
  const engine = engineOf(study);
  if (engine) {
    smoothJumps(study, engine);
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
