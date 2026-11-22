import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Markdown from 'markdown-to-jsx';
import ProgressiveImage from '@/components/ProgressiveImage';

// "Seçme: Her bir ünvan maçından bir oyun" bölümü (Dünya Şampiyonası 2026 yazısı): tek oynatıcı, ◀ ▶ ile oyun değiştirme, değişirken parazit,
// altında seçilen maçın özeti ve fotoğrafları, en altta on yıllara göre dizili kart rafları. Tek bir oyun ekranda bulunur: seçim değişince oynatıcı yeniden kurulur.
export type PickItem = {
  id: string;
  year: number;
  label: string; // "2016 · Carlsen – Karjakin"
  title: string; // "Carlsen – Karjakin"
  site: string;
  blurb: string; // satır içi markdown
  thumb?: string; // kart görseli (public/ altındaki yol)
  figures: ReactNode;
  screen: ReactNode;
};

const two = (n: number) => String(n).padStart(2, '0');
// Türkçe ek, on yılın adının son ünlüsüne göre: 2010'lar (on), 1990'lar (doksan), 1960'lar (altmış), 1940'lar (kırk), 1930'lar (otuz); 2020'ler (yirmi), 2000'ler (bin), 1980'ler (seksen), 1970'ler (yetmiş), 1950'ler (elli).
const decadeLabel = (y: number) => `${Math.floor(y / 10) * 10}'${[1, 3, 4, 6, 9].includes(Math.floor(y / 10) % 10) ? 'lar' : 'ler'}`;

export default function MatchPicker({ items, flat = false }: { items: PickItem[]; flat?: boolean }) {
  const [idx, setIdx] = useState(0);
  const root = useRef<HTMLElement>(null);
  const cur = items[idx];

  const go = (n: number, scrollTv = false) => {
    setIdx(((n % items.length) + items.length) % items.length);
    if (scrollTv) root.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const rows = useMemo(() => {
    // flat: tüm oyunlar tek sırada, yıllara bölünmeden
    if (flat) return [['', items.map((_, i) => i)]] as [string, number[]][];
    const m = new Map<string, number[]>();
    items.forEach((c, i) => { const k = decadeLabel(c.year); m.set(k, [...(m.get(k) ?? []), i]); });
    return [...m.entries()];
  }, [items, flat]);

  // Seçilen kart raf şeridinde görünür kalsın
  useEffect(() => {
    const el = root.current?.querySelector('.mpb-card.on') as HTMLElement | null;
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [idx]);

  return (
    <section ref={root} className="picker scroll-mt-8" aria-label="Seçilmiş maçlar">
      <div className="mpb-main">
      <div className="mpa-frame" role="group" aria-label="Oyun oynatıcı">
        <div className="mpa-bar">
          <span className="mpa-led" aria-hidden="true" />
          <span className="mpa-ch f-mono">OYUN {two(idx + 1)}<span aria-hidden="true">/{two(items.length)}</span></span>
          <span className="mpa-title f-display">{cur.label}</span>
        </div>
        <div className="mpa-screen">
          <div className="mpa-content" key={cur.id}>{cur.screen}</div>
        </div>
      </div>

      <div className="mpb-info">
        <p className="mpb-kicker f-mono">Şimdi oynatılıyor · {cur.site}</p>
        <h4 className="mpb-title f-display">{cur.label}</h4>
        <p className="mpb-blurb"><Markdown options={{ forceInline: true }}>{cur.blurb}</Markdown></p>
        {cur.figures && <div className="mpb-figs">{cur.figures}</div>}
      </div>

      </div>

      <div className="mpb-rails">
        <div className="mpb-track" role="list">
          {rows.map(([label, ids]) => (
            <Fragment key={label || 'tum'}>
              {!flat && <h5 className="mpb-row-title f-mono">{label}</h5>}
              {ids.map((i) => {
                const c = items[i];
                return (
                  <button key={c.id} type="button" role="listitem" className={`mpb-card${i === idx ? ' on' : ''}`} aria-current={i === idx ? 'true' : undefined}
                    onClick={() => go(i, true)} title={c.label}>
                    <span className="mpb-thumb">
                      {c.thumb ? <ProgressiveImage path={c.thumb} alt="" thumb position="50% 25%" /> : <span className="mpb-noimg f-display">{c.year}</span>}
                      <span className="mpb-num f-mono">{two(i + 1)}</span>
                      {i === idx && <span className="mpb-now f-mono">▶ İzleniyor</span>}
                    </span>
                    <span className="mpb-name"><b className="f-display">{c.year}</b><span>{c.title}</span></span>
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
