import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import SiteFooter from '@/components/SiteFooter';
import ArticleBody from '@/components/ArticleBody';
import ProgressiveImage from '@/components/ProgressiveImage';
import PhotoCredit, { PHOTO } from '@/components/PhotoCredit';
import { articleBySlug } from '@/data/articles';
import NotFound from './NotFound';
import '../site.css';

export default function Post() {
  const { slug } = useParams();
  const a = articleBySlug(slug);

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

  // Yazı dosyasının ilk paragrafı (düz metinse), fotoğrafın üstünde giriş olarak gösterilir.
  const isPlain = (c?: string) => !!c && !/^(!\[|\[Event |<|#|>)/.test(c.trim());
  const lead = a.chunks && a.photo && isPlain(a.chunks[0]) ? a.chunks[0] : null;
  const rest = a.chunks && lead ? a.chunks.slice(1) : a.chunks;

  return (
    <div className="sk min-h-screen bg-[#0E0C0A]">
      <Link to="/" state={{ top: true }} aria-label="Ana sayfaya dön" className="fixed top-5 right-5 z-50 w-12 h-12 rounded-full bg-[#F1E9DC] text-[#0E0C0A] grid place-items-center hover:bg-[#C8893E]"><X /></Link>
      <article className="max-w-[760px] mx-auto px-6 pt-32 relative pb-32">
        <p className="f-mono text-[#C8893E]">{a.cat}</p>
        <h1 className="f-display text-[clamp(44px,6vw,88px)] mt-6">{a.title}</h1>
        {(a.dek ?? a.excerpt) && (
          <p className="text-lg leading-[1.8] text-[#F1E9DC]/85 mt-8">
            <Markdown options={{ forceInline: true }}>{(a.dek ?? a.excerpt) as string}</Markdown>
          </p>
        )}
        <div className="mt-8 pb-8 border-b border-[#2E2620]">
          <p className="f-mono text-[#A89A88]">{[`${a.authorLabel ?? 'Yazar'}: ${a.author}`, a.translator && `Türkçesi: ${a.translator}`, a.date].filter(Boolean).join(' · ')}</p>
          {/* Yazı başka bir yerde yayımlandıysa künye notu: yazar satırının altında, aynı yazı tipiyle, sola yaslı. */}
          {a.note && <p className="f-mono text-[#A89A88] mt-3"><Markdown options={{ forceInline: true, overrides: { a: { props: { className: 'underline underline-offset-2 hover:text-[#F1E9DC]', target: '_blank', rel: 'noreferrer' } } } }}>{a.note}</Markdown></p>}
        </div>
        {lead && <div className="mt-10"><ArticleBody chunks={[lead]} /></div>}
        {a.photo && (
          <figure className="mt-10 mx-auto w-fit max-w-full">
            <ProgressiveImage path="images/jan-timman-1973.jpg" alt={PHOTO.alt} lazy={false} />
            <figcaption className="mt-3 w-0 min-w-full"><PhotoCredit /></figcaption>
          </figure>
        )}
        <div className="mt-10 space-y-6 text-lg leading-[1.8] text-[#F1E9DC]/85">
          {rest ? <ArticleBody chunks={rest} /> : a.body.map((p, i) => <p key={i} className={i === 0 ? 'first-letter:f-display first-letter:text-7xl first-letter:float-left first-letter:mr-3 first-letter:text-[#C8893E] first-letter:leading-[0.8]' : ''}>{p}</p>)}
        </div>
      </article>
      <SiteFooter page="post" />
    </div>
  );
}
