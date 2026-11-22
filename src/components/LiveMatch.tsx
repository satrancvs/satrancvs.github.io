import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { engineEnabled, setEngineEnabled } from '@/lib/eval-bar';

// Dünya Şampiyonası 2026 (Gukesh – Sindarov) canlı bölümü. Yazıda yalnızca `[CANLI MAÇ]` yazan bir paragraf bu bileşeni çizer.
//  - Maç başlamadan: renksiz, tıklanamaz, boş bir <pgn-player> ve altında 1. oyuna geri sayım.
//  - Maç başlayınca: Lichess'in resmî FIDE yayınından (herkese açık, CORS açık PGN uç noktası) 10 saniyede bir çekilen oyun canlı oynatılır;
//    okuyucu geride bir hamledeyse konumu korunur, sondaysa yeni hamleyle birlikte sona gider.
// Yayın kimliği ve tur kimlikleri Lichess'in `/api/broadcast/<TOUR>` yanıtından gelir (alttaki liste, ağ yanıt vermezse yedektir).
const TOUR = 'qfkdt8mn';
const API = 'https://lichess.org';
const POLL_MS = 10_000;
type Round = { id: string; name: string; startsAt: number; finished?: boolean };
const FALLBACK: Round[] = [
  ['xLgOJ6cb', 1795528800000], ['L3j03TZq', 1795615200000], ['fnmEB1kH', 1795701600000], ['wIwJtPqz', 1795874400000],
  ['ueVpeXxW', 1795960800000], ['b0ACq4LF', 1796047200000], ['OZYNuhhF', 1796220000000], ['K9grUNXr', 1796306400000],
  ['gBI5kKDi', 1796392800000], ['NhfhTSep', 1796565600000], ['bAU22Apj', 1796652000000], ['vRbnvNEi', 1796738400000],
  ['S4C6oJ1k', 1796911200000], ['MDkKXuQD', 1796997600000],
].map(([id, startsAt], i) => ({ id: id as string, name: `Game ${i + 1}`, startsAt: startsAt as number }));

const IDLE_PGN = '[Event "Dünya Şampiyonası 2026"]\n[White "Gukesh Dommaraju"]\n[Black "Javokhir Sindarov"]\n[Result "*"]\n\n1. e4 *';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const tag = (pgn: string, name: string) => pgn.match(new RegExp(`\\[${name}\\s+"([^"]*)"\\]`))?.[1] ?? '';
const plies = (pgn: string) => {
  const body = pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ');
  return body.split(/\s+/).filter(Boolean).length;
};
// Yorumlar (saat/değerlendirme) oynatıcıda gürültü yapar; hamleler ve künye kalır.
const clean = (pgn: string) => pgn.replace(/\{[^}]*\}/g, ' ').replace(/[ \t]+/g, ' ').trim();
const two = (n: number) => String(n).padStart(2, '0');
const nm = (s: string) => (s.includes(',') ? s.split(',').map((x) => x.trim()).reverse().join(' ') : s);

