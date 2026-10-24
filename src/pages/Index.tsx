import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, Mail, Menu as MenuIcon, X } from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import { Link, useLocation, useNavigationType } from 'react-router-dom';
import PhotoCredit, { PHOTO } from '@/components/PhotoCredit';
import SiteFooter from '@/components/SiteFooter';
import FaviconBullet from '@/components/FaviconBullet';
import ProgressiveImage from '@/components/ProgressiveImage';
import FenDiagram from '@/components/FenDiagram';
import NewsletterForm from '@/components/NewsletterForm';
import { preloadChessPublica } from '@/lib/chesspublica';
import { ARTICLES, LISTED, PUBLISHED, articlePath, catLabel, catsOf } from '@/data/articles';
import '../site.css';

// Ana sayfadan en son ayrılırken kaydırma konumu (yazı sayfasındaki çarpı buraya döner).
let homeY = 0;

const NAV = [
  ['Kapak', 'kapak'],
  ['Yazılar', 'yazilar'],
  ['Yazarlar', 'yazarlar'],
  ['Hakkında', 'hakkinda'],
] as const;
// Altıncı menü öğesi: sayfa hazır olana kadar devre dışı (tıklanmaz, "Yakında...").
const NAV_SOON = 'Geçmiş sayılar';

// "Hakkında" bölümündeki atıflar (inline Markdown). Yeni bir üçüncü taraf yazılım/görsel eklenince buraya ve public/chesspublica/LICENSES.txt'ye eklenir.
const ATTRIBUTIONS = [
  // Kısa, madde işaretli liste; büyük harfli mono stilde yabancı adlar <span lang="en"> ile işaretlenir (Türkçe İ yerine I).
  // Yazı tipleri (SIL OFL) ve Lucide simgeleri (ISC) için görünür atıf istenmedi; listede yer almaz. Lucide'in ISC lisans metni (telif notu)
  // yine de public/chesspublica/LICENSES.txt içinde durur ("Lisans metinleri" bağlantısı).
  '[<span lang="en">ChessPublica</span>](https://chesspublica.github.io/), [<span lang="en">jQuery</span>](https://jquery.com/), [chessboard.js](https://chessboardjs.com/) (MIT) · [chess.js](https://github.com/jhlywa/chess.js) (BSD-2) · [Lisans metinleri](/chesspublica/LICENSES.txt)',
  'Taş görselleri: [<span lang="en">Colin M.L. Burnett</span>](https://commons.wikimedia.org/wiki/User:Cburnett) ([CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.tr))',
  'Fotoğraflar: künyeler her fotoğrafın altında',
];

// `credit` (articles.json): yazar adı yerine gösterilen ve bir adrese bağlanan künye (ana sayfa kartı ve "Tüm yazılar" satırı; örn. ©İSD). Kart ve satır zaten bir <Link> olduğundan
// iç içe <a> olmasın diye bağlantı rol="link" bir <span>'dır: tıklanınca (orta tuş ve Enter dahil) adres yeni sekmede açılır, kartın yazı bağlantısı tetiklenmez.
function CreditLink({ credit }: { credit: { text: string; href: string } }) {
  const open = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); window.open(credit.href, '_blank', 'noopener,noreferrer'); };
  return (
    <span role="link" tabIndex={0} onClick={open} onAuxClick={open} onKeyDown={(e) => { if (e.key === 'Enter') open(e); }}
      className="underline underline-offset-2 cursor-pointer hover:text-[#C8893E] transition-colors">{credit.text}</span>
  );
}

// authorLang (örn. "hu"): yazar adının dili; büyük harfe çevirmede Türkçe İ yerine o dilin kuralı kullanılır (GÖMÖRI).
// Köşelerin görünme sırası. Henüz yazısı olmayan köşe (örn. Söyleşi) sekmelerde görünmez; yazısı çıkınca (articles.json `cat`) bu sırayla yerini alır.
// Listede olmayan bir kategori yine de gizlenmez, sona eklenir.
const intro = PUBLISHED.find((a) => a.id === 'giris');
const CORNER_ORDER = ['Satranç tarihi', 'Turnuva günlüğü', 'Literatür inceleme', 'Analizli oyun', 'Açılış dosyası', 'Özel dosya', 'Söyleşi'];
const USED = new Set(PUBLISHED.flatMap((a) => catsOf(a)));
const CORNERS = [...CORNER_ORDER.filter((c) => USED.has(c)), ...[...USED].filter((c) => !CORNER_ORDER.includes(c))];
const tabCls = (on: boolean) => `f-mono h-11 border-b-2 transition-colors ${on ? 'border-[#C8893E] text-[#0E0C0A]' : 'border-transparent text-[#0E0C0A]/50 hover:text-[#0E0C0A]'}`;

