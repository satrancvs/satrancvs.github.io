import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu as MenuIcon, X, Mail } from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import { Link, useLocation } from 'react-router-dom';
import PhotoCredit, { PHOTO } from '@/components/PhotoCredit';
import SiteFooter from '@/components/SiteFooter';
import FaviconBullet from '@/components/FaviconBullet';
import ProgressiveImage from '@/components/ProgressiveImage';
import FenDiagram from '@/components/FenDiagram';
import { ARTICLES, PUBLISHED, articlePath } from '@/data/articles';
import '../site.css';

const NAV = [
  ['Kapak', 'kapak'],
  ['Yazılar', 'yazilar'],
  ['Köşeler', 'koseler'],
  ['Yazarlar', 'yazarlar'],
  ['Hakkında', 'hakkinda'],
] as const;

// Yazar kartındaki sayaç: yayımlanmış yazı sayısı; yalnızca henüz yayımlanmamış (taslak) yazısı olan yazarlar için "Yakında".
// Çevirmen de sayılır (Gömöri yazısı: yazar Eugen Gömöri, Türkçesi Tarık Selbes).
const bare = (n?: string) => n?.replace(/^(FM|GM)\s+/, '');
const byAuthor = (list: typeof ARTICLES, name: string) => list.filter((a) => bare(a.author) === name || bare(a.translator) === name).length;
const authorCount = (name: string) => {
  const n = byAuthor(PUBLISHED, name);
  return n > 0 || byAuthor(ARTICLES, name) === 0 ? `${n} yazı` : 'Yakında';
};

const CORNERS = Array.from(new Set(PUBLISHED.map((a) => a.cat)));
const tabCls = (on: boolean) => `f-mono h-11 border-b-2 transition-colors ${on ? 'border-[#C8893E] text-[#0E0C0A]' : 'border-transparent text-[#0E0C0A]/50 hover:text-[#0E0C0A]'}`;

// bio (Markdown bağlantıları olabilir) ve sayaç isteğe bağlıdır; boşsa kartta gösterilmez. count: true yayımlanmış yazılardan
// hesaplanır (yazar veya çevirmen); sayı verilirse o gösterilir.
const AUTHORS: { name: string; role: string; bio?: string; count?: boolean | number }[] = [
  { name: 'Nazmi Can Doğan', role: 'Kurucu, Yayın Yönetmeni', bio: 'FIDE ustası (FM). [YouTube kanalında](https://www.youtube.com/satranchess) içerik üretiyor ve canlı yayınlar yapıyor.', count: 3 },
  { name: 'Tarık Selbes', role: 'Kurucu, Yazar', bio: 'FIDE ustası (FM). [Café Chigorin](https://cafechigorin.com/) sitesinde satranç tarihi, teorisi ve kültürü üzerine yazıyor.', count: true },
  { name: 'Oğul Köseoğlu', role: 'Kurucu, Editör', bio: 'Amatör satranç oyuncusu, profesyonel [çevirmen](https://ogulkoseoglu.com/). Satranç vs. ve [ChessPublica](https://chesspublica.github.io/) için web geliştirici.', count: 2 },
  { name: 'Ahmad Al-Khatib', role: 'Konuk yazar', bio: 'Ürdün’ün ilk büyük ustası (GM).', count: true },
];

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('pre'); io.observe(el); }
    });
    return () => io.disconnect();
  }, []);
}

function Label({ n, children }: { n: string; children: string }) {
  return <p className="f-mono text-[#A89A88]"><span className="text-[#C8893E]">{n}</span> — {children}</p>;
}

const CELL = 96;

// Kare hücreler: sütun sayısı genişliğe göre seçilir, hücre kenarı genişliği tam böler.
function gridMetrics(w: number, h: number) {
  const cols = Math.max(1, Math.round(w / CELL));
  const s = w / cols;
  return { cols, s, rows: s > 0 ? Math.ceil(h / s) : 0 };
}

