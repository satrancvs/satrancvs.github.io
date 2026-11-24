import { useEffect, useMemo, useRef, useState } from 'react';
import SectionLink from '@/components/SectionLink';
import { centerCard } from '@/lib/center-card';
import { useChampionship } from '@/lib/championship';
import type { SectionTarget } from '@/components/SectionLink';

// "Maçtan görüntüler" bölümü (Dünya Şampiyonası 2026 yazısı): maç seçiciyle aynı görünümde bir video oynatıcı.
// Önce kanalın en yeni videosu oynar, sıra yeniden eskiye gider; akış alınamazsa açılış töreni özeti gösterilir.
// Liste FIDE kanalının (@FIDE_chess) son videolarıdır (public/fide-videos.json, scripts/fetch-fide-videos.mjs derleme sırasında yazar).
// Video, oynat düğmesine basılınca yüklenir (YouTube sayfa açılırken yüklenmez).
type Vid = { id: string; title: string; published?: string; live?: boolean };

// Oyun yayınları: FIDE'nin her oyun için açtığı canlı yayın videoları ("… | Game N | …" ve "… | No Commentary"). Canlı yayın sırasında en önce bunlar gelir
// (YouTube'un `embed/live_stream?channel=` adresi bu kanalda çalışmıyor: "video kullanılamıyor"; kimlikle gömülen yayın videosu canlıyken de oynar).
const isGameStream = (v: Vid) => /world championship/i.test(v.title) && (/\bgame\s*\d+/i.test(v.title) || /no commentary/i.test(v.title));
const BASE = import.meta.env.BASE_URL;
const PINNED: Vid = { id: 'tm9HPyYL50g', title: 'Highlights | Opening Ceremony | Salesforce FIDE World Championship 2026', published: '2026-11-23T00:17:01+00:00' };
const two = (n: number) => String(n).padStart(2, '0');
const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const embed = (id: string) => `https://www.youtube.com/embed/${id}?rel=0&iv_load_policy=3&playsinline=1&autoplay=1`;
const day = (iso?: string, month: 'long' | 'short' = 'long') => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(+d) ? d.toLocaleDateString('tr-TR', { day: 'numeric', month, ...(month === 'long' ? { year: 'numeric' } : {}) }) : '';
};

