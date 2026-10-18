import { useEffect, useRef, useState } from 'react';
import { useChessPublica } from '@/lib/chesspublica';

const MAX = 640;

// ChessPublica'nın statik <fen> tahtası hamle rozeti çizmez; <pgn>'deki .gm-badge ile aynı görünümde (renk, boyutun 0,055'i) kendimiz koyarız.
const GLYPH_COLOR: Record<string, string> = { '!!': '#1aa34a', '!': '#00AA00', '!?': '#0000FF', '?!': '#FF8C00', '?': '#E69F00', '??': '#CC0000' };

// Ana sayfa kartları için statik ChessPublica diyagramı (<fen>). Paket yalnızca diyagram ekrana yaklaşınca yüklenir;
// o zamana kadar yer tutucu yer ayırır, sayfa kaymaz. Ham FEN metni CSS'le (.fen-diagram fen) gizlenir.
//
// Tahta kutunun soluna yaslanır; `caption` tahtanın altına, sola yaslı bir bilgi satırı olarak girer.
// `fill`: md ve üstünde kartın kalan yüksekliğini doldurur (kart, ızgara satırlarının yüksekliğine esner; böylece soldaki kart
// sağdaki kartlarla aynı boyda biter). Tahta, kutunun genişliği ve yüksekliğinden küçük olanına göre kare çizilir. Kutunun
// içeriği mutlak konumlu olduğu için kartın doğal yüksekliğine katılmaz ve ızgara satırlarını büyütmez. ChessPublica tahtayı
// çizildiği andaki genişliğe göre kurar, bu yüzden boyut değişince <fen> yeniden kurulur (key).
export default function FenDiagram({ fen, label, caption, orientation, badge, fill = false }: { fen: string; label: string; caption?: string; orientation?: 'white' | 'black'; badge?: { square: string; glyph: string }; fill?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');
  const [size, setSize] = useState(0);
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
  const status = useChessPublica(near);
  // Rozet, karenin sağ üst köşesine biner (tahta siyah tarafından çizildiyse sütun ve sıra ters).
  const cell = size / 8;
  const badgeAt = badge && /^[a-h][1-8]$/.test(badge.square) ? (() => {
    const f = badge.square.charCodeAt(0) - 97, r = Number(badge.square[1]) - 1;
    const black = orientation === 'black';
    return { right: (black ? f : 7 - f) * cell - cell * 0.05, top: (black ? r : 7 - r) * cell - cell * 0.05 };
  })() : null;
  // Boyut değişince yeni <fen> kurulur; paket zaten yüklüyse yeniden taratılır.
  useEffect(() => { if (status === 'ready' && size > 0) window.ChessPublica?.initAll(); }, [status, size]);
  return (
    <div className={`fen-wrap${fill ? ' fen-fill' : ''}`}>
      <div ref={box} role="img" aria-label={label} className="fen-diagram">
        {near && size > 0 && (
          <div key={size} className="absolute left-0 top-0 pointer-events-auto" style={{ width: size, height: size }}>
            <div dangerouslySetInnerHTML={{ __html: `<fen${orientation ? ` orientation="${orientation}"` : ''}>${fen}</fen>` }} />
            {badge && badgeAt && (
              <div aria-hidden className="gm-badge" style={{ background: GLYPH_COLOR[badge.glyph] ?? '#00AA00', right: badgeAt.right, top: badgeAt.top, zIndex: 30, width: size * 0.055, height: size * 0.055, fontSize: size * 0.04, boxShadow: `0 1px ${size * 0.01}px #00000073` }}>{badge.glyph}</div>
            )}
          </div>
        )}
      </div>
      {/* Tahta sola yaslıdır; alt yazı da sola yaslanır ve tahtadan geniş olmaz. */}
      {caption && <p className="f-mono normal-case text-[#A89A88] mt-3 pointer-events-auto" style={size > 0 ? { maxWidth: size } : undefined}>{caption}</p>}
    </div>
  );
}
