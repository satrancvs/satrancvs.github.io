import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Moon, Sun, X } from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import SiteFooter from '@/components/SiteFooter';
import OverlayScrollbar from '@/components/OverlayScrollbar';
import ShareButton from '@/components/ShareButton';
import ArticleBody from '@/components/ArticleBody';
import ProgressiveImage, { boxWidth } from '@/components/ProgressiveImage';
import PhotoCredit, { PHOTO } from '@/components/PhotoCredit';
import { articleByOldSlug, articleBySlug, articlePath, catLabel } from '@/data/articles';
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

// Tema yalnızca yazı sayfalarında vardır (ana sayfa her zaman koyu). Öncelik: okurun kendi seçimi (localStorage; depolama kapalıysa oturum boyunca bellekte,
// böylece yazıdan yazıya geçerken de korunur) > sistem teması (prefers-color-scheme) > koyu. Seçim yoksa sistem teması değişince sayfa da değişir.
const THEME_KEY = 'theme';
let themeMem: 'dark' | 'light' | null = null;
const systemTheme = (): 'dark' | 'light' => (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
const savedTheme = (): 'dark' | 'light' | null => {
  try { const v = localStorage.getItem(THEME_KEY); if (v === 'light' || v === 'dark') return v; } catch { /* depolama erişilemez */ }
  return themeMem;
};
const readTheme = (): 'dark' | 'light' => savedTheme() ?? systemTheme();

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
      themeMem = next;
      try { localStorage.setItem(THEME_KEY, next); } catch { /* özel pencere vb. */ }
      return next;
    });
  }, []);
  // Başka sekmede değişen seçim bu sekmeye de uygulanır; okurun seçimi yokken sistem teması değişirse sayfa onu izler.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === THEME_KEY) setTheme(readTheme()); };
    window.addEventListener('storage', onStorage);
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    const onSystem = () => { if (!savedTheme()) setTheme(systemTheme()); };
    mq?.addEventListener?.('change', onSystem);
    return () => { window.removeEventListener('storage', onStorage); mq?.removeEventListener?.('change', onSystem); };
  }, []);
  // index.html'deki erken betik, açık tema seçilmişse yazı sayfasını ilk boyamadan önce açık zeminle başlatır (koyudan açığa yanıp sönme olmasın); React devralınca kaldırılır.
  useEffect(() => { document.getElementById('early-theme')?.remove(); }, []);
  // Sayfanın dışındaki alanlar (aşırı kaydırma / iOS'ta içeriğin altındaki boşluk, adres çubuğu rengi) temaya uysun; html VE body boyanır (iOS ikisinden birini kullanabilir); yazıdan ayrılınca koyu hale döner (ana sayfa etkilenmez).
  useEffect(() => {
    if (!a) { document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0E0C0A'); return; } // yazı yoksa 404 sayfası kendi (koyu) rengiyle görünür
    const bg = light ? '#F7F1E5' : '#0E0C0A';
    const meta = document.querySelector('meta[name="theme-color"]');
    const html = document.documentElement;
    const prevBg = html.style.backgroundColor;
    const prevBodyBg = document.body.style.backgroundColor;
    meta?.setAttribute('content', bg);
    html.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
    html.classList.add('post-page');
    html.classList.toggle('post-light', light);
    return () => {
      html.classList.remove('post-page', 'post-light');
      meta?.setAttribute('content', '#0E0C0A');
      html.style.backgroundColor = prevBg;
      document.body.style.backgroundColor = prevBodyBg;
    };
  }, [light, a]);

  // Okuma konumu: yazı sayfası yenilendiğinde ya da sonradan tekrar açıldığında kaldığın yerden devam eder.
  // Tarayıcının kendi geri yüklemesi tembel yüklenen fotoğraf/oyunlar yüzünden yanlış yere düşebildiği için
  // konum yazı başına localStorage'da tutulur ve yazı yüksekliği oturana kadar birkaç kez uygulanır.
  // Yazının sonuna gelinmişse konum silinir (yazı bitmiş sayılır), bir dahaki giriş baştan açılır.
  useEffect(() => {
    if (!a) return;
    const key = `scroll:${a.slug}`;
    const read = () => { try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; } };
    // Okur yazının sonuna geldiyse (yazı gövdesinin alt kenarı ekrana girdiyse) yazıyı bitirmiş sayılır: konum hatırlanmaz, sonraki girişte yazı baştan açılır.
    // Sayfanın (yazının altındaki bölümler dahil) sonuna 200 px kala da aynı sayılır.
    const finished = () => {
      const end = document.querySelector('article')?.getBoundingClientRect().bottom;
      return (end !== undefined && end <= window.innerHeight + 200) || window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 200;
    };
    const write = (y: number, done = finished()) => { try { if (y > 300 && !done) localStorage.setItem(key, String(Math.round(y))); else localStorage.removeItem(key); } catch { /* özel pencere vb. */ } };
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
    // Son kaydırma konumu ve "bitti" durumu kaydırma anında alınır: bekleme süresi dolmadan sayfadan çıkılırsa (aşağıda) eski, ortadaki konum kalmasın.
    let last: { y: number; done: boolean } | null = null;
    const onScroll = () => {
      if (restoring) return;
      last = { y: window.scrollY, done: finished() };
      if (raf) return;
      raf = window.setTimeout(() => { raf = 0; write(window.scrollY); }, 250);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const onHide = () => { if (!restoring) write(window.scrollY); };
    window.addEventListener('pagehide', onHide);
    return () => {
      // Ayrılırken yazılmaz: ana sayfa kaydırmayı sıfırladıktan sonra çalışır ve kayıtlı konumu silerdi.
      stop();
      if (raf && last) write(last.y, last.done);
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
      <OverlayScrollbar />
      <button type="button" onClick={toggleTheme} aria-pressed={light} aria-label={light ? 'Koyu temaya geç' : 'Açık temaya geç'} title={light ? 'Koyu tema' : 'Açık tema'} className="fixed top-5 left-5 z-50 w-12 h-12 rounded-full bg-[color:var(--fg)] text-[color:var(--bg)] grid place-items-center hover:bg-[color:var(--accent)]">
        {light ? <Moon size={20} aria-hidden /> : <Sun size={20} aria-hidden />}
      </button>
      <Link to="/" state={{ restore: true }} aria-label="Ana sayfaya dön" className="fixed top-5 right-5 z-50 w-12 h-12 rounded-full bg-[color:var(--fg)] text-[color:var(--bg)] grid place-items-center hover:bg-[color:var(--accent)]"><X /></Link>
      <ShareButton title={a.title} url={`${window.location.origin}${articlePath(a)}`} />
      <article className="max-w-[760px] mx-auto px-6 pt-32 relative pb-32">
        {catLabel(a) && <p className="f-mono text-[color:var(--accent)]">{catLabel(a)}</p>}
        <h1 className={`f-display text-[clamp(44px,6vw,88px)] ${catLabel(a) ? 'mt-6' : ''}`}>{a.title}</h1>
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
