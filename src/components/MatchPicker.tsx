import { useEffect, useMemo, useRef, useState } from 'react';
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
const decadeLabel = (y: number) => `${Math.floor(y / 10) * 10}'ler`;

export default function MatchPicker({ items }: { items: PickItem[] }) {
  const [idx, setIdx] = useState(0);
  const [switching, setSwitching] = useState(false);
  const root = useRef<HTMLElement>(null);
  const first = useRef(true);
  const cur = items[idx];

  // Oyun değişince kısa parazit: ekran içeriği ikinci karede gelir.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSwitching(true);
    const t = window.setTimeout(() => setSwitching(false), 520);
    return () => window.clearTimeout(t);
  }, [idx]);

  const go = (n: number, scrollTv = false) => {
    setIdx(((n % items.length) + items.length) % items.length);
    if (scrollTv) root.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const shuffle = () => { let n = idx; while (items.length > 1 && n === idx) n = Math.floor(Math.random() * items.length); go(n); };

  const rows = useMemo(() => {
    const m = new Map<string, number[]>();
    items.forEach((c, i) => { const k = decadeLabel(c.year); m.set(k, [...(m.get(k) ?? []), i]); });
    return [...m.entries()];
  }, [items]);

  return (
    <section ref={root} className="picker scroll-mt-8" aria-label="Seçilmiş maçlar">
      <div className="mpb-main">
      <div className="mpa-frame" role="group" aria-label="Oyun oynatıcı">
        <div className="mpa-bar">
          <span className="mpa-led" aria-hidden="true" />
          <span className="mpa-ch f-mono">OYUN {two(idx + 1)}<span aria-hidden="true">/{two(items.length)}</span></span>
          <span className="mpa-title f-display">{cur.label}</span>
          <span className="mpa-btns">
            <button type="button" className="f-mono" onClick={() => go(idx - 1)} aria-label="Önceki oyun">◀ Önceki</button>
            <button type="button" className="f-mono" onClick={() => go(idx + 1)} aria-label="Sonraki oyun">Sonraki ▶</button>
            <button type="button" className="f-mono mpa-rand" onClick={shuffle} aria-label="Rastgele oyun">Rastgele</button>
          </span>
        </div>
        <div className="mpa-screen">
          <div className={`mpa-content${switching ? ' off' : ''}`} key={cur.id}>{cur.screen}</div>
          {switching && (
            <div className="mpa-noise" aria-hidden="true"><span className="mpa-osd f-mono">OYUN {two(idx + 1)}</span></div>
          )}
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
        {rows.map(([label, ids]) => (
          <div key={label} className="mpb-row">
            <h5 className="mpb-row-title f-mono">{label}</h5>
            <div className="mpb-track" role="list">
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
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
