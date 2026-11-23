import { useEffect, useMemo, useRef, useState } from 'react';
import SectionLink from '@/components/SectionLink';
import type { SectionTarget } from '@/components/SectionLink';

// "Maçtan görüntüler" bölümü (Dünya Şampiyonası 2026 yazısı): maç seçiciyle aynı görünümde bir video oynatıcı.
// İlk video sabittir (açılış töreni özeti); ardından FIDE chess kanalının (@FIDE_chess) son videoları gelir (public/fide-videos.json,
// scripts/fetch-fide-videos.mjs derleme sırasında yazar). Video, oynat düğmesine basılınca yüklenir (YouTube sayfa açılırken yüklenmez).
type Vid = { id: string; title: string; published?: string };

const PINNED: Vid = { id: 'tm9HPyYL50g', title: 'Highlights | Opening Ceremony | Salesforce FIDE World Championship 2026', published: '2026-11-23T00:17:01+00:00' };
const two = (n: number) => String(n).padStart(2, '0');
const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const day = (iso?: string, month: 'long' | 'short' = 'long') => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(+d) ? d.toLocaleDateString('tr-TR', { day: 'numeric', month, ...(month === 'long' ? { year: 'numeric' } : {}) }) : '';
};

export default function VideoPlaylist({ ready = true, next }: { ready?: boolean; next?: SectionTarget }) {
  const [feed, setFeed] = useState<Vid[]>([]);
  const [idx, setIdx] = useState(0);
  const [started, setStarted] = useState(false); // YouTube iframe'i yalnızca okur oynatınca yüklenir
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ready) return;
    let off = false;
    fetch(`${import.meta.env.BASE_URL}fide-videos.json`).then((r) => r.json()).then((d) => { if (!off && Array.isArray(d?.videos)) setFeed(d.videos); }).catch(() => {});
    return () => { off = true; };
  }, [ready]);
  const items = useMemo(() => [PINNED, ...feed.filter((v) => v.id !== PINNED.id)], [feed]);
  const cur = items[Math.min(idx, items.length - 1)];
  const nextIdx = (idx + 1) % items.length;
  const nx = items[nextIdx];

  const go = (n: number, scrollTop = false) => {
    setIdx(n); setStarted(true);
    if (scrollTop) root.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  useEffect(() => {
    (root.current?.querySelector('.mpb-card.on') as HTMLElement | null)?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [idx]);

  return (
    <section ref={root} className="picker vp scroll-mt-8" aria-label="FIDE videoları">
      <div className="mpb-main">
        <div className="mpa-frame" role="group" aria-label="Video oynatıcı">
          <div className="mpa-bar">
            <span className="mpa-led" aria-hidden="true" />
            <span className="mpa-ch f-mono">VİDEO {two(idx + 1)}<span aria-hidden="true">/{two(items.length)}</span></span>
            <span className="mpa-title f-display">{cur.title}</span>
          </div>
          <div className="mpa-screen">
            <div className="vp-embed" key={cur.id}>
              {started ? (
                <iframe src={`https://www.youtube.com/embed/${cur.id}?rel=0&iv_load_policy=3&playsinline=1&autoplay=1`} title={cur.title} loading="lazy"
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
          {day(cur.published) && <p className="mpb-blurb">{day(cur.published)}</p>}
          {items.length > 1 && (
            <button type="button" className="mpb-nextcard" onClick={() => go(nextIdx)} aria-label={`Sıradaki video: ${nx.title}`}>
              <span className="mpb-nextcard-thumb"><img src={thumb(nx.id)} alt="" loading="lazy" /></span>
              <span className="mpb-nextcard-text">
                <span className="f-mono">Sıradaki video · {two(nextIdx + 1)}/{two(items.length)}</span>
                <b className="f-display">{day(nx.published, 'short')}</b>
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
                <span className="mpb-num f-mono">{two(i + 1)}</span>
                {i === idx && <span className="mpb-now f-mono">▶ İzleniyor</span>}
              </span>
              <span className="mpb-name"><b className="f-display">{day(v.published, 'short')}</b><span className="vp-clamp">{v.title}</span></span>
            </button>
          ))}
        </div>
      </div>
      {next && <div className="sec-link-wrap"><SectionLink target={next} /></div>}
    </section>
  );
}
