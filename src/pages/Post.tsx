import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Moon, Sun, X } from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import SiteFooter from '@/components/SiteFooter';
import ArticleBody from '@/components/ArticleBody';
import ProgressiveImage, { boxWidth } from '@/components/ProgressiveImage';
import PhotoCredit, { PHOTO } from '@/components/PhotoCredit';
import { articleByOldSlug, articleBySlug, articlePath } from '@/data/articles';
import NotFound from './NotFound';
import '../site.css';

// `.f-mono` büyük harfe çevirir ve sayfa dili Türkçe olduğu için yabancı adlardaki i "İ" olur (CAFECHİGORİN). Bağlantının başlığı
// "lang:en" ise bağlantı o dille işaretlenir (büyük harf dönüşümü o dilin kuralıyla yapılır) ve başlık gösterilmez.
// Ayrıca `.f-mono` harf aralığı her harfin arkasına boşluk ekler; bağlantının son harfinden sonraki bu boşluk da altı çizilirdi:
// son harfin harf aralığı sıfırlanır, çizgi yalnızca sözcüğün üstünde kalır.
function NoteLink({ children, title, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const lang = title?.match(/^lang:([a-z]{2})$/)?.[1];
  const rest = lang ? { ...props, lang } : { ...props, title };
  const kids = Array.isArray(children) ? children : [children];
  const last = kids[kids.length - 1];
  if (typeof last !== 'string' || !last) return <a {...rest}>{children}</a>;
  return <a {...rest}>{kids.slice(0, -1)}{last.slice(0, -1)}<span style={{ letterSpacing: 0 }}>{last.slice(-1)}</span></a>;
}

// Tema yalnızca yazı sayfalarında vardır (ana sayfa her zaman koyu). Seçim tarayıcıda saklanır; kayıt yoksa koyu açılır.
const THEME_KEY = 'theme';
const readTheme = (): 'dark' | 'light' => { try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } };

// Adresi değişen yazının eski adresi yeni adrese yönlendirilir (kanca kuralları için ayrı bileşen).
export default function Post() {
  const { slug } = useParams();
  const moved = !articleBySlug(slug) ? articleByOldSlug(slug) : undefined;
  if (moved) return <Navigate to={articlePath(moved)} replace />;
  return <PostPage />;
}

