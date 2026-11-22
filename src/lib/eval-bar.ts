// Değerlendirme çubuğu (yalnızca Dünya Şampiyonası 2026 yazısı): <pgn-player>'ın kendi çubuğu (yalnızca PGN'de [%eval] varsa açılır) her oynatıcıda açılır,
// verisi tarayıcıda çalışan Stockfish 19 (lite, tek iş parçacıklı WASM: public/stockfish/, GPLv3, public/stockfish/Copying.txt) analizinden gelir.
// Konum, oynatıcının `cp-move` (ana hat) ve `cp-variation-move` (varyant) olaylarından alınır; analiz ekranda görünen konum için anlık güncellenir.
const SF = `${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`;
// Analiz ayarları (canlı ekrandaki panelden seçilir, tarayıcıda saklanır): derinlik ve gösterilecek varyant (satır) sayısı.
export const DEPTHS = [10, 12, 16, 20, 24];
export const LINE_COUNTS = [1, 2, 3, 4, 5];
const MOVETIME: Record<number, number> = { 10: 1000, 12: 1500, 16: 2500, 20: 5000, 24: 10000 }; // ms: derinliğe ulaşılmasa bile bu sürede durur (satır başına +%50)
const num = (k: string, ok: number[], d: number) => { try { const v = Number(localStorage.getItem(k)); return ok.includes(v) ? v : d; } catch { return d; } };
let depthSetting = num('sf-depth', DEPTHS, 16);
let linesSetting = num('sf-lines', LINE_COUNTS, 1);
export const engineSettings = () => ({ depth: depthSetting, lines: linesSetting });
export function setEngineSettings(depth: number, lines: number) {
  if (depth === depthSetting && lines === linesSetting) return;
  depthSetting = depth; linesSetting = lines;
  try { localStorage.setItem('sf-depth', String(depth)); localStorage.setItem('sf-lines', String(lines)); } catch { /* bellekte kalır */ }
  if (busy && worker) worker.postMessage('stop');
  window.dispatchEvent(new CustomEvent('cp-sf-config'));
}

export type SfLine = { cp: number | null; mate: number | null; pv: string[] };
export type SfResult = { cp: number | null; mate: number | null; depth: number; pv: string[]; fen: string; lines: SfLine[] };
type Listener = (r: SfResult) => void;

// Tek bir motor işçisi tüm oynatıcıları sırayla çözer; yeni istek gelince eskisi durdurulur (yalnızca son istenen konum analiz edilir).
let worker: Worker | null = null;
let failed = false;
let ready = false;
let busy = false;
type Job = { fen: string; cb: Listener; multi: number; lines: SfLine[] };
let current: Job | null = null;
let pending: Job | null = null;

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
    if (line.startsWith('info') && current) {
      const m = line.match(/\bscore (cp|mate) (-?\d+)/);
      if (m && /\bdepth (\d+)/.test(line) && !/\b(lowerbound|upperbound)\b/.test(line)) {
        const white = current.fen.split(' ')[1] !== 'b' ? 1 : -1; // skor hamle sırası olanın gözünden; beyazınkine çevrilir
        const v = Number(m[2]) * white;
        const depth = Number(line.match(/\bdepth (\d+)/)![1]);
        const k = Number(line.match(/\bmultipv (\d+)/)?.[1] ?? 1);
        const pv = (line.match(/ pv (.+)$/)?.[1] ?? '').trim().split(/\s+/).filter(Boolean);
        current.lines[k - 1] = { cp: m[1] === 'cp' ? v : null, mate: m[1] === 'mate' ? v : null, pv };
        const top = current.lines[0];
        if (top) current.cb({ cp: top.cp, mate: top.mate, depth, pv: top.pv, fen: current.fen, lines: current.lines.filter(Boolean) });
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
  worker.postMessage(`setoption name MultiPV value ${current.multi}`);
  worker.postMessage(`position fen ${current.fen}`);
  worker.postMessage(`go depth ${depthSetting} movetime ${Math.round((MOVETIME[depthSetting] ?? 2500) * (1 + (current.multi - 1) * 0.5))}`);
}

// Analiz açma/kapama (panelin anahtarı): yalnızca panelin skor/devam yolu gösterimini ve çok satırlı analizi kapatır; değerlendirme çubuğu motordan beslenmeye devam eder (tek satır). Tercih tarayıcıda saklanır.
const KEY = 'sf-analysis';
let enabled = (() => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } })();
export const engineEnabled = () => enabled;
export function setEngineEnabled(on: boolean) {
  if (on === enabled) return;
  enabled = on;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* saklanamazsa oturum boyunca bellekte kalır */ }
  window.dispatchEvent(new CustomEvent('cp-sf-toggle', { detail: on }));
}

