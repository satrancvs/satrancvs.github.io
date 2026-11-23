import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import Markdown from 'markdown-to-jsx';
import ProgressiveImage from '@/components/ProgressiveImage';
import SfPanel from '@/components/SfPanel';
import { usePlayerLoaded } from '@/lib/use-player-loaded';
import SectionLink from '@/components/SectionLink';
import type { SectionTarget } from '@/components/SectionLink';

// "Seçme: Her bir ünvan maçından bir oyun" bölümü (Dünya Şampiyonası 2026 yazısı): tek oynatıcı, ◀ ▶ ile oyun değiştirme, değişirken parazit,
// altında seçilen maçın özeti ve fotoğrafları, en altta on yıllara göre dizili kart rafları. Tek bir oyun ekranda bulunur: seçim değişince oynatıcı yeniden kurulur.
export type PickItem = {
  id: string;
  year: number;
  label: string; // "2016 · Carlsen – Karjakin"
  title: string; // "Carlsen – Karjakin"
  site: string;
  blurb: string; // satır içi markdown
  note?: string; // ilk hamleden önceki yorum (paragraflar boş satırla ayrılır): başlangıç konumunda sol sütunda gösterilir
  bio?: string; // oyuncu hakkında bilgi (satır içi markdown); o oyun izlenirken gösterilir
  thumb?: string; // kart görseli (public/ altındaki yol)
  figures: ReactNode;
  heading: ReactNode; // oyuncular (Elo ile) ve turnuva satırı
  screen: ReactNode;
};

const two = (n: number) => String(n).padStart(2, '0');
// Türkçe ek, on yılın adının son ünlüsüne göre: 2010'lar (on), 1990'lar (doksan), 1960'lar (altmış), 1940'lar (kırk), 1930'lar (otuz); 2020'ler (yirmi), 2000'ler (bin), 1980'ler (seksen), 1970'ler (yetmiş), 1950'ler (elli).
const decadeLabel = (y: number) => `${Math.floor(y / 10) * 10}'${[1, 3, 4, 6, 9].includes(Math.floor(y / 10) % 10) ? 'lar' : 'ler'}`;

// Oynatıcının (pgn-player) ayarları: oynatıcının gizli araç çubuğundaki düğmeleri sürer (PGN indir, tahtayı çevir). Hız bu ekranda 0,5x'e sabit.
function PlayerSettings({ screen }: { screen: RefObject<HTMLDivElement> }) {
  const press = (action: string) => (screen.current?.querySelector(`.settings-btn[data-action="${action}"]`) as HTMLButtonElement | null)?.click();
  return (
    <div className="sf-player-settings f-mono">
      <button type="button" onClick={() => press('flip')}>Tahtayı çevir</button>
      <button type="button" onClick={() => press('download')}>PGN indir</button>
    </div>
  );
}