// bio (Markdown bağlantıları olabilir) isteğe bağlıdır; boşsa kartta gösterilmez.
const AUTHORS: { name: string; role: string; bio?: string }[] = [
  { name: 'Nazmi Can Doğan', role: 'Kurucu, Yayın Yönetmeni', bio: 'FIDE ustası (FM). [YouTube kanalında](https://www.youtube.com/satranchess) içerik üretiyor ve canlı yayınlar yapıyor.' },
  { name: 'Oğul Köseoğlu', role: 'Kurucu, Editör', bio: 'Amatör satranççı, profesyonel [çevirmen](https://ogulkoseoglu.com/). Satranç vs.’nin ve [ChessPublica](https://chesspublica.github.io/)’nın web geliştiricisi.' },
  { name: 'Tarık Selbes', role: 'Kurucu, Yazar', bio: 'FIDE ustası (FM). [Café Chigorin](https://cafechigorin.com/) kişisel blogunda satranç tarihi, teorisi ve kültürü üzerine yazıyor.' },
  { name: 'Ahmad Al-Khatib', role: 'Konuk yazar', bio: 'Ürdün’ün ilk büyük ustası (GM). [YouTube kanalında](https://www.youtube.com/@GMAhmadAlkhatib) satranç içerikleri üretiyor.' },
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
  // Yazıdaki çarpı (state={{ restore: true }}) okuru ana sayfada ayrıldığı yere (örn. Yazılar bölümüne) geri getirir: ayrılırken konum `homeY`'de tutulur
  // (düzen cleanup'ı DOM kaldırılmadan, kaydırma konumu kısalan sayfaya göre kırpılmadan önce çalışır). Yenileme, geri/ileri ve diğer girişler yine sayfa başından açılır.
  const loc = useLocation();
  const restoreTo = useRef<number | null>(null);
  const navType = useNavigationType();
  // Çarpı ya da tarayıcının geri/ileri tuşu (POP) konumu geri getirir; `homeY` yenilemede sıfırlanır (modül yeniden yüklenir), yani yenileme yine sayfa başından açar. Adreste #bölüm varsa o önceliklidir.
  if (restoreTo.current === null) restoreTo.current = !loc.hash && ((loc.state as { restore?: boolean } | null)?.restore || navType === 'POP') ? homeY : 0;
  useLayoutEffect(() => {
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, restoreTo.current ?? 0);
    return () => { homeY = window.scrollY; };
  }, []);
  // Fotoğraflar ve diyagramlar yüklendikçe sayfa yüksekliği değiştiği için konum birkaç kez yeniden uygulanır; okur kaydırmaya başlarsa bırakılır.
  useEffect(() => {
    const target = restoreTo.current ?? 0;
    if (!target) return;
    let live = true;
    const go = () => { if (live) window.scrollTo(0, target); };
    const stop = () => { live = false; timers.forEach(clearTimeout); };
    const timers = [150, 500, 1200, 2500].map((ms) => window.setTimeout(go, ms));
    timers.push(window.setTimeout(stop, 2700));
    const events = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
    events.forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
    return () => { stop(); events.forEach((ev) => window.removeEventListener(ev, stop)); };
  }, []);
  // Yazı adresi doğrudan açıldıysa sekme başlığı yazının başlığıdır; yazı sayfası çıkarken onu geri yüklediği için burada sabitliyoruz.
  useEffect(() => { document.title = 'Satranç vs.'; }, []);
  // Öne çıkanlardaki diyagram için ChessPublica ve taş görselleri sayfa yüklenince boşta önceden indirilir (diyagram ekrana gelince hazır olur).
  useEffect(() => { if (ARTICLES.some((x) => x.diagram)) preloadChessPublica(); }, []);
  // Yazı sayfasındaki büyük “Satranç vs.” yazısı buraya state={{ top: true }} ile gelir: sayfa başına git.
  const { state, hash } = loc;
  useEffect(() => { if ((state as { top?: boolean } | null)?.top) window.scrollTo(0, 0); }, [state]);
  // Adreste #bölüm varsa (/#yazarlar, yazılardaki /#bulten bağlantısı) o bölüme gidilir. Ana sayfa yukarıda sayfa başına alındığı için tarayıcı
  // bağlantıyı kendisi kaydırmaz; fotoğraflar ve diyagramlar yüklendikçe sayfa yüksekliği değiştiğinden konum birkaç kez yeniden uygulanır
  // (Post.tsx'teki gibi) ve kullanıcı kaydırmaya başlarsa bırakılır. Bölümlerin scroll-margin'i sabit menünün altında kalmayı önler.
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (!id) return;
    let live = true;
    const go = () => { if (live) document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' }); };
    const stop = () => { live = false; timers.forEach(clearTimeout); };
    const timers = [0, 150, 500, 1200, 2500].map((ms) => window.setTimeout(go, ms));
    timers.push(window.setTimeout(stop, 2700));
    const events = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
    events.forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
    return () => { stop(); events.forEach((ev) => window.removeEventListener(ev, stop)); };
  }, [hash]);
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
  const list = LISTED.filter((a) => cat === 'Tümü' || catsOf(a).includes(cat));

  return (
    <div className="sk min-h-screen overflow-x-hidden">
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#0E0C0A]/90 backdrop-blur border-b border-[#2E2620]' : ''}`}>
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
          <a href="#kapak" className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <span className="grid grid-cols-2 w-7 h-7 border border-[#F1E9DC]"><span className="bg-[#C8893E]" /><span /><span /><span className="bg-[#F1E9DC]" /></span>
            <span className="f-display text-2xl tracking-tight">Satranç <em className="italic text-[#C8893E]">vs.</em></span>
          </a>
          <nav className="hidden lg:flex gap-6 xl:gap-10 whitespace-nowrap">
            {NAV.map(([l, id], i) => (
              <a key={id} href={`#${id}`} className="f-mono text-[#A89A88] hover:text-[#F1E9DC] transition-colors"><span className="text-[#C8893E]">0{i + 1}</span> {l}</a>
            ))}
            <span title="Yakında..." aria-disabled="true" className="hidden xl:inline f-mono text-[#A89A88] opacity-40 cursor-not-allowed select-none"><span className="text-[#C8893E]">0{NAV.length + 1}</span> {NAV_SOON}</span>
          </nav>
          {/* Bülten bölümüne götürür; her genişlikte görünür: masaüstünde menüden sonra, dar ekranda menü düğmesinin yanında (telefonda kısa yazı "Abone Ol", 360 px altında yalnızca zarf simgesi). */}
          <div className="flex items-center gap-3 shrink-0">
            <a href="#bulten" aria-label="Bültene Abone Ol" className="btn-mono inline-flex shrink-0 whitespace-nowrap rounded-full bg-[#F1E9DC] text-[#0E0C0A] max-[359px]:w-11 px-4 sm:px-6 max-[359px]:px-0 h-11 items-center justify-center transition-colors hover:bg-[#C8893E]"><Mail size={18} aria-hidden className="hidden max-[359px]:block" /><span className="max-[359px]:hidden sm:hidden">Abone Ol</span><span className="hidden sm:inline">Bültene Abone Ol</span></a>
            <button aria-label="Menüyü aç" onClick={() => setOpen(true)} className="lg:hidden w-11 h-11 grid place-items-center"><MenuIcon /></button>
          </div>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-[60] bg-[#0E0C0A] flex flex-col p-6">
          <button aria-label="Menüyü kapat" onClick={() => setOpen(false)} className="self-end w-11 h-11 grid place-items-center"><X /></button>
          <div className="flex-1 flex flex-col justify-center gap-4">
            {NAV.map(([l, id]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className="f-display text-6xl">{l}</a>)}
            <span title="Yakında..." aria-disabled="true" className="f-display text-6xl opacity-30 cursor-not-allowed select-none">{NAV_SOON}</span>
            <a href="#bulten" onClick={() => setOpen(false)} className="btn-mono mt-6 self-start inline-flex whitespace-nowrap rounded-full bg-[#F1E9DC] text-[#0E0C0A] px-6 h-11 items-center">Bültene Abone Ol</a>
          </div>
        </div>
      )}

      {/* KAPAK */}
      <section id="kapak" ref={heroRef} className="relative flex flex-col min-h-[max(100svh,680px)] overflow-hidden">
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
        <div className="relative pt-24 z-20 pointer-events-none">
          <div className="max-w-[1440px] mx-auto px-6 md:px-10 flex flex-col gap-2 sm:flex-row sm:justify-between f-mono text-[#A89A88]">
            <span>Dijital satranç dergisi</span><span>Sayı 1 · Ekim–Kasım–Aralık 2026</span>
          </div>
        </div>
        <div className="relative mt-auto pt-12 z-20 pointer-events-none">
          <div className="max-w-[1440px] mx-auto px-6 md:px-10 pb-28 md:pb-16">
            <p className="f-mono text-[#C8893E] mb-6">{catLabel(cover) && <>{catLabel(cover)} · </>}<span className="whitespace-nowrap">{cover.date}</span></p>
            <h1 className="f-display text-[clamp(40px,6.5vw,112px)] max-w-[26ch]">
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]"><span className="rise">Mar del Plata, 1982:</span></span>
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]"><span className="rise italic text-[#C8893E]" style={{ animationDelay: '.15s' }}>Jan Timman</span></span>
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]"><span className="rise italic text-[#C8893E]" style={{ animationDelay: '.3s' }}>ve bir zaferin anatomisi</span></span>
            </h1>
            <div className="mt-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <p className="max-w-md text-[1.3125rem] leading-[1.5] text-[#F1E9DC]/80"><Markdown options={{ forceInline: true }}>{cover.excerpt ?? cover.dek ?? ''}</Markdown> <span className="f-mono text-[#A89A88] block mt-3">{cover.authorLabel ?? 'Yazar'}: <span lang={cover.authorLang}>{cover.author}</span></span></p>
              <Link to={articlePath(cover)} className="btn-mono group pointer-events-auto inline-flex items-center gap-3 rounded-full bg-[#F1E9DC] text-[#0E0C0A] h-14 px-8 hover:bg-[#C8893E] transition-colors self-start">Yazıyı oku <ArrowUpRight size={18} className="group-hover:rotate-45 transition-transform" /></Link>
            </div>
          </div>
        </div>
        {cover.photo && (
          <div className="absolute inset-x-0 bottom-3 z-20 pointer-events-none">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 flex md:justify-end">
              <PhotoCredit className="max-w-[520px] md:text-right pointer-events-auto !uppercase tracking-[0.08em]" />
            </div>
          </div>
        )}
      </section>

      {/* ÖNE ÇIKANLAR */}
      <section id="one-cikanlar" className="max-w-[1440px] mx-auto px-6 md:px-10 py-24 md:py-40">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 reveal">
          <div><Label n="01">Bu Sayıda</Label>
            <h2 className="f-display text-[clamp(48px,7vw,120px)] mt-8">Öne <em className="italic text-[#C8893E]">çıkanlar</em></h2></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mt-16">
          {featured.map((a, i) => {
            // İnce ayraçlar (Tüm yazılar listesindeki çizgi gibi): kartlar arası boşluğun ortasında; mobilde alt alta kartların arasında yatay,
            // masaüstünde birinci kartın sağında dikey (içeriğin sağ kenarı, 515 px, ile sağ sütun arasının ortasında), sağ sütundaki kartlar arasında yatay.
            // İkisi de 1 px border. Uzun dikey çizgi aynı renkte yataydan daha parlak göründüğü için dikeyin opaklığı daha düşük (%11, yatay %15).
            const sep = i === featured.length - 1 ? '' : ' after:absolute after:border-[#F1E9DC]/15 after:pointer-events-none after:inset-x-0 after:-bottom-5 after:border-b' + (i === 0 ? ' md:after:inset-x-auto md:after:right-auto md:after:left-[calc((min(100%,515px)+100%+40px)/2)] md:after:top-0 md:after:bottom-0 md:after:border-b-0 md:after:border-l md:after:border-[#F1E9DC]/[0.11]' : '');
            const cls = `relative block text-left reveal${sep} ${i === 0 ? 'md:col-span-7 md:row-span-2' : `md:col-span-5${i === featured.length - 1 ? ' md:self-end' : ''}`}${a.diagram ? ' md:flex md:flex-col' : ''}`;
            const inner = (
              <>
                {a.thumb && <ProgressiveImage path={a.thumb} alt={a.thumbAlt ?? ''} thumb position={a.thumbPosition} />}
                <p className={`f-mono text-[#C8893E] w-fit max-w-full ${a.thumb ? 'mt-6' : ''}`}>{catLabel(a) && <>{catLabel(a)} · </>}<span className="whitespace-nowrap">{a.date}</span></p>
                <h3 className={`f-display mt-3 w-fit max-w-full ${a.draft ? '' : 'group-hover:italic'} transition-all ${i === 0 ? 'text-5xl md:text-6xl' : 'text-3xl md:text-4xl'}`}>{a.titleLines ? <>{a.titleLines[0]}<br /><em className="italic text-[#C8893E]">{a.titleLines[1]}</em></> : a.title}</h3>
                {a.dek && <p className="text-[1.1875rem] leading-[1.5] text-[#F1E9DC]/70 mt-3 max-w-xl w-fit"><Markdown options={{ forceInline: true }}>{a.dek}</Markdown></p>}
                <p className="f-mono text-[#A89A88] mt-4 w-fit max-w-full">{a.credit ? <CreditLink credit={a.credit} /> : <>{a.authorLabel ?? 'Yazar'}: <span lang={a.authorLang}>{a.author}</span></>}</p>
                {/* Diyagram metnin altında; ilk kartta kalan yüksekliği doldurur (FenDiagram `fill`). */}
                {a.diagram && <FenDiagram fen={a.diagram} orientation={a.diagramOrientation} badge={a.diagramBadge} arrow={a.diagramArrow} label={a.diagramAlt ?? a.title} caption={a.diagramCaption} fill={i === 0} />}
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
      <section id="yazilar" className="bg-[#F1E9DC] text-[#0E0C0A]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-24 md:py-40 grid md:grid-cols-12 gap-10">
          <div ref={leftCol} className="md:col-span-3 reveal relative">
            <p className="f-mono text-[#0E0C0A]/60"><span className="text-[#9A5F1E]">02</span> — Bu Sayıdaki</p>
            <h2 className="f-display text-[clamp(36px,4.5vw,72px)] mt-8">Tüm<br /><em className="italic">yazılar</em></h2>
            <div role="tablist" aria-label="Tüm yazılar" className="mt-12">
              <button role="tab" aria-selected={cat === 'Tümü'} onClick={() => setCat('Tümü')} className={tabCls(cat === 'Tümü')}>Tümü</button>
            </div>
            <h2 id="koseler" ref={koseHead} className="f-display text-[clamp(36px,4.5vw,72px)] mt-14 scroll-mt-28"><em className="italic">Köşeler</em></h2>
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
                    {catLabel(a) && <p className="f-mono text-[#9A5F1E] text-[11px]">{catLabel(a)}</p>}
                    <p className={`f-display text-2xl md:text-4xl ${catLabel(a) ? 'mt-2' : ''} group-hover:italic group-hover:translate-x-2 transition-all duration-500`}>{a.title}</p>
                    <p className="text-base text-[#0E0C0A]/60 mt-2">{a.credit ? <CreditLink credit={a.credit} /> : a.author} · <span className="whitespace-nowrap">{a.date}</span></p>
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
              {au.bio && <p className="text-[1.1875rem] leading-[1.5] text-[#F1E9DC]/70 mt-4"><Markdown options={{ forceInline: true, overrides: { a: { props: { className: 'underline decoration-[#C8893E]/50 underline-offset-4 hover:text-[#C8893E] hover:decoration-[#C8893E]', target: '_blank', rel: 'noreferrer' } } } }}>{au.bio}</Markdown></p>}
            </div>
          ))}
        </div>
      </section>

      {/* HAKKINDA + BÜLTEN */}
      {/* scroll-mt: bu bölümün üst dolgusu yok; menü bağlantısıyla gelindiğinde başlık sabit menünün altında kalmasın (diğer bölümlerin üst dolgusuyla aynı pay: 96/160 px). */}
      <section id="hakkinda" className="max-w-[1440px] mx-auto px-6 md:px-10 pb-24 md:pb-40 grid md:grid-cols-12 gap-10 scroll-mt-24 md:scroll-mt-40">
        <div className="md:col-span-6 reveal">
          <Label n="04">Hakkında</Label>
          <h2 className="f-display text-[clamp(40px,5.5vw,88px)] mt-8">
            <span className="block"><FaviconBullet className="inline-block align-top mt-[0.075em] mr-[calc(13.25px_-_0.054em)]" />Satranç <em className="italic text-[#C8893E]">vs.</em></span>
            <em className="italic text-[#C8893E]">‘Satranç ve siz’ demek.</em>
          </h2>
          <p className="text-[1.1875rem] text-[#F1E9DC]/75 leading-relaxed mt-10 max-w-xl">Satranç vs.; satranç tarihi yazıları, açılış dosyaları, turnuva günlükleri, analizli oyunlar, satranç literatür incelemeleri, özel dosyalar ve söyleşiler yayınlayan bağımsız bir dijital dergidir.</p>
          {/* İlk sayı yazısına (giris) götüren kart: dergiyi neden çıkardığımızı anlatan yazı. */}
          {intro && (
            <Link to={articlePath(intro)} className="group mt-8 max-w-xl flex items-center justify-between gap-6 border border-[#2E2620] hover:border-[#C8893E] transition-colors px-6 py-5">
              <span className="block">
                <span className="block f-mono text-[#C8893E] text-[11px]">Dergiyi neden çıkardık?</span>
                <span className="block f-display text-3xl md:text-4xl mt-2 group-hover:italic transition-all">{intro.title}</span>
                <span className="block text-base text-[#A89A88] mt-2 leading-snug">Satranç vs.’nin hikâyesi ve sizi masaya çağıran ilk sayı yazısı.</span>
              </span>
              <ArrowUpRight className="shrink-0 group-hover:rotate-45 transition-transform" />
            </Link>
          )}
        </div>
        {/* Sağ sütun (md ve üstü): üstte iletişim paragrafı, altta mono içerik (atıflar, telif notu); sütun sol sütunla aynı yüksekliğe gerilir, alt grup sol sütunun son satırıyla aynı taban çizgisindedir. Mobilde sol sütunun altına alt alta dizilir. */}
        <div className="md:col-span-6 reveal md:flex md:flex-col md:justify-between md:gap-12">
          {/* İletişim paragrafı: tek sütunda sol sütunun hemen altında (sıra aynı), iki sütunda sağ sütunun üstünde; atıflar ve telif notu sütunun altında kalır (son satırı sol sütunun son satırıyla aynı taban çizgisinde). */}
          <p className="text-[1.1875rem] text-[#F1E9DC]/75 leading-relaxed max-w-xl">Bize ulaşmak, yayın ekibine katılmak ya da yazı taslaklarınızı göndermek için <a href="mailto:editor@satrancvs.com" className="underline underline-offset-2 hover:text-[#F1E9DC]">editor@satrancvs.com</a> adresine e-posta gönderebilirsiniz. Yayın ekibi, paylaştığınız tüm öneri ve yazı taslaklarını büyük bir özenle inceler. Değerlendirme süreci zaman alabildiğinden yanıtlardaki olası gecikmelerde göstereceğiniz sabır ve anlayış için şimdiden teşekkür ederiz.</p>

          {/* Atıflar: sitede kullanılan üçüncü taraf yazılım ve görseller (lisans metinleri public/chesspublica/LICENSES.txt). */}
          <div>
          <div className="max-w-xl mt-12 md:mt-0">
              <p className="f-mono text-[#C8893E]">Atıflar</p>
              <ul className="f-mono !text-[11px] !tracking-[0.12em] leading-[1.8] mt-3 space-y-1 text-[#A89A88] list-disc pl-5 marker:text-[#C8893E]">
                {ATTRIBUTIONS.map((t, i) => (
                  <li key={i}><Markdown options={{ forceInline: true, overrides: { a: { props: { className: 'underline underline-offset-2 hover:text-[#F1E9DC]', target: '_blank', rel: 'noreferrer' } } } }}>{t}</Markdown></li>
                ))}
              </ul>
            </div>
            <div className="mt-10 max-w-xl">
              <p className="f-mono text-[#C8893E]">Telif hakları</p>
              <p className="f-mono !text-[11px] !tracking-[0.12em] leading-[1.9] text-[#F1E9DC]/75 mt-4">Satranç vs. dijital satranç dergisinde yayınlanan yazıların telif hakları yazarlarına, dijital mecrada yayınlama yetkisi ise (aksi belirtilmedikçe) Satranç vs. dijital satranç dergisine aittir. Önceden yazılı izin alınmaksızın kısmen veya tamamen kopyalanamaz, çoğaltılamaz ve kaynak gösterilmeden başka platformlarda yayınlanamaz.</p>
            </div>
          </div>
        </div>
        <div id="bulten" className="md:col-span-12 mt-10 scroll-mt-28 border border-[#2E2620] p-8 md:p-14 grid md:grid-cols-2 gap-8 items-end">
          <div><p className="f-mono text-[#C8893E]">Bülten</p><h3 className="f-display text-4xl md:text-6xl mt-4">Yeni yazılar, <em className="italic">e-postanda.</em></h3></div>
          <NewsletterForm />
        </div>
      </section>

      <SiteFooter />

    </div>
  );
}