function analyze(fen: string, cb: Listener, multi: number) {
  if (!start()) return;
  pending = { fen, cb, multi, lines: [] };
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
  // Canlı ekran / maç seçici (.hub): tüm oyunlar 0,5x hızda oynar (ayarlar düğmesi gizli olduğundan sabit).
  if (player.closest('.hub')) {
    player.ready.then(() => {
      const e = player._engine as unknown as { _speedIdx: number; state: { speed: number } } | undefined;
      if (!e) return;
      e._speedIdx = 0;
      e.state.speed = 0.5;
      const label = player.querySelector('.speed-label');
      if (label) label.textContent = '0.5x';
    }).catch(() => {});
  }
  // Ilk hamle oncesi yorum karti tahtanin uzerinde ortalanir: tahtanin konumu/olcusu CSS degiskenleri olarak oynaticiya yazilir.
  if (player.closest('.hub')) {
    const place = () => {
      const board = player.querySelector('.board') as HTMLElement | null;
      const wrap = player.querySelector('.player-wrapper') as HTMLElement | null;
      if (!board || !wrap) return;
      const b = board.getBoundingClientRect();
      const w = wrap.getBoundingClientRect();
      if (!b.width) return;
      const st = player.style;
      st.setProperty('--bl', `${b.left - w.left}px`); st.setProperty('--bt', `${b.top - w.top}px`);
      st.setProperty('--bw', `${b.width}px`); st.setProperty('--bh', `${b.height}px`);
    };
    player.ready.then(() => {
      place();
      const board = player.querySelector('.board');
      if (board) new ResizeObserver(place).observe(board);
      window.addEventListener('resize', place);
    }).catch(() => {});
  }
  if (player.closest('.live-idle')) {
    // maç başlamadan: renksiz, boş oynatıcı; çubuk görünür ama nötr (%50), analiz yok
    player.ready.then(() => {
      const ev = player._engine?.evalBar;
      if (!ev || !ev.bar) return;
      ev.live = true;
      ev.setScore(0);
      ev.setDisabled(false);
    }).catch(() => {});
    return;
  }
  let timer = 0;
  let last = '';
  player.ready.then(() => {
    const ev = player._engine?.evalBar;
    if (!ev || !ev.bar) return;
    // engine.load() çubuğu "PGN'de eval yok" diye kapatmıştır; burada Stockfish'e bağlanıp açılır, oynatıcının hamle başına sıfırlaması susturulur.
    ev.live = true;
    const live = !!player.closest('.live-match, .picker'); // çoklu satır yalnızca canlı ekrandaki panel açıkken; diğer oynatıcılar ve kapalı panel tek satır çözer
    const show: Listener = (r) => {
      const { cp, mate } = r;
      if (!player.isConnected) return;
      // Canlı analiz paneli (LiveMatch) için: oynatıcıdan yukarı kabarcıklanan olay.
      player.dispatchEvent(new CustomEvent('cp-sf', { bubbles: true, detail: r }));
      ev.setScore(mate !== null ? (mate > 0 ? 8 : -8) : (cp ?? 0) / 100);
      const label = mate !== null ? `${mate > 0 ? '+' : '−'}M${Math.abs(mate)}` : `${(cp ?? 0) > 0 ? '+' : (cp ?? 0) < 0 ? '−' : ''}${Math.abs((cp ?? 0) / 100).toFixed(1)}`;
      ev.bar!.title = `Stockfish: ${label}`;
      ev.bar!.setAttribute('aria-label', `Stockfish değerlendirmesi: ${label}`);
    };
    const run = (fen: string | undefined) => {
      if (!fen || fen === last || !player.isConnected) return;
      last = fen;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => analyze(fen, show, live && enabled ? linesSetting : 1), 120);
    };
    const here = () => { const s = player._engine?.state; return s ? s.cache[s.index] : undefined; };
    ev.setScore(0);
    ev.setDisabled(false);
    const rerun = () => {
      if (!player.isConnected) return;
      last = '';
      const r = player.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) run(here());
    };
    window.addEventListener('cp-sf-toggle', rerun);
    window.addEventListener('cp-sf-config', rerun);
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
