import { Facebook, Instagram } from 'lucide-react';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import FaviconBullet from '@/components/FaviconBullet';

// Lucide'te X logosu yok (`Twitter` eski kuş simgesidir); X'in güncel logosu satır içi SVG olarak çizilir (Simple Icons, CC0); diğer simgelerden biraz büyük göründüğü için %90 boyutta.
const XIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size * 0.9} height={size * 0.9} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg>
);

const SOCIAL = [[Instagram, 'Instagram', 'https://www.instagram.com/satrancvs/'], [XIcon, 'X', 'https://x.com/satrancvs'], [Facebook, 'Facebook', 'https://www.facebook.com/profile.php?id=61595679767750']] as const;

// Bağlantı/düğme yalnızca yazının genişliği kadar (w-fit): iki yanındaki boşluk tıklanmaz.
const WORDMARK_CLASS = 'block w-fit max-w-full mx-auto f-display text-[17vw] leading-[1] whitespace-nowrap text-center pt-6 pb-[2vw] hover:opacity-80 transition-opacity';

const Wordmark = () => (
  <>
    <FaviconBullet className="inline-block align-top mt-[0.135em] mr-[calc(13.25px_-_0.054em)]" />
    Satranç <em className="italic text-[color:var(--accent)]">vs.</em>
  </>
);

// `page`: ana sayfada iletişim satırı görünür, büyük yazı yukarı kaydırır; yazı sayfalarında iletişim gizlidir, büyük yazı ana sayfaya gider.
export default function SiteFooter({ page = 'home' }: { page?: 'home' | 'post' }) {
  const toTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };
  return (
    <footer className="border-t border-[color:var(--line)]">
      {page === 'home' && (
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-12 flex flex-col md:flex-row justify-between gap-6">
        <p className="f-mono text-[color:var(--mute)]">İletişim: <a href="mailto:editor@satrancvs.com" lang="en" className="text-[color:var(--fg)] hover:text-[color:var(--accent)]">editor@satrancvs.com</a></p>
        <div className="flex gap-3">
          {SOCIAL.map(([Icon, l, href]) => {
            const I = Icon as ComponentType<{ size?: number }>;
            const base = 'w-11 h-11 rounded-full border border-[color:var(--line)] grid place-items-center';
            return <a key={l} href={href} target="_blank" rel="noreferrer" aria-label={l} className={`${base} hover:bg-[color:var(--accent)] hover:text-[color:var(--bg)]`}><I size={18} /></a>;
          })}
        </div>
      </div>
      )}
      <div className={`overflow-hidden ${page === 'home' ? 'border-t border-[color:var(--line)]' : ''}`}>
        {page === 'home'
          ? <button type="button" onClick={toTop} aria-label="Sayfanın başına dön" className={WORDMARK_CLASS}><Wordmark /></button>
          : <Link to="/" state={{ top: true }} aria-label="Ana sayfaya git" className={WORDMARK_CLASS}><Wordmark /></Link>}
      </div>
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-6 flex justify-between f-mono text-[color:var(--mute)]">
        <span>© 2026 Satranç vs. Dijital Satranç Dergisi</span>
      </div>
    </footer>
  );
}