// Oyunu başlatan/duraklatan düğme: ilk hamleden önceki yorum kartı oyun başlayınca kaybolur, düğme kalır (oynat ↔ duraklat). Durum oynatıcının motorundan okunur.
function PlayToggle({ screen, settingsOpen, onSettings }: { screen: RefObject<HTMLDivElement>; settingsOpen: boolean; onSettings: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [analysis, setAnalysis] = useState(false);
  const engine = () => (screen.current?.querySelector('pgn-player') as (HTMLElement & { _engine?: { state: { playing: boolean }; play(): void; pause(): void } }) | null)?._engine;
  useEffect(() => {
    const t = window.setInterval(() => { const e = engine(); if (e) setPlaying(!!e.state.playing); }, 250);
    const host = screen.current;
    const on = (e: Event) => setAnalysis(!!(e as CustomEvent<{ on: boolean }>).detail?.on);
    host?.addEventListener('cp-analysis', on);
    return () => { window.clearInterval(t); host?.removeEventListener('cp-analysis', on); };
  }, []);
  const toggle = () => { const e = engine(); if (!e) return; if (e.state.playing) e.pause(); else e.play(); setPlaying(!!e.state.playing); };
  return (
    <div className="sf-intro-btns">
      <button type="button" className="sf-intro-gear" aria-expanded={settingsOpen} aria-label="Oynatıcı ayarları" title="Oynatıcı ayarları" onClick={onSettings}>
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
      </button>
      {analysis ? (
        <button type="button" className="sf-intro-back" aria-label="Oyuna dön" title="Oyunun konumuna dön" onClick={() => screen.current?.querySelector('pgn-player')?.dispatchEvent(new CustomEvent('cp-analysis-exit'))}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
          Oyuna dön
        </button>
      ) : <button type="button" className="sf-intro-play" aria-label={playing ? 'Duraklat' : 'Oynat'} title={playing ? 'Duraklat' : 'Oynat'} onClick={toggle}>
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          {playing ? <><path d="M10 9v6" /><path d="M14 9v6" /></> : <path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z" />}
        </svg>
      </button>}
    </div>
  );
}

export default function MatchPicker({ items, flat = false, gate = true, onLoaded, next }: { items: PickItem[]; flat?: boolean; gate?: boolean; onLoaded?: () => void; next?: SectionTarget }) {
  const [idx, setIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const root = useRef<HTMLElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const cur = items[idx];
  const nextIdx = (idx + 1) % items.length;
  const nx = items[nextIdx];

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

  usePlayerLoaded(screen, gate, onLoaded);
  // Sırası gelmemiş seçici (üstteki canlı yayın yüklenene kadar): yer ayrılır, içerik çizilmez, sayfa daha hızlı açılır.
  if (!gate) return <section className="picker picker-wait" aria-busy="true" aria-label="Seçilmiş maçlar"><p className="f-mono">Yükleniyor…</p></section>;
  return (
    <section ref={root} className="picker scroll-mt-8" aria-label="Seçilmiş maçlar">
      <div className="mpb-main">
      <SfPanel boardRef={screen} idleText="Analiz ediliyor..." intro={cur.note ? (
        <div className="live-sf-intro" key={`intro-${cur.id}`}>
          {showSettings ? <div className="sf-intro-card sf-intro-settings"><PlayerSettings screen={screen} /></div> : <div className="sf-intro-card">{cur.note.split(/\n\n+/).map((t, i) => <p key={i}><Markdown options={{ forceInline: true }}>{t}</Markdown></p>)}</div>}
          <PlayToggle screen={screen} settingsOpen={showSettings} onSettings={() => setShowSettings((v) => !v)} />
        </div>
      ) : undefined} />
      <div className="mpa-frame" role="group" aria-label="Oyun oynatıcı">
        <div className="mpa-bar">
          <span className="mpa-led" aria-hidden="true" />
          <span className="mpa-ch f-mono">OYUN {two(idx + 1)}<span aria-hidden="true">/{two(items.length)}</span></span>
          <span className="mpa-title f-display">{cur.label}</span>
        </div>
        <div className="mpa-screen" ref={screen}>
          <div className="mpa-content" key={cur.id}>{cur.screen}</div>
        </div>
      </div>

      <div className="mpb-info">
        <p className="mpb-kicker f-mono">Şimdi oynatılıyor</p>
        <div className="mpb-hero" key={cur.id}>
          {cur.thumb ? <ProgressiveImage path={cur.thumb} alt="" thumb position="50% 25%" /> : <span className="mpb-noimg f-display">{cur.year}</span>}
          <span className="mpb-hero-num f-mono"><i className="mpa-led" />OYUN {two(idx + 1)}<span>/{two(items.length)}</span></span>
          <span className="mpb-hero-year f-display">{cur.year}</span>
          {cur.heading}
        </div>
        <h4 className="mpb-title f-display">{cur.label}</h4>
        {cur.blurb && <p className="mpb-blurb"><Markdown options={{ forceInline: true }}>{cur.blurb}</Markdown></p>}
        {idx === items.length - 1 ? (next ? <SectionLink target={next} /> : null) : items.length > 1 && (
          <button type="button" className="mpb-nextcard" onClick={() => go(nextIdx)} aria-label={`Sıradaki oyun: ${nx.label}`}>
            <span className="mpb-nextcard-thumb">
              {nx.thumb ? <ProgressiveImage path={nx.thumb} alt="" thumb position="50% 25%" /> : <span className="mpb-noimg f-display">{nx.year}</span>}
            </span>
            <span className="mpb-nextcard-text">
              <span className="f-mono">Sıradaki oyun · {two(nextIdx + 1)}/{two(items.length)}</span>
              <b className="f-display">{nx.year}</b>
              <span>{nx.title}</span>
            </span>
            <span className="mpb-nextcard-arrow" aria-hidden="true">→</span>
          </button>
        )}
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
      {cur.bio && <div className="mpb-bio-prose" key={`bio-${cur.id}`}><p><Markdown options={{ forceInline: true }}>{cur.bio}</Markdown></p></div>}
      {next && idx !== items.length - 1 && <div className="sec-link-wrap"><SectionLink target={next} /></div>}
    </section>
  );
}
