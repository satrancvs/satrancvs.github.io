// <pgn-study> (ChessPublica) bu sitede yalnızca tek sütunlu okuma görünümü olarak kullanılır: üstte tahta, altında
// kayan hamle ve yorum listesi. Eski sitedeki _js/chesspublica/study/ klasörünün (index, ribbon, keyboard, branch)
// bu siteye uyarlanmış hali. Otomatik oynatma, içindekiler, ayarlar ve daraltma kaldırılır; geri/ileri düğmeleri eklenir.
// ChessPublica'nın iç yapısına (`_engine`, `_loopRAF`, `_variationPlayTick`) bağlıdır; bu alanlara yalnızca bu dosyada
// erişilir. Ayrıntı: docs/chesspublica-quirks.md.
type Engine = {
  state?: { index?: number; playing?: boolean };
  _loopRAF: () => void;
  _variationPlayTick: (variation: { playing: boolean; index: number; maxIndex: number }) => void;
  _variation?: { playing: boolean; index: number; maxIndex: number } | null;
  variationGoTo: (index: number) => void;
  togglePlay?: () => void;
};
type Player = HTMLElement & { _engine?: Engine };

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

// Yorum metnindeki hamle dizileri ("Beyaz 2. ♘c3 oynarsa hemen 2… ♗b4 oynayacaktım, devamında 3. ♘d5 ♗e7 4. d4 d6") ayrı bir varyant
// yazmadan tıklanabilir olur: yorumun bağlı olduğu konumdan oynanabilen her hamle, study'nin kendi varyant hamlesi gibi (data-fen,
// data-from, data-to) tahtayı o konuma götürür. Oynanamayan ya da sırası uymayan metin düz kalır. Yalnızca ana hat yorumları.
const FIGURINE: Record<string, string> = { '♔': 'K', '♕': 'Q', '♖': 'R', '♗': 'B', '♘': 'N' };
const SAN = '(?:[♔♕♖♗♘KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN♕♖♗♘])?|O-O-O|O-O)[+#]?';
const PROSE_TOKEN = new RegExp(`(\\d+)(\\.{3}|\\.|…)|(${SAN})(?![\\p{L}\\d])`, 'gu');
const toSan = (t: string) => t.replace(/[♔♕♖♗♘]/g, (c) => FIGURINE[c]);

function linkProseMoves(study: Element) {
  const Chess = window.Chess;
  const state = (study.querySelector('pgn-player') as (Player & { _engine?: { state?: { moves?: string[]; startFEN?: string } } }) | null)?._engine?.state;
  if (!Chess || !state?.moves) return;
  const game = new Chess(state.startFEN || undefined);
  const fens = [(game as ChessGame).fen()];
  for (const san of state.moves) { if (!game.move(san, { sloppy: true, strict: false })) break; fens.push(game.fen()); }

  study.querySelectorAll<HTMLElement>('.pgn-moves > p.pgn-comment').forEach((comment) => {
    const prev = comment.previousElementSibling;
    const last = prev?.classList.contains('pgn-mainline') ? Array.from(prev.querySelectorAll<HTMLElement>('.pgn-move[data-ply]')).pop() : null;
    const ply = last ? Number(last.dataset.ply) : NaN;
    // Yorumdaki satır, yorumun bağlı olduğu hamleden sonraki konumdan ya da (o hamlenin alternatifiyse) önceki konumdan başlar.
    const bases = [fens[ply + 1], fens[ply]].filter(Boolean);
    if (!bases.length) return;
    const walker = document.createTreeWalker(comment, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
    // Dizi, yorumun metin düğümleri boyunca sürer (varyant dışı); her yeni sayı işareti dizinin başlangıcı olur.
    // Bir satır, araya düz yazı girse de ("2. ♘c3 oynarsa hemen 2… ♗b4 oynayacaktım, devamında 3. ♘d5 …") sıradaki sayı işareti
    // satırın bir sonraki hamlesiyse sürer; aksi halde işaret yeni bir satır başlatır (yorumun bağlı olduğu konumdan).
    let run: ChessGame | null = null;
    let pending: ChessGame[] = []; // yeni satırın olası başlangıç konumları; ilk oynanabilen hamle birini seçer
    let armed = false; // bir sonraki hamle metni bir sayı işaretinden ya da bağlanan hamleden hemen sonra mı geliyor
    for (const node of nodes) {
      const text = node.data;
      const frag = document.createDocumentFragment();
      let at = 0;
      let lastEnd = -1; // son bağlanan hamlenin bittiği yer (bu metin düğümünde)
      let markEnd = -1; // son sayı işaretinin bittiği yer
      for (const m of text.matchAll(PROSE_TOKEN)) {
        const index = m.index ?? 0;
        const end = index + m[0].length;
        if (m[1] !== undefined) {
          const no = Number(m[1]);
          const black = m[2] !== '.';
          const adjacent = run && lastEnd >= 0 && /^[\s\u00a0\u2060]*$/.test(text.slice(lastEnd, index));
          const expected = run ? Number(run.fen().split(' ')[5]) : 0; // sıradaki tam hamle numarası
          const continues = run && (run.turn() === 'b') === black && no === expected;
          if (!(adjacent || continues)) {
            run = null;
            pending = bases.map((f) => new Chess(f)).filter((g) => (g.turn() === 'b') === black && no === Number(g.fen().split(' ')[5]));
          }
          armed = !!run || pending.length > 0;
          markEnd = end;
          continue;
        }
        if (!armed || (!run && !pending.length)) continue;
        // Hamle, sayı işaretinden ya da önceki hamleden yalnızca boşlukla ayrılmış olmalı.
        const since = lastEnd >= 0 && lastEnd > markEnd ? lastEnd : markEnd;
        if (since < 0 || !/^[\s\u00a0\u2060]*$/.test(text.slice(since, index))) { armed = false; continue; }
        let res: { from: string; to: string } | null = null;
        if (!run) {
          for (const g of pending) {
            try { res = g.move(toSan(m[3]), { sloppy: true, strict: false }); } catch { res = null; }
            if (res) { run = g; break; }
          }
          pending = [];
        } else {
          try { res = run.move(toSan(m[3]), { sloppy: true, strict: false }); } catch { res = null; }
        }
        if (!res || !run) { run = null; armed = false; continue; }
        frag.append(text.slice(at, index));
        const span = document.createElement('span');
        span.className = 'pgn-move cp-prose-move';
        span.dataset.fen = run.fen();
        span.dataset.from = res.from;
        span.dataset.to = res.to;
        span.textContent = m[3];
        frag.append(span);
        at = end;
        lastEnd = at;
      }
      if (at > 0) { frag.append(text.slice(at)); node.replaceWith(frag); }
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
