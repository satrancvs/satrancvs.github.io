import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SfPanel from '@/components/SfPanel';
import { usePlayerLoaded } from '@/lib/use-player-loaded';
import SectionLink from '@/components/SectionLink';
import LiveVideo, { streamThumb, useFideVideos } from '@/components/LiveVideo';
import { centerCard } from '@/lib/center-card';
import { API, FALLBACK, TOUR, gameStreamOf, pickGameStream, tag } from '@/lib/championship';
import type { Round } from '@/lib/championship';
import type { SectionTarget } from '@/components/SectionLink';

// Dünya Şampiyonası 2026 (Gukesh – Sindarov) canlı bölümü. Yazıda yalnızca `[CANLI MAÇ]` yazan bir paragraf bu bileşeni çizer.
//  - Maç başlamadan: renksiz, tıklanamaz, boş bir <pgn-player> ve altında 1. oyuna geri sayım.
//  - Maç başlayınca: Lichess'in resmî FIDE yayınından (herkese açık, CORS açık PGN uç noktası) 10 saniyede bir çekilen oyun canlı oynatılır;
//    okuyucu geride bir hamledeyse konumu korunur, sondaysa yeni hamleyle birlikte sona gider.
// Yayın kimliği ve tur kimlikleri Lichess'in `/api/broadcast/<TOUR>` yanıtından gelir (alttaki liste, ağ yanıt vermezse yedektir).
const POLL_MS = 10_000;

const IDLE_PGN = '[Event "Dünya Şampiyonası 2026"]\n[White "Gukesh Dommaraju"]\n[Black "Javokhir Sindarov"]\n[Result "*"]\n\n1. e4 *';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const plies = (pgn: string) => {
  const body = pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ');
  return body.split(/\s+/).filter(Boolean).length;
};
// Yorumlar (saat/değerlendirme) oynatıcıda gürültü yapar; hamleler ve künye kalır.
// Bir turun PGN'i birden çok oyun içerebilir (test için seçilen çok tahtalı turlar): tek tahta gösterildiği için yalnızca ilk oyun alınır (durum satırı da ilk oyundan okunur).
const firstGame = (pgn: string) => pgn.trim().split(/\n\s*\n(?=\[Event )/)[0];
const clean = (pgn: string) => firstGame(pgn).replace(/\{[^}]*\}/g, ' ').replace(/[ \t]+/g, ' ').trim();
// Lichess PGN'inde her hamlenin ardından { [%clk h:mm:ss] } vardır: oyuncuların kalan süreleri hamle sırasına göre okunur.
const clocks = (pgn: string) => [...firstGame(pgn).matchAll(/\[%clk (\d+:\d{2}:\d{2})(?:\.\d+)?\]/g)].map((m) => m[1]);
const clk = (t: string) => t.replace(/^0:/, '');
const two = (n: number) => String(n).padStart(2, '0');
const nm = (s: string) => (s.includes(',') ? s.split(',').map((x) => x.trim()).reverse().join(' ') : s);

