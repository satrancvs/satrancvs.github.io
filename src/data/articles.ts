import { splitArticle } from '@/components/ArticleBody';
import timmanMd from '@/content/mar-del-plata-1982.md?raw';
import muglaMd from '@/content/amman-mugla.md?raw';
import zebraMd from '@/content/zebralar-icin-satranc.md?raw';
import karlsruheMd from '@/content/karlsruhe-ve-yol-ayrimlari.md?raw';
import gomoriMd from '@/content/eugen-gomori.md?raw';
import atFilMd from '@/content/at-ve-fil.md?raw';
import aronianMd from '@/content/aronian-caro-kann.md?raw';
import palavanMd from '@/content/selim-palavan.md?raw';
import girisMd from '@/content/ilk-sayi-ilk-hamle.md?raw';
import { toTypography } from '@/lib/curly';
import data from './articles.json';

export type Article = {
  id: string; slug: string; oldSlugs?: string[]; cat?: string; cats?: string[]; listLabel?: string; title: string; dek?: string; author: string; authorLang?: string; authorLabel?: string; translator?: string; credit?: { text: string; href: string };
  excerpt?: string; date?: string; chunks?: string[]; photo?: boolean; thumb?: string; thumbAlt?: string; thumbPosition?: string; diagram?: string; diagramAlt?: string; diagramCaption?: string; titleLines?: [string, string]; note?: string; diagramOrientation?: 'white' | 'black'; diagramBadge?: { square: string; glyph: string }; diagramArrow?: { from: string; to: string }; draft?: boolean; unlisted?: boolean; body: string[];
};

// Gövdesi markdown dosyasından gelen yazılar (id -> dosya)
const CHUNKS: Record<string, string[]> = {
  kapak: splitArticle(timmanMd).chunks,
  mugla: splitArticle(muglaMd).chunks,
  zebra: splitArticle(zebraMd).chunks,
  karlsruhe: splitArticle(karlsruheMd).chunks,
  gomori: splitArticle(gomoriMd).chunks,
  atfil: splitArticle(atFilMd).chunks,
  aronian: splitArticle(aronianMd).chunks,
  palavan: splitArticle(palavanMd).chunks,
  giris: splitArticle(girisMd).chunks,
};

// Makale metinleri/üst bilgileri articles.json'da (build sırasında prerender de bunu okur);
// gövdesi markdown dosyasında olan yazılar için CHUNKS kullanılır.
// Başlık, alt başlık, özet ve kısa metinlerde düz tırnaklar kıvrık tırnağa çevrilir (makale gövdesi ArticleBody'de çevrilir).
const typo = (a: Article): Article => ({
  ...a,
  title: toTypography(a.title),
  dek: a.dek && toTypography(a.dek),
  excerpt: a.excerpt && toTypography(a.excerpt),
  body: a.body.map(toTypography),
});

// "Satranca ilk adım" bölümleri (gizli önizleme): src/content/ilk-adim-<ad>.md, adres `ilk-adim-<jeton>-<ad>`.
const BOOK_MD = import.meta.glob('@/content/ilk-adim-*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const bookChunks = (a: Article) => {
  const name = a.slug.match(/^ilk-adim-[^-]+-(.+)$/)?.[1];
  const md = name && BOOK_MD[`/src/content/ilk-adim-${name}.md`];
  return md ? splitArticle(md).chunks : undefined;
};

export const ARTICLES: Article[] = (data as Article[]).map((a) => { const chunks = CHUNKS[a.id] ?? bookChunks(a); return typo(chunks ? { ...a, chunks } : a); });

// `draft`: henüz yayımlanmamış yazı. Yalnızca ana sayfadaki "Öne çıkanlar" kartında görünür (tıklanmaz); sayfası, sitemap kaydı, listesi ve
// bildirimi yoktur. Yazı hazır olunca `draft` kaldırılır.
export const PUBLISHED = ARTICLES.filter((a) => !a.draft && !a.unlisted);
// `unlisted`: sayfası var (adresi bilen açar) ama ana sayfada, listede, sekmelerde ve sitemap'te yoktur; arama motorlarına `noindex` verilir (vite.config.ts).
const REACHABLE = ARTICLES.filter((a) => !a.draft);

// "Bu Sayıdaki Tüm yazılar" listesinin sırası (a1, b2, …). Kapak ve "Öne çıkanlar" articles.json sırasını izler, liste bundan bağımsızdır.
// Burada olmayan (yeni) yazılar listenin sonuna, articles.json sırasıyla eklenir.
const LIST_ORDER = ['giris', 'kapak', 'karlsruhe', 'atfil', 'aronian', 'mugla', 'zebra', 'palavan'];
const rank = (a: Article) => { const i = LIST_ORDER.indexOf(a.id); return i >= 0 ? i : LIST_ORDER.length + ARTICLES.indexOf(a); };
export const LISTED = [...PUBLISHED].sort((x, y) => rank(x) - rank(y));

export const articleBySlug = (slug?: string) => REACHABLE.find((a) => a.slug === slug);
// Adresi değişen yazının eski adresi (articles.json `oldSlugs`): ziyaretçi yeni adrese yönlendirilir (Post.tsx), vite.config.ts de dist/<eski>/index.html yönlendirme sayfası yazar.
export const articleByOldSlug = (slug?: string) => REACHABLE.find((a) => slug && a.oldSlugs?.includes(slug));
export const articlePath = (a: Article) => `/${a.slug}/`;

// Bir yazı birden çok köşede görünebilir: `cats` (articles.json) verilmişse hepsi, yoksa `cat`. Etiket olarak köşe adları " · " ile birleştirilir.
export const catsOf = (a: Article): string[] => a.cats ?? (a.cat ? [a.cat] : []);
export const catLabel = (a: Article): string => catsOf(a).join(' · ');
