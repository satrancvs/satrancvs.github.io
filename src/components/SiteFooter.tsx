import { Instagram, Youtube } from 'lucide-react';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import FaviconBullet from '@/components/FaviconBullet';

const SOCIAL_READY = false;
// Lucide'te X logosu yok (`Twitter` eski kuş simgesidir); X'in güncel logosu satır içi SVG olarak çizilir (Simple Icons, CC0); diğer simgelerden biraz büyük göründüğü için %90 boyutta.
const XIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size * 0.9} height={size * 0.9} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg>
);

const SOCIAL = [[Instagram, 'Instagram', 'https://instagram.com/satrancvs'], [XIcon, 'X', 'https://x.com/satrancvs'], [Youtube, 'YouTube', 'https://youtube.com/@satrancvs']] as const;

// Bağlantı/düğme yalnızca yazının genişliği kadar (w-fit): iki yanındaki boşluk tıklanmaz.
const WORDMARK_CLASS = 'block w-fit max-w-full mx-auto f-display text-[17vw] leading-[1] whitespace-nowrap text-center pt-6 pb-[2vw] hover:opacity-80 transition-opacity';

const Wordmark = () => (
  <>
    <FaviconBullet className="inline-block align-top mt-[0.135em] mr-[calc(13.25px_-_0.054em)]" />
    Satranç <em className="italic text-[#C8893E]">vs.</em>
  </>
);

// `page`: ana sayfada iletişim satırı görünür, büyük yazı yukarı kaydırır; yazı sayfalarında iletişim gizlidir, büyük yazı ana sayfaya gider.
export default function SiteFooter({ page = 'home' }: { page?: 'home' | 'post' }) {
  const toTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };
  return (
    <footer className="border-t border-[#2E2620]">
      {page === 'home' && (
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-12 flex flex-col md:flex-row justify-between gap-6">
        <p className="f-mono text-[#A89A88]">İletişim: <a href="mailto:editor@satrancvs.com" className="text-[#F1E9DC] hover:text-[#C8893E]">editor@satrancvs.com</a></p>
        {/* Hesaplar hazır olana kadar devre dışı (bülten formundaki gibi): devre dışı öğeler ipucu göstermediği için title kapsayıcıda.
            Hesaplar açılınca SOCIAL_READY true yapılır. */}
        <div title={SOCIAL_READY ? undefined : 'Yakında...'} aria-disabled={SOCIAL_READY ? undefined : true} className={`flex gap-3 ${SOCIAL_READY ? '' : 'cursor-not-allowed opacity-60'}`}>
          {SOCIAL.map(([Icon, l, href]) => {
            const I = Icon as ComponentType<{ size?: number }>;
            const base = 'w-11 h-11 rounded-full border border-[#2E2620] grid place-items-center';
            return SOCIAL_READY
              ? <a key={l as string} href={href as string} target="_blank" rel="noreferrer" aria-label={l as string} className={`${base} hover:bg-[#C8893E] hover:text-[#0E0C0A]`}><I size={18} /></a>
              : <button key={l as string} type="button" disabled aria-label={`${l} (yakında)`} className={`${base} pointer-events-none`}><I size={18} /></button>;
          })}
        </div>
      </div>
      )}
      <div className={`overflow-hidden ${page === 'home' ? 'border-t border-[#2E2620]' : ''}`}>
        {page === 'home'
          ? <button type="button" onClick={toTop} aria-label="Sayfanın başına dön" className={WORDMARK_CLASS}><Wordmark /></button>
          : <Link to="/" state={{ top: true }} aria-label="Ana sayfaya git" className={WORDMARK_CLASS}><Wordmark /></Link>}
      </div>
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-6 flex justify-between f-mono text-[#A89A88]">
        <span>© 2026 Satranç vs. Dijital Satranç Dergisi</span>
      </div>
    </footer>
  );
}
