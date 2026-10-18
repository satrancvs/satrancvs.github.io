import { splitArticle } from '@/components/ArticleBody';
import timmanMd from '@/content/mar-del-plata-1982.md?raw';
import muglaMd from '@/content/amman-mugla.md?raw';
import zebraMd from '@/content/zebralar-icin-satranc.md?raw';
import karlsruheMd from '@/content/karlsruhe-ve-yol-ayrimlari.md?raw';
import gomoriMd from '@/content/eugen-gomori.md?raw';
import { toTypography } from '@/lib/curly';
import data from './articles.json';

export type Article = {
  id: string; slug: string; cat: string; title: string; dek?: string; author: string; translator?: string;
  excerpt?: string; date?: string; chunks?: string[]; photo?: boolean; thumb?: string; thumbAlt?: string; thumbPosition?: string; diagram?: string; diagramAlt?: string; diagramCaption?: string; titleLines?: [string, string]; note?: string; diagramOrientation?: 'white' | 'black'; diagramBadge?: { square: string; glyph: string }; draft?: boolean; body: string[];
};

// Gövdesi markdown dosyasından gelen yazılar (id -> dosya)
const CHUNKS: Record<string, string[]> = {
  kapak: splitArticle(timmanMd).chunks,
  mugla: splitArticle(muglaMd).chunks,
  zebra: splitArticle(zebraMd).chunks,
  karlsruhe: splitArticle(karlsruheMd).chunks,
  gomori: splitArticle(gomoriMd).chunks,
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

export const ARTICLES: Article[] = (data as Article[]).map((a) => typo(CHUNKS[a.id] ? { ...a, chunks: CHUNKS[a.id] } : a));

// `draft`: henüz yayımlanmamış yazı. Yalnızca ana sayfadaki "Öne çıkanlar" kartında görünür (tıklanmaz); sayfası, sitemap kaydı, listesi ve
// bildirimi yoktur. Yazı hazır olunca `draft` kaldırılır.
export const PUBLISHED = ARTICLES.filter((a) => !a.draft);

export const articleBySlug = (slug?: string) => PUBLISHED.find((a) => a.slug === slug);
export const articlePath = (a: Article) => `/${a.slug}/`;