export default function VideoPlaylist({ ready = true, next }: { ready?: boolean; next?: SectionTarget }) {
  const [feed, setFeed] = useState<Vid[]>([]);
  const [selId, setSelId] = useState<string | null>(null); // seçili video (kimlikle: liste değişince oynayan video değişmez)
  const { phase, now } = useChampionship();
  const soon = phase.kind === 'live' || ((phase.kind === 'before' || phase.kind === 'between') && !!phase.at && phase.at - now <= 36e5);
  const [started, setStarted] = useState(false); // YouTube iframe'i yalnızca okur oynatınca yüklenir
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ready) return;
    let off = false;
    fetch(`${import.meta.env.BASE_URL}fide-videos.json`).then((r) => r.json()).then((d) => { if (!off && Array.isArray(d?.videos)) setFeed(d.videos); }).catch(() => {});
    return () => { off = true; };
  }, [ready]);
  // En yeni video başta ("Şimdi oynatılıyor"), ardından eskiye doğru; açılış töreni özeti akışta yoksa (akış yalnızca son videoları taşır) listenin sonuna eklenir.
  const items = useMemo(() => {
    const byDate = [...feed].sort((a, b) => +new Date(b.published ?? 0) - +new Date(a.published ?? 0)).map((v) => ({ ...v, live: isGameStream(v) }));
    const rest = byDate.some((v) => v.id === PINNED.id) ? byDate : [...byDate, PINNED];
    // Oyun yayınları başa ("Game N" yorumlu yayın, ardından yorumsuz), kalanlar yeniden eskiye. Yayın zamanı yaklaşmadıysa sıra yalnızca tarihe göredir.
    if (!soon) return rest.map((v) => ({ ...v, live: false }));
    const rank = (v: Vid) => (/\bgame\s*\d+/i.test(v.title) ? 0 : /no commentary/i.test(v.title) ? 1 : 2);
    return [...rest].sort((a, b) => (a.live === b.live ? 0 : a.live ? -1 : 1) || (a.live && b.live ? rank(a) - rank(b) || +new Date(b.published ?? 0) - +new Date(a.published ?? 0) : 0));
  }, [feed, soon]);
  const idx = Math.max(0, items.findIndex((v) => v.id === selId));
  const cur = items[idx];
  const nextIdx = (idx + 1) % items.length;
  const nx = items[nextIdx];

  const go = (n: number, scrollTop = false) => {
    setSelId(items[n].id); setStarted(true);
    if (scrollTop) root.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const firstCenter = useRef(true);
  useEffect(() => { centerCard(root.current, !firstCenter.current); firstCenter.current = false; }, [idx]);

  return (
    <section ref={root} className="picker vp scroll-mt-8" aria-label="FIDE videoları">
      <div className="mpb-main">
        <div className="mpa-frame" role="group" aria-label="Video oynatıcı">
          <div className="mpa-bar">
            <span className="mpa-led" aria-hidden="true" />
            <span className="mpa-ch f-mono">{cur.live ? 'OYUN YAYINI' : <>VİDEO {two(idx + 1)}<span aria-hidden="true">/{two(items.length)}</span></>}</span>
            <span className="mpa-title f-display">{cur.title}</span>
          </div>
          <div className="mpa-screen">
            <div className="vp-embed" key={cur.id}>
              {started ? (
                <iframe src={embed(cur.id)} title={cur.title} loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
              ) : (
                <button type="button" className="vp-poster" onClick={() => setStarted(true)} aria-label={`Videoyu oynat: ${cur.title}`}>
                  <img src={thumb(cur.id)} alt="" loading="lazy" />
                  <span className="vp-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mpb-info">
          <p className="mpb-kicker f-mono">Şimdi oynatılıyor</p>
          <h4 className="mpb-title f-display" key={cur.id}>{cur.title}</h4>
          {cur.live ? <p className="mpb-blurb">FIDE kanalının oyun yayını. Yayın henüz başlamadıysa video geri sayım gösterir.</p> : day(cur.published) && <p className="mpb-blurb">{day(cur.published)}</p>}
          {items.length > 1 && (
            <button type="button" className="mpb-nextcard" onClick={() => go(nextIdx)} aria-label={`Sıradaki video: ${nx.title}`}>
              <span className="mpb-nextcard-thumb"><img src={thumb(nx.id)} alt="" loading="lazy" /></span>
              <span className="mpb-nextcard-text">
                <span className="f-mono">Sıradaki video · {two(nextIdx + 1)}/{two(items.length)}</span>
                <b className="f-display">{nx.live ? 'Canlı yayın' : day(nx.published, 'short')}</b>
                <span className="vp-clamp">{nx.title}</span>
              </span>
              <span className="mpb-nextcard-arrow" aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>

      <div className="mpb-rails">
        <div className="mpb-track" role="list">
          {items.map((v, i) => (
            <button key={v.id} type="button" role="listitem" className={`mpb-card${i === idx ? ' on' : ''}`} aria-current={i === idx ? 'true' : undefined} onClick={() => go(i, true)} title={v.title}>
              <span className="mpb-thumb">
                <img src={thumb(v.id)} alt="" loading="lazy" />
                <span className={`mpb-num f-mono${v.live ? ' is-live' : ''}`}>{v.live ? '● CANLI' : two(i + 1)}</span>
                {i === idx && <span className="mpb-now f-mono">▶ İzleniyor</span>}
              </span>
              <span className="mpb-name"><b className="f-display">{v.live ? 'Canlı yayın' : day(v.published, 'short')}</b><span className="vp-clamp">{v.title}</span></span>
            </button>
          ))}
        </div>
      </div>
      {next && <div className="sec-link-wrap"><SectionLink target={next} /></div>}
    </section>
  );
}
