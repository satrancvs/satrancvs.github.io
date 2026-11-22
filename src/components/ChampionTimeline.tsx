import { useEffect, useRef } from 'react';
import Markdown from 'markdown-to-jsx';
import data from '@/data/champions-timeline.json';

// Dünya şampiyonlarının görsel zaman çizelgesi (Dünya Şampiyonası yazısı, "Geçmişte nasıldı?"): yazıda `[ZAMAN ÇİZELGESİ]` yazan paragraf bu bileşeni çizer.
// Veri src/data/champions-timeline.json'dadır: dönem başlıkları (era), şampiyonlar (name/years/won/kept) ve kural değişikliği notları (note).
// Yeniden eskiye doğru sıralıdır. Hücre metinleri satır içi markdown'dır (**kalın** = rakip adları).
type Entry = { era?: { years: string; name: string }; note?: { year: string; text: string }; name?: string; years?: string; won?: string; kept?: string };
const inline = { forceInline: true };
// "2013–23" gibi yıl aralıkları geniş ekranda sol sütunda büyük yazılır; "FIDE, 1999–2005" gibi uzun etiketler küçük kalır.
const simpleYears = (y?: string) => !!y && /^\d{4}[–-]\d{0,4}$/.test(y);

// Savunmalar noktalı virgülle ayrılmışsa satır satır liste olur (Carlsen, Kasparov...).
const parts = (s: string) => s.split(/;\s+(?=\d)/).map((x) => x.trim()).filter(Boolean);

// Kaydırma animasyonu (sade): omurga okurun konumuna göre dolar (--tl-p), kartlar/dönem başlıkları ilk görününce yumuşakça belirir (bir kez),
// omurga düğümü geçilen kartta dolar. Yalnızca opacity/transform kullanılır; `prefers-reduced-motion` ve JS yokken hepsi sabit görünür.
function useTimelineMotion(root: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.classList.add('tl-anim');
    const targets = el.querySelectorAll('.tl-item, .tl-era, .tl-note');
    const io = new IntersectionObserver((list) => {
      list.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    targets.forEach((t) => io.observe(t));
    const items = Array.from(el.querySelectorAll('.tl-item'));
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const trigger = window.innerHeight * 0.55;
      const p = Math.min(1, Math.max(0, (trigger - r.top) / r.height));
      el.style.setProperty('--tl-p', p.toFixed(4));
      items.forEach((it) => it.classList.toggle('is-reached', it.getBoundingClientRect().top + 26 < trigger));
    };
    const onScroll = () => { if (!raf) raf = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) window.cancelAnimationFrame(raf); el.classList.remove('tl-anim'); };
  }, [root]);
}

export default function ChampionTimeline() {
  const entries = data as Entry[];
  const root = useRef<HTMLDivElement>(null);
  useTimelineMotion(root);
  return (
    <div ref={root} className="tl" role="group" aria-label="Dünya şampiyonları zaman çizelgesi">
      {entries.map((e, i) => {
        if (e.era) {
          return (
            <div key={i} className="tl-era">
              <span className="tl-era-years f-display">{e.era.years}</span>
              <span className="tl-era-name f-mono">{e.era.name}</span>
            </div>
          );
        }
        if (e.note) {
          return (
            <div key={i} className="tl-note">
              <i aria-hidden="true" />
              <p><b className="f-mono">{e.note.year}</b><span><Markdown options={inline}>{e.note.text}</Markdown></span></p>
            </div>
          );
        }
        const kept = e.kept ? parts(e.kept) : [];
        return (
          <article key={i} className="tl-item">
            <i className="tl-dot" aria-hidden="true" />
            <span className={`tl-gutter${simpleYears(e.years) ? ' big f-display' : ' f-mono'}`} aria-hidden="true">{e.years}</span>
            <header className="tl-head">
              <h5 className="tl-name f-display">{e.name}</h5>
              <span className="tl-years f-mono">{e.years}</span>
            </header>
            <div className="tl-body">
              <div className="tl-col">
                <p className="tl-label f-mono">Ünvanı aldı</p>
                <p className="tl-text"><Markdown options={inline}>{e.won ?? ''}</Markdown></p>
              </div>
              <div className="tl-col">
                <p className="tl-label f-mono">Savunma ve kayıp</p>
                {kept.length > 1 ? (
                  <ul className="tl-list">{kept.map((k, j) => <li key={j}><Markdown options={inline}>{k}</Markdown></li>)}</ul>
                ) : (
                  <p className="tl-text"><Markdown options={inline}>{e.kept ?? ''}</Markdown></p>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
