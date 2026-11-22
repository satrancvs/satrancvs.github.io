// Değerlendirme çubuğu (yalnızca Dünya Şampiyonası 2026 yazısı): <pgn-player>'ın kendi çubuğu (yalnızca PGN'de [%eval] varsa açılır) her oynatıcıda açılır,
// verisi tarayıcıda çalışan Stockfish 19 (lite, tek iş parçacıklı WASM: public/stockfish/, GPLv3, public/stockfish/Copying.txt) analizinden gelir.
// Konum, oynatıcının `cp-move` (ana hat) ve `cp-variation-move` (varyant) olaylarından alınır; analiz ekranda görünen konum için anlık güncellenir.
const SF = `${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`;
const DEPTH = 16;
const MOVETIME = 2500; // ms: derinliğe ulaşılmasa bile bu sürede durur

type Listener = (cp: number | null, mate: number | null, depth: number, pv: string[], fen: string) => void;

// Tek bir motor işçisi tüm oynatıcıları sırayla çözer; yeni istek gelince eskisi durdurulur (yalnızca son istenen konum analiz edilir).
let worker: Worker | null = null;
let failed = false;
let ready = false;
let busy = false;
let current: { fen: string; cb: Listener } | null = null;
let pending: { fen: string; cb: Listener } | null = null;

function start(): Worker | null {
  if (failed) return null;
  if (worker) return worker;
  try {
    worker = new Worker(SF);
  } catch {
    failed = true;
    return null;
  }
  worker.onerror = () => { failed = true; worker = null; ready = false; busy = false; };
  worker.onmessage = (ev: MessageEvent) => {
    const line = String(ev.data);
    if (line === 'uciok') { worker!.postMessage('isready'); return; }
    if (line === 'readyok') { ready = true; next(); return; }
    if (line.startsWith('info') && current && enabled) {
      const m = line.match(/\bscore (cp|mate) (-?\d+)/);
      if (m && /\bdepth (\d+)/.test(line) && !/\b(lowerbound|upperbound)\b/.test(line)) {
        const white = current.fen.split(' ')[1] !== 'b' ? 1 : -1; // skor hamle sırası olanın gözünden; beyazınkine çevrilir
        const v = Number(m[2]) * white;
        const depth = Number(line.match(/\bdepth (\d+)/)![1]);
        const pv = (line.match(/ pv (.+)$/)?.[1] ?? '').trim().split(/\s+/).filter(Boolean);
        current.cb(m[1] === 'cp' ? v : null, m[1] === 'mate' ? v : null, depth, pv, current.fen);
      }
    }
    if (line.startsWith('bestmove')) { busy = false; current = null; next(); }
  };
  worker.postMessage('uci');
  return worker;
}

function next() {
  if (!ready || busy || !pending || !worker) return;
  current = pending; pending = null; busy = true;
  worker.postMessage(`position fen ${current.fen}`);
  worker.postMessage(`go depth ${DEPTH} movetime ${MOVETIME}`);
}

// Analiz açma/kapama (sağdaki anahtar): kapalıyken motor çalıştırılmaz, çalışan analiz durdurulur. Tercih tarayıcıda saklanır.
const KEY = 'sf-analysis';
let enabled = (() => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } })();
export const engineEnabled = () => enabled;
export function setEngineEnabled(on: boolean) {
  if (on === enabled) return;
  enabled = on;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* saklanamazsa oturum boyunca bellekte kalır */ }
  if (!on) { pending = null; if (busy && worker) worker.postMessage('stop'); }
  window.dispatchEvent(new CustomEvent('cp-sf-toggle', { detail: on }));
}

function analyze(fen: string, cb: Listener) {
  if (!enabled || !start()) return;
  pending = { fen, cb };
  if (busy) worker!.postMessage('stop'); else next();
}

type PlayerEl = HTMLElement & {
  ready?: Promise<unknown>;
  _engine?: { state: { index: number; cache: string[] }; evalBar?: { live: boolean; bar: HTMLElement | null; setDisabled(f: boolean): void; setScore(pawns: number): void } };
};

const done = new WeakSet<Element>();

function attach(player: PlayerEl) {
  if (done.has(player) || !player.ready) return;
  done.add(player);
  if (player.closest('.live-idle')) return; // maç başlamadan: renksiz, boş oynatıcı; çubuk da yok
  let timer = 0;
  let last = '';
  player.ready.then(() => {
    const ev = player._engine?.evalBar;
    if (!ev || !ev.bar) return;
    // engine.load() çubuğu "PGN'de eval yok" diye kapatmıştır; burada Stockfish'e bağlanıp açılır, oynatıcının hamle başına sıfırlaması susturulur.
    ev.live = true;
    const show: Listener = (cp, mate, depth, pv, fen) => {
      if (!player.isConnected) return;
      // Canlı analiz paneli (LiveMatch) için: oynatıcıdan yukarı kabarcıklanan olay.
      player.dispatchEvent(new CustomEvent('cp-sf', { bubbles: true, detail: { cp, mate, depth, pv, fen } }));
      ev.setScore(mate !== null ? (mate > 0 ? 8 : -8) : (cp ?? 0) / 100);
      const label = mate !== null ? `${mate > 0 ? '+' : '−'}M${Math.abs(mate)}` : `${(cp ?? 0) > 0 ? '+' : (cp ?? 0) < 0 ? '−' : ''}${Math.abs((cp ?? 0) / 100).toFixed(1)}`;
      ev.bar!.title = `Stockfish: ${label}`;
      ev.bar!.setAttribute('aria-label', `Stockfish değerlendirmesi: ${label}`);
    };
    const run = (fen: string | undefined) => {
      if (!enabled || !fen || fen === last || !player.isConnected) return;
      last = fen;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => analyze(fen, show), 120);
    };
    const here = () => { const s = player._engine?.state; return s ? s.cache[s.index] : undefined; };
    ev.setScore(0);
    ev.setDisabled(false);
    const sync = () => ev.bar!.classList.toggle('sf-off', !enabled);
    sync();
    window.addEventListener('cp-sf-toggle', () => {
      if (!player.isConnected) return;
      sync();
      if (!enabled) { ev.setScore(0); ev.bar!.title = 'Stockfish analizi kapalı'; return; }
      last = '';
      const r = player.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) run(here());
    });
    player.addEventListener('cp-move', (e) => { const i = (e as CustomEvent).detail?.moveIndex as number; run(player._engine?.state.cache[i + 1]); });
    player.addEventListener('cp-variation-move', (e) => run((e as CustomEvent).detail?.fen));
    // Görünürken ilk konum (başlangıç ya da canlı yayında son hamle) çözülür; canlıda atlama sonradan yapıldığı için biraz sonra yine okunur.
    const io = new IntersectionObserver((entries) => { if (entries.some((en) => en.isIntersecting)) run(here()); }, { rootMargin: '200px' });
    io.observe(player);
    window.setTimeout(() => run(here()), 600);
  }).catch(() => {});
}

export function watchEvalBar(root: Element) {
  const scan = () => root.querySelectorAll('pgn-player').forEach((p) => attach(p as PlayerEl));
  scan();
  const mo = new MutationObserver(scan);
  mo.observe(root, { childList: true, subtree: true });
  return () => mo.disconnect();
}
