import { useEffect, useRef, useState } from 'react';

// Dokunmatik cihazlarda (iOS, Android) ve katmanlı (overlay) kaydırma çubuğu kullanan masaüstlerinde tarayıcı kendi kaydırma çubuğunu CSS ile biçimlendirmeye izin vermez.
// Klasik (yer kaplayan) çubuğu olan masaüstü tarayıcılarda `html.post-page` kuralları çalışır (site.css); burada ise yerel çubuk gizlenir ve aynı görünümde
// (turuncu tutamaç, belirgin iz) bir çubuk çizilir: sürüklenebilir, izine dokunulunca bir ekran kayar.
const MIN_HANDLE = 56;

export default function OverlayScrollbar() {
  const [overlay, setOverlay] = useState(false);
  const [geo, setGeo] = useState({ top: 0, h: 0, show: false });
  const [active, setActive] = useState(false);
  const drag = useRef<{ y: number; scroll: number; ratio: number } | null>(null);
  const idle = useRef(0);

  // Yer kaplayan bir çubuk yoksa (genişlik farkı 0) yerel çubuk katmanlıdır: bizimki devreye girer.
  useEffect(() => {
    const check = () => setOverlay(window.innerWidth - document.documentElement.clientWidth === 0);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!overlay) return;
    const html = document.documentElement;
    html.classList.add('post-custom-sb');
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const max = html.scrollHeight - html.clientHeight;
      if (max <= 1) { setGeo((g) => (g.show ? { top: 0, h: 0, show: false } : g)); return; }
      const h = Math.min(vh, Math.max(MIN_HANDLE, (vh * vh) / html.scrollHeight));
      const y = Math.min(Math.max(window.scrollY, 0), max);
      setGeo({ top: (y / max) * (vh - h), h, show: true });
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onScroll = () => {
      schedule();
      setActive(true);
      window.clearTimeout(idle.current);
      idle.current = window.setTimeout(() => { if (!drag.current) setActive(false); }, 900);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', schedule);
    // Tembel yüklenen fotoğraflar ve oyunlar sayfa yüksekliğini sonradan değiştirir.
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    return () => {
      html.classList.remove('post-custom-sb');
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', schedule);
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(idle.current);
    };
  }, [overlay]);

  if (!overlay || !geo.show) return null;

  const startDrag = (e: React.PointerEvent) => {
    const html = document.documentElement;
    const vh = window.innerHeight;
    const max = html.scrollHeight - html.clientHeight;
    drag.current = { y: e.clientY, scroll: window.scrollY, ratio: max / Math.max(1, vh - geo.h) };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActive(true);
    e.preventDefault();
    e.stopPropagation();
  };
  const moveDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    window.scrollTo(0, d.scroll + (e.clientY - d.y) * d.ratio);
  };
  const endDrag = () => {
    drag.current = null;
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setActive(false), 900);
  };
  // İze (tutamacın dışına) dokunmak bir ekran kaydırır.
  const page = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    const down = e.clientY > geo.top + geo.h / 2;
    window.scrollBy({ top: (down ? 1 : -1) * window.innerHeight * 0.9, behavior: 'smooth' });
  };

  // Yerel katmanlı çubuklar gibi: yalnızca kaydırırken (ya da tutamacı sürüklerken / fare üzerindeyken) görünür, ~1 sn sonra solar.
  // Gizliyken olayları yutmaz (`pointer-events: none`): sağ kenardan yapılan kaydırma jestleri doğal çalışır.
  const keepOpen = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    window.clearTimeout(idle.current);
    setActive(true);
  };
  const letGo = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || drag.current) return;
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setActive(false), 900);
  };

  return (
    <div
      aria-hidden
      onPointerDown={page}
      onPointerEnter={keepOpen}
      onPointerLeave={letGo}
      style={{ touchAction: 'none', opacity: active ? 1 : 0, pointerEvents: active ? 'auto' : 'none', transition: 'opacity .25s' }}
      className="fixed right-0 top-0 bottom-0 z-40 w-6"
    >
      <div className="absolute right-[3px] top-1 bottom-1 w-[10px] rounded-full pointer-events-none" style={{ background: 'var(--sb-track)', opacity: 0.6 }} />
      <div
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="absolute right-[3px] w-[10px] rounded-full"
        style={{ top: geo.top, height: geo.h, background: 'var(--sb-thumb)', touchAction: 'none' }}
      />
    </div>
  );
}
