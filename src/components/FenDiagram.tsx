import { useEffect, useRef, useState } from 'react';
import { useChessPublica } from '@/lib/chesspublica';

const MAX = 640;

// ChessPublica'nın statik <fen> tahtası hamle rozeti çizmez; <pgn>'deki .gm-badge ile aynı görünümde (renk, boyutun 0,055'i) kendimiz koyarız.
const GLYPH_COLOR: Record<string, string> = { '!!': '#1aa34a', '!': '#00AA00', '!?': '#0000FF', '?!': '#FF8C00', '?': '#E69F00', '??': '#CC0000' };

// Ana sayfa kartları için statik ChessPublica diyagramı (<fen>). Paket yalnızca diyagram ekrana yaklaşınca yüklenir;
// o zamana kadar yer tutucu yer ayırır, sayfa kaymaz. Ham FEN metni CSS'le (.fen-diagram fen) gizlenir.
//
// Tahta kutunun soluna yaslanır; `caption` tahtanın altına, sola yaslı bir bilgi satırı olarak girer.
// `fill`: md ve üstünde tahta 400 px yerine 515 px'e kadar büyür (CSS). Kutunun içeriği mutlak konumlu olduğu için kutu boyutunu
// CSS'teki en-boy oranı verir. ChessPublica tahtayı çizildiği andaki genişliğe göre kurar, bu yüzden boyut değişince <fen> yeniden kurulur (key).
export default function FenDiagram({ fen, label, caption, orientation, badge, arrow, fill = false }: { fen: string; label: string; caption?: string; orientation?: 'white' | 'black'; badge?: { square: string; glyph: string }; arrow?: { from: string; to: string }; fill?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');
  const [size, setSize] = useState(0);
  const cap = useRef<HTMLParagraphElement>(null);
  const [maxH, setMaxH] = useState<number>();
  useEffect(() => {
    if (near || !box.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); }
    }, { rootMargin: '600px 0px' });
    io.observe(box.current);
    return () => io.disconnect();
  }, [near]);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let t: number | undefined;
    const ro = new ResizeObserver(([e]) => {
      const s = Math.floor(Math.min(e.contentRect.width, e.contentRect.height, MAX));
      window.clearTimeout(t);
      t = window.setTimeout(() => setSize((prev) => (Math.abs(prev - s) >= 2 ? s : prev)), 120);
    });
    ro.observe(el);
    return () => { window.clearTimeout(t); ro.disconnect(); };
  }, []);
  // Kural: tahta + alt yazı (üstteki sabit başlık da düşülerek) ekran yüksekliğini aşmaz; tahtanın üst sınırı CSS'e `--fen-cap` olarak verilir.
  useEffect(() => {
    const update = () => {
      const head = document.querySelector('header')?.getBoundingClientRect().height ?? 80;
      const capH = cap.current ? cap.current.offsetHeight + 12 : 0;
      const m = Math.max(200, Math.floor(window.innerHeight - head - capH - 16));
      setMaxH((prev) => (prev !== undefined && Math.abs(prev - m) < 2 ? prev : m));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [caption, size]);
  const status = useChessPublica(near);
  // Rozet, karenin sağ üst köşesine biner (tahta siyah tarafından çizildiyse sütun ve sıra ters).
  const cell = size / 8;
  const badgeAt = badge && /^[a-h][1-8]$/.test(badge.square) ? (() => {
    const f = badge.square.charCodeAt(0) - 97, r = Number(badge.square[1]) - 1;
    const black = orientation === 'black';
    return { right: (black ? f : 7 - f) * cell - cell * 0.05, top: (black ? r : 7 - r) * cell - cell * 0.05 };
  })() : null;
  // Ok: `from` karesinin ortasından `to` karesine, soluk gri ve yarı saydam; taşın görünmesi için ucu hedef karenin ortasından biraz önce biter.
  const arrowGeom = arrow && /^[a-h][1-8]$/.test(arrow.from) && /^[a-h][1-8]$/.test(arrow.to) && arrow.from !== arrow.to ? (() => {
    const black = orientation === 'black';
    const pt = (sq: string) => {
      const f = sq.charCodeAt(0) - 97, r = Number(sq[1]) - 1;
      return { x: ((black ? 7 - f : f) + 0.5) * cell, y: ((black ? r : 7 - r) + 0.5) * cell };
    };
    const a = pt(arrow.from), b = pt(arrow.to);
    const len = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    const tip = { x: b.x - ux * cell * 0.2, y: b.y - uy * cell * 0.2 };
    const head = cell * 0.4, hw = cell * 0.26;
    const base = { x: tip.x - ux * head, y: tip.y - uy * head };
    const poly = [tip, { x: base.x - uy * hw, y: base.y + ux * hw }, { x: base.x + uy * hw, y: base.y - ux * hw }].map((q) => `${q.x},${q.y}`).join(' ');
    return { a, base, poly, w: cell * 0.16 };
  })() : null;
  // Boyut değişince yeni <fen> kurulur; paket zaten yüklüyse yeniden taratılır.
  useEffect(() => { if (status === 'ready' && size > 0) window.ChessPublica?.initAll(); }, [status, size]);
  return (
    <div className={`fen-wrap mt-8${fill ? ' fen-fill' : ''}`}>
      <div ref={box} role="img" aria-label={label} className="fen-diagram" style={maxH ? ({ '--fen-cap': `${maxH}px` } as React.CSSProperties) : undefined}>
        {near && size > 0 && (
          <div key={size} className="absolute left-0 top-0 pointer-events-auto" style={{ width: size, height: size }}>
            <div dangerouslySetInnerHTML={{ __html: `<fen${orientation ? ` orientation="${orientation}"` : ''}>${fen}</fen>` }} />
            {arrowGeom && (
              <svg aria-hidden width={size} height={size} className="absolute left-0 top-0 pointer-events-none" style={{ zIndex: 20 }}>
                <g fill="#4a4a4a" stroke="#4a4a4a" opacity="0.5">
                  <line x1={arrowGeom.a.x} y1={arrowGeom.a.y} x2={arrowGeom.base.x} y2={arrowGeom.base.y} strokeWidth={arrowGeom.w} strokeLinecap="butt" />
                  <polygon points={arrowGeom.poly} strokeWidth="0" />
                </g>
              </svg>
            )}
            {badge && badgeAt && (
              <div aria-hidden className="gm-badge" style={{ background: GLYPH_COLOR[badge.glyph] ?? '#00AA00', right: badgeAt.right, top: badgeAt.top, zIndex: 30, width: size * 0.055, height: size * 0.055, fontSize: size * 0.04, boxShadow: `0 1px ${size * 0.01}px #00000073` }}>{badge.glyph}</div>
            )}
          </div>
        )}
      </div>
      {/* Tahta sola yaslıdır; alt yazı da sola yaslanır ve tahtadan geniş olmaz. Kart bağlantısı yalnızca içerik üstünde etkindir (Index.tsx). */}
      {caption && <p ref={cap} className="f-mono normal-case text-[#A89A88] mt-3 pointer-events-auto" style={size > 0 ? { maxWidth: size } : undefined}>{caption}</p>}
    </div>
  );
}