export default function LiveMatch({ ready, onLoaded, next }: { ready: boolean; onLoaded?: () => void; next?: SectionTarget | SectionTarget[] }) {
  const videos = useFideVideos();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  const [rounds, setRounds] = useState<Round[]>(FALLBACK);
  const [pick, setPick] = useState<string | null>(null);
  const [pgns, setPgns] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [analysing, setAnalysing] = useState(false); // okur tahtada serbest analiz yapıyor: canlı güncelleme oynatıcıyı yeniden kurmaz
  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const list = rounds;
  const start = list[0].startsAt;
  const live = mounted && now >= start;

  // Tur listesi (başlangıç saatleri değişirse, kaydırılan oyun günleri için): maçtan önce dakikada bir, sonra da seyrek.
  useEffect(() => {
    let off = false;
    const go = () => fetch(`${API}/api/broadcast/${TOUR}`).then((r) => r.json()).then((d) => {
      const rs = (d?.rounds ?? []).filter((r: Round) => r.startsAt).map((r: Round) => ({ id: r.id, name: r.name, startsAt: r.startsAt, finished: r.finished }));
      if (!off && rs.length) setRounds(rs);
    }).catch(() => {});
    go();
    const t = window.setInterval(go, 60_000);
    return () => { off = true; window.clearInterval(t); };
  }, []);

  // Gösterilen tur: okurun seçtiği, yoksa başlamış olanların sonuncusu.
  // Oyunlar arası (son başlayan tur bitti, sonraki tur var): okur bir oyun seçmediyse tahta SONRAKİ oyuna hazırdır (başlangıç konumu, geri sayım sol sütunda); bitmiş oyun şeritten seçilince tahtaya gelir.
  const started = list.filter((r) => r.startsAt <= now);
  const current = started[started.length - 1];
  const upcoming = list.find((r) => r.startsAt > now);
  const curDone = !!current && (current.finished || /^(1-0|0-1|1\/2-1\/2)$/.test(tag(pgns[current.id] ?? '', 'Result')));
  const between = live && !!upcoming && curDone;
  const nextReady = between && !pick;
  const shown = (pick && started.find((r) => r.id === pick)) || (nextReady ? upcoming : current);
  const finishedShown = !!shown && (shown.finished || /^(1-0|0-1|1\/2-1\/2)$/.test(tag(pgns[shown.id] ?? '', 'Result')));

  const fetchPgn = (id: string) => fetch(`${API}/api/broadcast/round/${id}.pgn`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
    .then((t) => { setFailed(false); setPgns((p) => (p[id] === t ? p : { ...p, [id]: t })); })
    .catch(() => setFailed(true));
  useEffect(() => {
    if (!live || !shown || nextReady) return; // sonraki oyuna hazırken (başlamamış tur) PGN istenmez
    fetchPgn(shown.id);
    if (finishedShown && pgns[shown.id]) return;
    const t = window.setInterval(() => fetchPgn(shown.id), POLL_MS);
    return () => window.clearInterval(t);
  }, [live, shown?.id, finishedShown, nextReady]); // eslint-disable-line react-hooks/exhaustive-deps
  // Skor için daha önce biten turların sonuçları bir kez alınır.
  useEffect(() => {
    if (!live) return;
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

  const board = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const firstRail = useRef(true);
  useEffect(() => { if (!live) return; centerCard(rail.current, !firstRail.current); firstRail.current = false; }, [shown?.id, live]); // seçili oyun kartı şeritte ortaya gelir
  // Analiz başladığındaki hamle sayısı: analiz sürerken gelen yeni hamleler uyarı olarak gösterilir.
  const base = useRef(0);
  const total = hasMoves ? plies(pgn) : 0;
  useEffect(() => { if (analysing) base.current = total; }, [analysing]); // eslint-disable-line react-hooks/exhaustive-deps
  // Okur sayfada başka yerdeyken canlı oyuna yeni hamle gelirse sayfa kaymaz: "Canlı" noktası yanıp söner ve ekranda küçük bir uyarı çıkar; tıklayınca diyagrama kaydırılır.
  const [inView, setInView] = useState(true);
  const [alert, setAlert] = useState(false);
  const [above, setAbove] = useState(false); // tahta ekranın üstünde kaldıysa uyarıdaki ok yukarı bakar
  const seenTotal = useRef({ id: '', n: 0 }); // en son görülen tur ve hamle sayısı
  useEffect(() => {
    const el = board.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => { setInView(e.isIntersecting); setAbove(e.boundingClientRect.top < 0); }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    // Uyarı yalnızca sürmekte olan bir oyuna YENİ hamle gelirse çıkar: ilk yükleme (0 → N), tur değişimi ve biten oyun uyarı vermez.
    const id = shown?.id ?? '';
    const prev = seenTotal.current;
    if (live && prev.id === id && prev.n > 0 && total > prev.n && !finishedShown && !inView) setAlert(true);
    seenTotal.current = { id, n: total };
    if (!live || finishedShown) setAlert(false);
  }, [total, shown?.id, live, finishedShown]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (inView) setAlert(false); }, [inView]);
  const toBoard = () => { setAlert(false); board.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  const fresh = analysing ? Math.max(0, total - base.current) : 0;
  usePlayerLoaded(board, !!onLoaded, onLoaded);

  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el || !ready || analysing) return;
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
  }, [src, ready, idle, analysing]);
  useEffect(() => {
    const el = board.current;
    if (!el) return;
    const on = (e: Event) => setAnalysing(!!(e as CustomEvent<{ on: boolean }>).detail?.on);
    el.addEventListener('cp-analysis', on);
    return () => el.removeEventListener('cp-analysis', on);
  }, []);

  // Okurun gördüğü konum (oynatıcının hamle sırası): kalan süreler o konumdaki saatlerdir.
  const [ply, setPly] = useState(0);
  useEffect(() => {
    if (idle) { setPly(0); return; }
    const t = window.setInterval(() => {
      const e = (host.current?.querySelector('pgn-player') as (HTMLElement & { _engine?: { state: { index: number } } }) | null)?._engine;
      if (e) setPly((v) => (v === e.state.index ? v : e.state.index));
    }, 250);
    return () => window.clearInterval(t);
  }, [idle, src]);
  const raw = shown ? pgns[shown.id] ?? '' : '';
  const clks = useMemo(() => clocks(raw), [raw]);
  const startClk = (() => { const m = /^(\d+)'/.exec(tag(raw, 'TimeControl')); return m ? `${Math.floor(+m[1] / 60)}:${two(+m[1] % 60)}:00` : ''; })();
  const clockOf = (name: string) => {
    if (idle || !clks.length) return '';
    const isWhite = nm(tag(raw, 'White')).toLowerCase().includes(name);
    const isBlack = nm(tag(raw, 'Black')).toLowerCase().includes(name);
    if (!isWhite && !isBlack) return '';
    const k = Math.min(ply, clks.length);
    let last = '';
    for (let i = k - 1; i >= 0; i--) if ((i % 2 === 0) === isWhite) { last = clks[i]; break; }
    return clk(last || startClk);
  };
  const gClock = clockOf('gukesh'), sClock = clockOf('sindarov');

  const target = between && upcoming ? upcoming.startsAt : start;
  const nextNo = upcoming ? list.indexOf(upcoming) + 1 : 1;
  const left = Math.max(0, target - now);
  const h = Math.floor(left / 36e5), m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1e3) % 60;
  const white = nm(tag(pgn, 'White')), black = nm(tag(pgn, 'Black'));
  const result = tag(pgn, 'Result');
  const roundNo = shown ? list.indexOf(shown) + 1 : 0;
  const stream = pickGameStream(videos, roundNo || 1); // sağ üstteki video: gösterilen oyunun yayını
  // Oyunların kart kapakları: o oyunun kendi yayın videosunun kapak resmi (yayın yoksa numara).
  // Beyaz taşları kimin oynadığı: PGN künyesi; PGN yoksa (oyun başlamadı) renkler her turda değişir (1. oyunda Beyaz Sindarov, 2. oyunda Gukesh).
  const whiteTag = tag(raw, 'White');
  const cardStream = (i: number) => gameStreamOf(videos, i + 1);
  const gukeshWhite = whiteTag ? /gukesh/i.test(whiteTag) : roundNo % 2 === 0;

  // Geri sayım, canlı yayın başlayana kadar sol sütunun altında (Stockfish kartının altında) durur.
  const count = (!live || between) && mounted ? (
    <div className="live-sf-intro live-sf-count">
      <div className="live-count" role="timer" aria-label={`${nextNo}. oyuna kalan süre`}>
        {between && upcoming && (
          <p className="live-count-label f-mono">{nextNo}. oyuna kalan süre<span className="live-count-when">{new Date(upcoming.startsAt).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}</span></p>
        )}
        <div className="live-count-grid" style={{ gridTemplateColumns: `repeat(${h > 0 ? 3 : 2}, 1fr)` }}>
          {[...(h > 0 ? [[h, 'saat']] : []), [m, 'dakika'], [s, 'saniye']].map(([v, l]) => (
            <div key={l as string} className="live-cell"><span className="live-num f-display">{two(v as number)}</span><span className="live-unit f-mono">{l}</span></div>
          ))}
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <section className={`live-match${live ? ' is-live' : ''}`} aria-label="Dünya Şampiyonası 2026 canlı yayını">
      {!live && <p className="live-kicker f-mono">Çok yakında<span aria-hidden="true"> · </span>Dünya Şampiyonası 2026</p>}
      {!live && <p className="live-when f-mono">24 Kasım 2026 · 17.00 (TR saati) · Cenevre</p>}
      <div className="live-vs">
        {([
          { k: 'g', img: 'dunya-fide-gukesh.jpg', left: '-53%', name: 'Gukesh Dommaraju', meta: 'Hindistan · 2710', clock: gClock, short: 'Gukesh' },
          { k: 's', img: 'dunya-fide-sindarov.jpg', left: '-56%', name: 'Javokhir Sindarov', meta: 'Özbekistan · 2782', clock: sClock, short: 'Sindarov' },
        ].sort((a, b) => (a.k === (gukeshWhite ? 'g' : 's') ? -1 : b.k === (gukeshWhite ? 'g' : 's') ? 1 : 0))).map((p) => (
          <div key={p.k} className={`vs-${(p.k === 'g') === gukeshWhite ? 'white' : 'black'}`}><span className="vs-photo"><img src={`${import.meta.env.BASE_URL}images/${p.img}`} alt="" style={{ left: p.left }} loading="lazy" /></span><i className="vs-side" aria-hidden="true">♚</i><p><b>{p.name}</b><span className="f-mono"><em>{(p.k === 'g') === gukeshWhite ? 'Beyaz' : 'Siyah'}</em> · {p.meta}</span></p>{p.clock && <i className="vs-clock f-mono" title="Kalan süre" aria-label={`${p.short} kalan süre ${p.clock}`}>{p.clock}</i>}</div>
        ))}
      </div>
      {live && (
        <p className="live-score f-mono" aria-label="Maç skoru">
          <b>Gukesh {fmt(score.g)}</b><span> – </span><b>{fmt(score.s)} Sindarov</b>
        </p>
      )}
      {alert && !inView && createPortal(
        <button type="button" className="live-alert f-mono" onClick={toBoard} aria-label="Canlı oyunda yeni hamle oynandı; diyagrama git">
          <i className="live-dot live-dot-alert" aria-hidden="true" />Canlı · yeni hamle<span aria-hidden="true">{above ? ' ↑' : ' ↓'}</span>
        </button>, document.body)}
      <div className="live-stage">
        <SfPanel brand boardRef={board} idle={false} intro={analysing ? (
          <div className="live-sf-intro">
            {fresh > 0 && <div className="sf-intro-card live-newmove" role="status"><p>Canlı oyunda {fresh} yeni hamle oynandı.</p></div>}
          <button type="button" className="sf-intro-back" aria-label="Canlı konuma dön" title="Canlı konuma dön" onClick={() => board.current?.querySelector('pgn-player')?.dispatchEvent(new CustomEvent('cp-analysis-exit'))}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
            Canlı konuma dön
          </button>
          </div>
        ) : count} idleText="Maç başlayınca canlı konum analizi buradan izlenebilecek." />
        <div ref={board} className={`cp-game live-board${idle ? ' live-wait' : ''}`}>
          <p className="live-video-label live-board-label f-mono"><i className={`live-dot${alert ? ' live-dot-alert' : ''}`} aria-hidden="true" /><span lang="en">Lichess</span> canlı yayını</p>
          <div ref={host} />
        </div>
      </div>
      {live && (
        <div className="live-rail mpb-rails" ref={rail}>
          <div className="mpb-track" role="list" aria-label="Oyunlar">
            {list.map((r, i) => {
              const ok = r.startsAt <= now;
              const on = shown?.id === r.id;
              const res = tag(pgns[r.id] ?? '', 'Result');
              const done = /^(1-0|0-1|1\/2-1\/2)$/.test(res);
              const when = done ? `Sonuç: ${res.replace('1/2-1/2', '½–½').replace('-', '–')}` : ok ? 'Oyun sürüyor' : new Date(r.startsAt).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
              return (
                <button key={r.id} type="button" role="listitem" disabled={!ok && !(between && r.id === upcoming?.id)} aria-current={on ? 'true' : undefined} title={`${i + 1}. oyun`}
                  className={`mpb-card rd-card${on ? ' on' : ''}${ok ? '' : ' rd-off'}`} onClick={() => setPick(between ? (r.id === upcoming?.id ? null : r.id) : r.id === current?.id ? null : r.id)}>
                  <span className="mpb-thumb rd-thumb">
                    {cardStream(i) ? <img className="rd-photo" src={streamThumb(cardStream(i)!.id)} alt="" loading="lazy" /> : null}
                    <span className={`rd-num f-display${cardStream(i) ? ' rd-num-photo' : ''}`}>{i + 1}</span>
                    {on ? <span className="mpb-now f-mono">{ok ? '▶ İzleniyor' : '▶ Sıradaki'}</span> : ok && !done ? <span className="mpb-now f-mono rd-live">● Canlı</span> : null}
                  </span>
                  <span className="mpb-name"><b className="f-display">{i + 1}. oyun</b><span>{when}</span></span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {live && !hasMoves && !nextReady && <p className="live-status f-mono">{failed ? 'Canlı veriye ulaşılamadı' : 'İlk hamle bekleniyor…'}</p>}
      <LiveVideo key={stream?.id} video={stream} />
      {next && <div className="live-nexts">{(Array.isArray(next) ? next : [next]).map((t) => <SectionLink key={t.id} target={t} />)}</div>}
    </section>
  );
}