function PostPage() {
  const { slug } = useParams();
  const a = articleBySlug(slug);

  const [theme, setTheme] = useState<'dark' | 'light'>(readTheme);
  const light = theme === 'light';
  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(THEME_KEY, next); } catch { /* özel pencere vb. */ }
      return next;
    });
  }, []);
  // Başka sekmede değişen seçim bu sekmeye de uygulanır.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === THEME_KEY) setTheme(readTheme()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  // Sayfanın dışındaki alanlar (aşırı kaydırma, adres çubuğu rengi) temaya uysun; yazıdan ayrılınca koyu hale döner (ana sayfa etkilenmez).
  useEffect(() => {
    const bg = light ? '#F7F1E5' : '#0E0C0A';
    const meta = document.querySelector('meta[name="theme-color"]');
    const prevMeta = meta?.getAttribute('content');
    const html = document.documentElement;
    const prevBg = html.style.backgroundColor;
    meta?.setAttribute('content', bg);
    html.style.backgroundColor = bg;
    return () => {
      if (prevMeta != null) meta?.setAttribute('content', prevMeta);
      html.style.backgroundColor = prevBg;
    };
  }, [light]);

  // Okuma konumu: yazı sayfası yenilendiğinde ya da sonradan tekrar açıldığında kaldığın yerden devam eder.
  // Tarayıcının kendi geri yüklemesi tembel yüklenen fotoğraf/oyunlar yüzünden yanlış yere düşebildiği için
  // konum yazı başına localStorage'da tutulur ve yazı yüksekliği oturana kadar birkaç kez uygulanır.
  useEffect(() => {
    if (!a) return;
    const key = `scroll:${a.slug}`;
    const read = () => { try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; } };
    const write = (y: number) => { try { if (y > 300) localStorage.setItem(key, String(Math.round(y))); else localStorage.removeItem(key); } catch { /* özel pencere vb. */ } };
    window.history.scrollRestoration = 'manual'; // geri yüklemeyi biz yaparız; tekrar 'auto' yapılmaz (ana sayfaya geri dönüşte yüklenmesin)
    const target = window.location.hash ? 0 : read();
    window.scrollTo(0, 0);
    let restoring = target > 0; // geri yükleme bitene kadar konum kaydedilmez (0'ı kaydedip silmesin)
    let timers: number[] = [];
    const stop = () => { restoring = false; timers.forEach(clearTimeout); timers = []; };
    if (restoring) {
      const apply = () => { if (restoring) window.scrollTo(0, target); };
      apply();
      timers = [150, 500, 1200, 2500].map((ms) => window.setTimeout(apply, ms));
      timers.push(window.setTimeout(stop, 2700));
      // Kullanıcı kendisi kaydırmaya başlarsa geri yükleme bırakılır.
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
    }
    let raf = 0;
    const onScroll = () => {
      if (restoring || raf) return;
      raf = window.setTimeout(() => { raf = 0; write(window.scrollY); }, 250);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const onHide = () => { if (!restoring) write(window.scrollY); };
    window.addEventListener('pagehide', onHide);
    return () => {
      // Ayrılırken yazılmaz: ana sayfa kaydırmayı sıfırladıktan sonra çalışır ve kayıtlı konumu silerdi.
      stop();
      clearTimeout(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onHide);
      ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) => window.removeEventListener(ev, stop));
    };
  }, [a]);

  useEffect(() => {
    if (!a) return;
    const prev = document.title;
    document.title = `${a.title} — Satranç vs.`;
    return () => { document.title = prev; };
  }, [a]);

  if (!a) return <NotFound />;

  const rest = a.chunks;

  return (
    <div className={`sk min-h-screen bg-[color:var(--bg)]${light ? ' sk-light' : ''}`}>
      <button type="button" onClick={toggleTheme} aria-pressed={light} aria-label={light ? 'Koyu temaya geç' : 'Açık temaya geç'} title={light ? 'Koyu tema' : 'Açık tema'} className="fixed top-5 right-[4.75rem] z-50 w-12 h-12 rounded-full border border-[color:rgb(var(--fg-rgb)/0.4)] bg-[color:var(--bg)] text-[color:var(--fg)] grid place-items-center hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition-colors">
        {light ? <Moon size={20} aria-hidden /> : <Sun size={20} aria-hidden />}
      </button>
      <Link to="/" state={{ top: true }} aria-label="Ana sayfaya dön" className="fixed top-5 right-5 z-50 w-12 h-12 rounded-full bg-[color:var(--fg)] text-[color:var(--bg)] grid place-items-center hover:bg-[color:var(--accent)]"><X /></Link>
      <article className="max-w-[760px] mx-auto px-6 pt-32 relative pb-32">
        {a.cat && <p className="f-mono text-[color:var(--accent)]">{a.cat}</p>}
        <h1 className={`f-display text-[clamp(44px,6vw,88px)] ${a.cat ? 'mt-6' : ''}`}>{a.title}</h1>
        {(a.dek ?? a.excerpt) && (
          <p className="text-[1.3125rem] leading-[1.6] text-[color:rgb(var(--fg-rgb)/0.85)] mt-8">
            <Markdown options={{ forceInline: true }}>{(a.dek ?? a.excerpt) as string}</Markdown>
          </p>
        )}
        <div className="mt-8 pb-8 border-b border-[color:var(--line)]">
          <p className="f-mono text-[color:var(--mute)]">
            {a.authorLabel ?? 'Yazar'}: <span lang={a.authorLang}>{a.author}</span>
            {a.translator && ` · Türkçesi: ${a.translator}`} · <span className="whitespace-nowrap">{a.date}</span>
          </p>
          {/* Yazı başka bir yerde yayımlandıysa künye notu: yazar satırının altında, aynı yazı tipiyle, sola yaslı. `<br>` ile ayrılan her satır ayrı bir satır (paragraf) olur. */}
          {a.note?.split(/<br\s*\/?>/i).map((line, i) => <p key={i} className="f-mono text-[color:var(--mute)] mt-3"><Markdown options={{ forceInline: true, overrides: { a: { component: NoteLink, props: { className: 'underline underline-offset-2 hover:text-[color:var(--fg)]', target: '_blank', rel: 'noreferrer' } } } }}>{line}</Markdown></p>)}
        </div>
        {/* Fotoğraf yazının en üstünde, künyenin hemen altında. */}
        {a.photo && (
          <figure className="mt-10 mx-auto w-full" style={{ maxWidth: boxWidth('images/jan-timman-1973.jpg') }}>
            <ProgressiveImage path="images/jan-timman-1973.jpg" alt={PHOTO.alt} lazy={false} />
            <figcaption className="mt-3"><PhotoCredit /></figcaption>
          </figure>
        )}
        <div className="mt-10 space-y-6 text-[1.3125rem] leading-[1.7] text-[color:rgb(var(--fg-rgb)/0.85)]">
          {rest ? <ArticleBody chunks={rest} /> : a.body.map((p, i) => <p key={i} className={i === 0 ? 'first-letter:f-display first-letter:text-7xl first-letter:float-left first-letter:mr-3 first-letter:text-[color:var(--accent)] first-letter:leading-[0.8]' : ''}>{p}</p>)}
        </div>
      </article>
      <SiteFooter page="post" />
    </div>
  );
}
