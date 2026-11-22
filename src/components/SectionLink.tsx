import ProgressiveImage from '@/components/ProgressiveImage';

// Dünya Şampiyonası yazısındaki oynatıcı bölümleri arasında kartlı bağlantı: tıklayınca sıradaki bölüme yumuşak kaydırır.
export type SectionTarget = { id: string; title: string; sub?: string; thumb?: string; headingText?: string };

const find = (t: SectionTarget): Element | null => {
  const h = t.headingText ? [...document.querySelectorAll('h3, h4')].find((x) => x.textContent?.trim() === t.headingText) : null;
  return h ?? document.getElementById(t.id);
};

export default function SectionLink({ target, kicker = 'Sıradaki bölüm' }: { target: SectionTarget; kicker?: string }) {
  const go = () => {
    const to = (behavior: ScrollBehavior) => {
      const el = find(target);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 32;
      window.scrollTo({ top, behavior });
    };
    to('smooth');
    // Tembel yüklenen görseller/oynatıcılar kaydırma sırasında yüksekliği değiştirir: konum gerekirse düzeltilir.
    [900, 1800].forEach((ms) => window.setTimeout(() => {
      const el = find(target);
      if (el && Math.abs(el.getBoundingClientRect().top - 32) > 6) to('auto');
    }, ms));
  };
  return (
    <button type="button" className="sec-link" onClick={go} aria-label={`${kicker}: ${target.title}`}>
      <span className="sec-link-thumb">
        {target.thumb ? <ProgressiveImage path={target.thumb} alt="" thumb position="50% 25%" /> : null}
      </span>
      <span className="sec-link-text">
        <span className="f-mono">{kicker}</span>
        <b className="f-display">{target.title}</b>
        {target.sub && <span>{target.sub}</span>}
      </span>
      <span className="sec-link-arrow" aria-hidden="true">↓</span>
    </button>
  );
}