// Dene: adrese `?canli-deneme=<tur kimliği>` eklenirse, o Lichess turu (bitmiş bir yayın olabilir) maç başlamış gibi gösterilir.
const demoRound = () => {
  if (typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get('canli-deneme');
  return id && /^[A-Za-z0-9]{8}$/.test(id) ? id : null;
};


// Stockfish analizi (eval-bar.ts her konum için `cp-sf` olayı yollar): sol paneldeki skor, derinlik ve en iyi varyant.
type Sf = { cp: number | null; mate: number | null; depth: number; pv: string[]; fen: string };
const FIG: Record<string, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' };
const figurine = (san: string) => san.replace(/^[KQRBN]/, (c) => FIG[c]);
function pvText(fen: string, pv: string[]): string {
  try {
    const g = new Chess(fen);
    const parts: string[] = [];
    let n = g.moveNumber();
    let first = true;
    for (const u of pv.slice(0, 8)) {
      const white = g.turn() === 'w';
      const mv = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (white) parts.push(`${n}. ${figurine(mv.san)}`);
      else parts.push(first ? `${n}… ${figurine(mv.san)}` : figurine(mv.san));
      if (!white) n++;
      first = false;
    }
    return parts.join(' ');
  } catch { return ''; }
}
function evalText(sf: Sf): { num: string; label: string; white: number } {
  if (sf.mate !== null) {
    const m = sf.mate;
    return { num: `${m > 0 ? '+' : '−'}M${Math.abs(m)}`, label: `${m > 0 ? 'Beyaz' : 'Siyah'} ${Math.abs(m)} hamlede mat yapıyor`, white: m > 0 ? 100 : 0 };
  }
  const cp = sf.cp ?? 0;
  const a = Math.abs(cp);
  const side = cp > 0 ? 'Beyaz' : 'Siyah';
  const label = a < 30 ? 'Eşit' : a < 100 ? `${side} hafif üstün` : a < 300 ? `${side} üstün` : a < 600 ? `${side} açık üstün` : `${side} kazanıyor`;
  return { num: `${cp > 0 ? '+' : cp < 0 ? '−' : ''}${(a / 100).toFixed(1)}`, label, white: 100 / (1 + Math.exp(-cp / 400)) };
}

export default function LiveMatch({ ready }: { ready: boolean }) {
  const demo = useMemo(demoRound, []);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  const [rounds, setRounds] = useState<Round[]>(FALLBACK);
  const [pick, setPick] = useState<string | null>(null);
  const [pgns, setPgns] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const list = demo ? [{ id: demo, name: 'Game 1', startsAt: 0 }] : rounds;
  const start = list[0].startsAt;
  const live = mounted && now >= start;

  // Tur listesi (başlangıç saatleri değişirse, kaydırılan oyun günleri için): maçtan önce dakikada bir, sonra da seyrek.
  useEffect(() => {
    if (demo) return;
    let off = false;
    const go = () => fetch(`${API}/api/broadcast/${TOUR}`).then((r) => r.json()).then((d) => {
      const rs = (d?.rounds ?? []).filter((r: Round) => r.startsAt).map((r: Round) => ({ id: r.id, name: r.name, startsAt: r.startsAt, finished: r.finished }));
      if (!off && rs.length) setRounds(rs);
    }).catch(() => {});
    go();
    const t = window.setInterval(go, 60_000);
    return () => { off = true; window.clearInterval(t); };
  }, [demo]);

  // Gösterilen tur: okurun seçtiği, yoksa başlamış olanların sonuncusu.
  const started = list.filter((r) => r.startsAt <= now);
  const current = started[started.length - 1];
  const shown = (pick && started.find((r) => r.id === pick)) || current;
  const finishedShown = !!shown && (shown.finished || /^(1-0|0-1|1\/2-1\/2)$/.test(tag(pgns[shown.id] ?? '', 'Result')));

  const fetchPgn = (id: string) => fetch(`${API}/api/broadcast/round/${id}.pgn`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
    .then((t) => { setFailed(false); setPgns((p) => (p[id] === t ? p : { ...p, [id]: t })); })
    .catch(() => setFailed(true));
  useEffect(() => {
    if (!live || !shown) return;
    fetchPgn(shown.id);
    if (finishedShown && pgns[shown.id]) return;
    const t = window.setInterval(() => fetchPgn(shown.id), POLL_MS);
    return () => window.clearInterval(t);
  }, [live, shown?.id, finishedShown]); // eslint-disable-line react-hooks/exhaustive-deps
  // Skor için daha önce biten turların sonuçları bir kez alınır.
  useEffect(() => {
    if (!live || demo) return;
    started.filter((r) => r.id !== shown?.id && !pgns[r.id]).forEach((r) => { fetchPgn(r.id); });
  }, [live, started.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const pgn = shown ? clean(pgns[shown.id] ?? '') : '';
  const hasMoves = !!pgn && plies(pgn) > 0;
  const idle = !live || !hasMoves;
  const src = idle ? IDLE_PGN : pgn;

  // Skor (Gukesh – Sindarov): sonucu belli turlar.
  const score = useMemo(() => {
    let g = 0, s = 0, done = 0;
    for (const r of started) {
      const p = pgns[r.id]; if (!p) continue;
      const res = tag(p, 'Result'); if (!/^(1-0|0-1|1\/2-1\/2)$/.test(res)) continue;
      const gWhite = /gukesh/i.test(tag(p, 'White'));
      const [a, b] = res === '1-0' ? [1, 0] : res === '0-1' ? [0, 1] : [.5, .5];
      g += gWhite ? a : b; s += gWhite ? b : a; done++;
    }
    return { g, s, done };
  }, [pgns, started.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : `${Math.floor(n) || ''}½`);

  const [sf, setSf] = useState<Sf | null>(null);
  const [engineOn, setEngineOn] = useState(engineEnabled);
  useEffect(() => {
    const on = () => { setEngineOn(engineEnabled()); if (!engineEnabled()) setSf(null); };
    window.addEventListener('cp-sf-toggle', on);
    return () => window.removeEventListener('cp-sf-toggle', on);
  }, []);
  const board = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = board.current;
    if (!el) return;
    const on = (e: Event) => setSf((e as CustomEvent<Sf>).detail);
    el.addEventListener('cp-sf', on);
    return () => el.removeEventListener('cp-sf', on);
  }, []);
  useEffect(() => { if (idle) setSf(null); }, [idle]);
  const ev = sf && !idle && engineOn ? evalText(sf) : null;
  const line = sf && !idle && engineOn ? pvText(sf.fen, sf.pv) : '';

  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;
    const old = el.querySelector('pgn-player') as (HTMLElement & { _engine?: { state: { moves: unknown[]; index: number } } }) | null;
    const eng = old?._engine;
    const prevLen = eng?.state.moves.length ?? 0;
    const prevIdx = eng?.state.index ?? 0;
    const follow = !eng || old?.dataset.idle === '1' || prevIdx >= prevLen;
    el.innerHTML = `<div class="cp-loading">Oyun yükleniyor...</div><pgn-player data-idle="${idle ? 1 : 0}">\n${esc(src)}\n</pgn-player>`;
    if (idle) return;
    const p = el.querySelector('pgn-player') as (HTMLElement & { ready?: Promise<unknown>; _engine?: { goTo(n: number): void; state: { moves: unknown[] } } }) | null;
    let dead = false;
    p?.ready?.then(() => {
      const e = p._engine; if (dead || !e) return;
      const n = e.state.moves.length;
      e.goTo(follow ? n : Math.min(prevIdx, n));
    }).catch(() => {});
    return () => { dead = true; };
  }, [src, ready, idle]);

  const left = Math.max(0, start - now);
  const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1e3) % 60;
  const white = nm(tag(pgn, 'White')), black = nm(tag(pgn, 'Black'));
  const result = tag(pgn, 'Result');
  const roundNo = shown ? list.indexOf(shown) + 1 : 0;

  return (
    <section className={`live-match${live ? ' is-live' : ''}`} aria-label="Dünya Şampiyonası 2026 canlı yayını">
      <p className="live-kicker f-mono">
        {live ? <><i className="live-dot" aria-hidden="true" />Canlı</> : 'Çok yakında'}<span aria-hidden="true"> · </span>Dünya Şampiyonası 2026
      </p>
      <h2 className="live-title f-display">Gukesh <span>–</span> Sindarov</h2>
      <div className="live-vs">
        <div><img src={`${import.meta.env.BASE_URL}images/dunya-gukesh.jpg`} alt="" loading="lazy" /><p><b>Gukesh Dommaraju</b><span className="f-mono">Hindistan · 2710</span></p></div>
        <div><img src={`${import.meta.env.BASE_URL}images/dunya-sindarov.jpg`} alt="" loading="lazy" /><p><b>Javokhir Sindarov</b><span className="f-mono">Özbekistan · 2782</span></p></div>
      </div>
      {live && !demo && (
        <p className="live-score f-mono" aria-label="Maç skoru">
          <b>Gukesh {fmt(score.g)}</b><span> – </span><b>{fmt(score.s)} Sindarov</b>
        </p>
      )}
      {live && !demo && (
        <div className="live-rounds" role="tablist" aria-label="Oyunlar">
          {list.map((r, i) => {
            const ok = r.startsAt <= now;
            return <button key={r.id} role="tab" aria-selected={shown?.id === r.id} disabled={!ok} className={`f-mono${shown?.id === r.id ? ' on' : ''}`} onClick={() => setPick(r.id === current?.id ? null : r.id)}>{i + 1}</button>;
          })}
        </div>
      )}
      <div className="live-stage">
        <aside className={`live-sf${ev ? '' : ' is-wait'}${engineOn ? '' : ' is-off'}`} aria-label="Stockfish canlı analizi" aria-live="off">
          <div className="live-sf-head f-mono">
            <img src={`${import.meta.env.BASE_URL}stockfish/logo.png`} alt="" width="22" height="22" />
            <span>Stockfish 19 · canlı analiz</span>
            <button type="button" role="switch" aria-checked={engineOn} aria-label="Stockfish analizi" title={engineOn ? 'Analizi durdur' : 'Analizi başlat'} className="live-sf-switch" onClick={() => setEngineEnabled(!engineOn)}><i /></button>
          </div>
          <p className="live-sf-num f-display">{ev ? ev.num : '—'}</p>
          <p className="live-sf-label">{ev ? ev.label : !engineOn ? 'Analiz durduruldu. Anahtarla yeniden başlatabilirsiniz.' : idle ? 'Maç başlayınca canlı konum analizi buradan izlenebilecek.' : 'Konum çözümleniyor…'}</p>
          <p className="live-sf-meta f-mono">{sf && !idle && engineOn ? `Derinlik ${sf.depth}` : '\u00a0'}</p>
          <p className="live-sf-pv-title f-mono">En iyi devam yolu</p>
          <p className="live-sf-pv">{line || '—'}</p>
        </aside>
        <div ref={board} className={`cp-game live-board${idle ? ' live-idle' : ''}`} aria-disabled={idle} {...(idle ? { inert: '' } : {})}>
          <div ref={host} />
        </div>
      </div>
      {live && hasMoves && (
        <p className="live-status f-mono">
          {roundNo}. oyun · Beyaz: {white} · Siyah: {black} · {result && result !== '*' ? `Sonuç ${result.replace('1/2-1/2', '½–½')}` : 'Oyun sürüyor'}
        </p>
      )}
      {live && !hasMoves && <p className="live-status f-mono">{failed ? 'Canlı veriye ulaşılamadı' : 'İlk hamle bekleniyor…'}{shown && <> · <a href={`https://lichess.org/broadcast/-/-/${shown.id}`} target="_blank" rel="noopener noreferrer">Lichess’te izle</a></>}</p>}
      {!live && mounted && (
        <div className="live-count" role="timer" aria-label="Birinci oyuna kalan süre">
          <p className="live-count-label f-mono">1. oyuna kalan süre</p>
          <div className="live-count-grid">
            {[[d, 'gün'], [h, 'saat'], [m, 'dakika'], [s, 'saniye']].map(([v, l]) => (
              <div key={l as string} className="live-cell"><span className="live-num f-display">{two(v as number)}</span><span className="live-unit f-mono">{l}</span></div>
            ))}
          </div>
          <p className="live-when f-mono">24 Kasım 2026 · 17.00 (Türkiye saati) · Cenevre</p>
        </div>
      )}
    </section>
  );
}