function ChessGrid({ w, h }: { w: number; h: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -999, y: -999 });
  const { cols, s, rows } = gridMetrics(w, h);
  return (
    <div ref={ref} aria-hidden
      onMouseMove={(e) => { const r = ref.current!.getBoundingClientRect(); setPos({ x: e.clientX - r.left, y: e.clientY - r.top }); }}
      onMouseLeave={() => setPos({ x: -999, y: -999 })}
      className="absolute inset-0 grid overflow-hidden z-10"
      style={{ gridTemplateColumns: `repeat(${cols}, ${s}px)`, gridAutoRows: `${s}px` }}>
      {Array.from({ length: cols * rows }).map((_, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const d = Math.hypot((col + 0.5) * s - pos.x, (row + 0.5) * s - pos.y);
        const a = Math.max(0, 1 - d / 260);
        const dark = (col + row) % 2 === 1;
        return <div key={i} className="border-[0.5px] border-[#F1E9DC]/[0.04] transition-colors duration-500"
          style={{ backgroundColor: dark ? `rgba(14,12,10,${0.55 * (1 - a)})` : `rgba(200,137,62,${0.18 * a})` }} />;
      })}
    </div>
  );
}

export default function Index() {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState('Tümü');
  const [scrolled, setScrolled] = useState(false);
  // Bir köşe seçilince liste "Köşeler" başlığıyla hizalanır (Tümü seçiliyken "Tüm yazılar" başlığıyla): sol sütunda başlığın
  // üst boşluğu ölçülür, liste o kadar aşağı itilir. Yalnızca iki sütunlu düzende (md ve üstü).
  const leftCol = useRef<HTMLDivElement>(null);
  const koseHead = useRef<HTMLHeadingElement>(null);
  const [listShift, setListShift] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const wide = window.matchMedia('(min-width: 768px)').matches;
      setListShift(wide && cat !== 'Tümü' && koseHead.current ? koseHead.current.offsetTop : 0);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [cat]);
  const [y, setY] = useState(0);
  useReveal();
  // Ana sayfa her açılışta (yenileme, geri tuşu dahil) sayfa başında görünür: tarayıcı bu girişin kaydırma konumunu
  // geri yüklemesin. Sonraki girişler (yazı sayfaları) kendi kaydırma konumunu hatırlar, bkz. Post.tsx.
  useLayoutEffect(() => {
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);
  // Yazı adresi doğrudan açıldıysa sekme başlığı yazının başlığıdır; yazı sayfası çıkarken onu geri yüklediği için burada sabitliyoruz.
  useEffect(() => { document.title = 'Satranç vs.'; }, []);
  // Yazı sayfasındaki büyük “Satranç vs.” yazısı buraya state={{ top: true }} ile gelir: sayfa başına git.
  const { state } = useLocation();
  useEffect(() => { if ((state as { top?: boolean } | null)?.top) window.scrollTo(0, 0); }, [state]);
  const heroRef = useRef<HTMLElement>(null);
  const [hero, setHero] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = heroRef.current!;
    const measure = () => setHero({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Fotoğrafın sol kenarı, parlayan karelerin bir dikey çizgisine oturur (masaüstünde ~%45'ten sonraki ilk çizgi).
  const grid = gridMetrics(hero.w, hero.h);
  const photoLeft = hero.w >= 768 ? Math.ceil(grid.cols * 0.45) * grid.s : 0;
  useEffect(() => {
    const on = () => { setScrolled(window.scrollY > 40); setY(window.scrollY); };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const [cover, ...rest] = ARTICLES;
  const featured = rest.slice(0, 3);
  const list = PUBLISHED.filter((a) => cat === 'Tümü' || a.cat === cat);

  return (
    <div className="sk min-h-screen overflow-x-hidden">
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#0E0C0A]/90 backdrop-blur border-b border-[#2E2620]' : ''}`}>
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
          <a href="#kapak" className="flex items-center gap-3">
            <span className="grid grid-cols-2 w-7 h-7 border border-[#F1E9DC]"><span className="bg-[#C8893E]" /><span /><span /><span className="bg-[#F1E9DC]" /></span>
            <span className="f-display text-2xl tracking-tight">Satranç <em className="italic text-[#C8893E]">vs.</em></span>
          </a>
          <nav className="hidden lg:flex gap-10">
            {NAV.map(([l, id], i) => (
              <a key={id} href={`#${id}`} className="f-mono text-[#A89A88] hover:text-[#F1E9DC] transition-colors"><span className="text-[#C8893E]">0{i + 1}</span> {l}</a>
            ))}
          </nav>
          {/* Bülten servisi hazır olana kadar devre dışı. */}
          <span title="Yakında..." aria-disabled="true" className="hidden lg:inline-flex rounded-full bg-[#F1E9DC] text-[#0E0C0A] px-6 h-11 items-center text-sm font-semibold opacity-50 cursor-not-allowed select-none">Bültene Abone Ol</span>
          <button aria-label="Menüyü aç" onClick={() => setOpen(true)} className="lg:hidden w-11 h-11 grid place-items-center"><MenuIcon /></button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-[60] bg-[#0E0C0A] flex flex-col p-6">
          <button aria-label="Menüyü kapat" onClick={() => setOpen(false)} className="self-end w-11 h-11 grid place-items-center"><X /></button>
          <div className="flex-1 flex flex-col justify-center gap-4">
            {NAV.map(([l, id]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className="f-display text-6xl">{l}</a>)}
          </div>
        </div>
      )}

      {/* KAPAK */}
      <section id="kapak" ref={heroRef} className="relative h-[100svh] min-h-[680px] overflow-hidden">
        {cover.photo && hero.w > 0 && (
          <>
            <img src={PHOTO.src} alt={PHOTO.alt} className="absolute inset-y-0 right-0 h-full object-cover object-[50%_20%] grayscale opacity-40 md:opacity-80"
              style={{ width: hero.w - photoLeft }} />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0E0C0A] via-[#0E0C0A]/70 md:via-[#0E0C0A]/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0E0C0A] to-transparent" />
            <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#0E0C0A] to-transparent" />
          </>
        )}
        <ChessGrid w={hero.w} h={hero.h} />
        <div className="absolute top-24 inset-x-0 z-20 pointer-events-none">
          <div className="max-w-[1440px] mx-auto px-6 md:px-10 flex flex-col gap-1 sm:flex-row sm:justify-between f-mono text-[#A89A88]">
            <span>Dijital satranç dergisi</span><span>Sayı 1 · Ekim-Kasım-Aralık 2026</span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
          <div className="max-w-[1440px] mx-auto px-6 md:px-10 pb-28 md:pb-16">
            <p className="f-mono text-[#C8893E] mb-6">{cover.cat} · {cover.date}</p>
            <h1 className="f-display text-[clamp(40px,6.5vw,112px)] max-w-[26ch]">
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]"><span className="rise">Mar del Plata 1982:</span></span>
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]"><span className="rise italic text-[#C8893E]" style={{ animationDelay: '.15s' }}>Jan Timman</span></span>
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]"><span className="rise italic text-[#C8893E]" style={{ animationDelay: '.3s' }}>ve bir zaferin anatomisi</span></span>
            </h1>
            <div className="mt-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <p className="max-w-md text-lg text-[#F1E9DC]/80"><Markdown options={{ forceInline: true }}>{cover.excerpt ?? cover.dek ?? ''}</Markdown> <span className="f-mono text-[#A89A88] block mt-3">{cover.authorLabel ?? 'Yazar'}: {cover.author}</span></p>
              <Link to={articlePath(cover)} className="group pointer-events-auto inline-flex items-center gap-3 rounded-full bg-[#F1E9DC] text-[#0E0C0A] h-14 px-8 font-semibold hover:bg-[#C8893E] transition-colors self-start">Yazıyı oku <ArrowUpRight size={18} className="group-hover:rotate-45 transition-transform" /></Link>
            </div>
          </div>
        </div>
        {cover.photo && (
          <div className="absolute inset-x-0 bottom-3 z-20 pointer-events-none">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 flex md:justify-end">
              <PhotoCredit className="max-w-[520px] md:text-right pointer-events-auto" />
            </div>
          </div>
        )}
      </section>

      {/* ÖNE ÇIKANLAR */}
      <section id="yazilar" className="max-w-[1440px] mx-auto px-6 md:px-10 py-24 md:py-40">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 reveal">
          <div><Label n="01">Bu Sayıda</Label>
            <h2 className="f-display text-[clamp(48px,7vw,120px)] mt-8">Öne <em className="italic text-[#C8893E]">çıkanlar</em></h2></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mt-16">
          {featured.map((a, i) => {
            const cls = `block text-left reveal ${i === 0 ? 'md:col-span-7 md:row-span-2' : 'md:col-span-5'}${a.diagram ? ' md:flex md:flex-col' : ''}`;
            const inner = (
              <>
                {a.thumb && <ProgressiveImage path={a.thumb} alt={a.thumbAlt ?? ''} thumb position={a.thumbPosition} />}
                {a.diagram && <FenDiagram fen={a.diagram} orientation={a.diagramOrientation} badge={a.diagramBadge} label={a.diagramAlt ?? a.title} caption={a.diagramCaption} fill={i === 0} />}
                <p className="f-mono text-[#C8893E] mt-6 w-fit max-w-full">{a.cat} · {a.date}</p>
                <h3 className={`f-display mt-3 w-fit max-w-full ${a.draft ? '' : 'group-hover:italic'} transition-all ${i === 0 ? 'text-5xl md:text-6xl' : 'text-3xl md:text-4xl'}`}>{a.titleLines ? <>{a.titleLines[0]}<br /><em className="italic text-[#C8893E]">{a.titleLines[1]}</em></> : a.title}</h3>
                {a.dek && <p className="text-[#F1E9DC]/70 mt-3 max-w-xl w-fit">{a.dek}</p>}
                <p className="f-mono text-[#A89A88] mt-4 w-fit max-w-full">{a.authorLabel ?? 'Yazar'}: {a.author}</p>
              </>
            );
            // Taslak (yayımlanmamış) yazı tıklanmaz: sayfası yok. Bağlantı yalnızca içeriğin (görsel, diyagram, metin satırları)
            // üstünde etkindir; yanındaki boş alan tıklanmaz (a'da pointer-events kapalı, çocuklarda açık).
            return a.draft
              ? <div key={a.id} className={cls}>{inner}</div>
              : <Link key={a.id} to={articlePath(a)} className={`group pointer-events-none [&>*:not(.fen-wrap)]:pointer-events-auto ${cls}`}>{inner}</Link>;
          })}
        </div>
      </section>

      {/* KATEGORİLER / ARŞİV */}
      <section id="koseler" className="bg-[#F1E9DC] text-[#0E0C0A]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-24 md:py-40 grid md:grid-cols-12 gap-10">
          <div ref={leftCol} className="md:col-span-3 reveal relative">
            <p className="f-mono text-[#0E0C0A]/60"><span className="text-[#9A5F1E]">02</span> — Bu Sayıdaki</p>
            <h2 className="f-display text-[clamp(36px,4.5vw,72px)] mt-8">Tüm<br /><em className="italic">yazılar</em></h2>
            <div role="tablist" aria-label="Tüm yazılar" className="mt-12">
              <button role="tab" aria-selected={cat === 'Tümü'} onClick={() => setCat('Tümü')} className={tabCls(cat === 'Tümü')}>Tümü</button>
            </div>
            <h2 ref={koseHead} className="f-display text-[clamp(36px,4.5vw,72px)] mt-14"><em className="italic">Köşeler</em></h2>
            <div role="tablist" aria-label="Köşeler" className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-8">
              {CORNERS.map((k, i) => (
                <span key={k} className="inline-flex items-center gap-x-3 whitespace-nowrap">
                <button role="tab" aria-selected={cat === k} onClick={() => setCat(k)} className={tabCls(cat === k)}>{k}</button>
                {i < CORNERS.length - 1 && <span aria-hidden className="f-mono text-[#0E0C0A]/35">·</span>}
                </span>
              ))}
            </div>
          </div>
          <ul className="md:col-span-9 transition-[margin] duration-300" style={{ marginTop: listShift }}>
            {list.map((a, i) => (
              <li key={cat + a.id}>
                <Link to={articlePath(a)} className="group w-full text-left grid grid-cols-[48px_1fr_auto] md:grid-cols-[48px_1fr_auto] items-center gap-4 md:gap-6 py-7 border-b border-[#0E0C0A]/15">
                  <span className="f-mono normal-case text-[#0E0C0A]/40">{String.fromCharCode(97 + (i % 8))}{i + 1}</span>
                  <div>
                    <p className="f-mono text-[#9A5F1E] text-[11px]">{a.cat}</p>
                    <p className="f-display text-2xl md:text-4xl mt-2 group-hover:italic group-hover:translate-x-2 transition-all duration-500">{a.title}</p>
                    <p className="text-sm text-[#0E0C0A]/60 mt-2">{a.author} · {a.date}</p>
                  </div>
                  <ArrowUpRight className="group-hover:rotate-45 transition-transform" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* YAZARLAR */}
      <section id="yazarlar" className="py-24 md:py-40">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 reveal">
          <Label n="03">Yazarlar</Label>
          <h2 className="f-display text-[clamp(48px,7vw,120px)] mt-8">Katkıda <em className="italic text-[#C8893E]">bulunanlar</em></h2>
        </div>
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 mt-16 grid sm:grid-cols-2 lg:grid-cols-4 border-t border-[#2E2620]">
          {AUTHORS.map((au, i) => (
            <div key={au.name} className="group p-8 border-b sm:border-r border-[#2E2620] hover:bg-[#1A1512] transition-colors">
              <span className={`block w-14 h-14 mb-8 ${(i % 2) ? 'bg-[#F1E9DC]' : 'bg-[#3A2C22]'} grid place-items-center f-display text-3xl ${(i % 2) ? 'text-[#0E0C0A]' : 'text-[#C8893E]'}`}>{'♔♕♖♘♗'[i]}</span>
              <h3 className="f-display text-3xl">{au.name}</h3>
              <p className="f-mono text-[#C8893E] mt-3">{au.role}</p>
              {au.bio && <p className="text-[#F1E9DC]/70 mt-4"><Markdown options={{ forceInline: true, overrides: { a: { props: { className: 'underline decoration-[#C8893E]/50 underline-offset-4 hover:text-[#C8893E] hover:decoration-[#C8893E]', target: '_blank', rel: 'noreferrer' } } } }}>{au.bio}</Markdown></p>}
              {au.count && <p className="f-mono text-[#A89A88] mt-6">{typeof au.count === 'number' ? `${au.count} yazı` : authorCount(au.name)}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* HAKKINDA + BÜLTEN */}
      <section id="hakkinda" className="max-w-[1440px] mx-auto px-6 md:px-10 pb-24 md:pb-40 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-7 reveal">
          <Label n="04">Hakkında</Label>
          <h2 className="f-display text-[clamp(40px,5.5vw,88px)] mt-8">
            <span className="block"><FaviconBullet className="inline-block align-top mt-[0.075em] mr-[calc(13.25px_-_0.054em)]" />Satranç <em className="italic text-[#C8893E]">vs.</em></span>
            <em className="italic text-[#C8893E]">‘Satranç ve siz’ demek.</em>
          </h2>
          <p className="text-[#F1E9DC]/75 leading-relaxed mt-10 max-w-xl">Satranç vs., satranç üzerine uzun okumalar, analizler ve hikâyeler yayımlayan bağımsız bir dergidir. Bir fincan kahve eşliğinde, acele etmeden okunsun diye.</p>
        </div>
        <div id="bulten" className="md:col-span-12 mt-10 border border-[#2E2620] p-8 md:p-14 grid md:grid-cols-2 gap-8 items-end">
          <div><p className="f-mono text-[#C8893E]">Bülten</p><h3 className="f-display text-4xl md:text-6xl mt-4">Her ay bir hamle, <em className="italic">e-postanda.</em></h3></div>
          {/* Bülten servisi hazır olana kadar devre dışı; devre dışı öğeler tooltip göstermediği için title kapsayıcıda. */}
          <form onSubmit={(e) => e.preventDefault()} title="Yakında..." aria-disabled="true" className="flex flex-col sm:flex-row gap-3 cursor-not-allowed opacity-60">
            <label htmlFor="em" className="sr-only">E-posta</label>
            <input id="em" type="email" disabled placeholder="e-posta adresin"
              className="flex-1 h-14 bg-transparent border-b border-[#F1E9DC]/40 outline-none text-lg cursor-not-allowed" />
            <button type="button" disabled className="h-14 px-8 rounded-full bg-[#F1E9DC] text-[#0E0C0A] font-semibold inline-flex items-center gap-2 justify-center cursor-not-allowed"><Mail size={18} /> Abone ol</button>
          </form>
        </div>
      </section>

      <SiteFooter />

    </div>
  );
}
