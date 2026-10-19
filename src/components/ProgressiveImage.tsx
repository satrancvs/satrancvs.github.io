import { useEffect, useRef, useState, type CSSProperties } from 'react';
import imageMeta from '@/data/image-meta.json';

// kind (scripts/imgstd.py): h yatay 3:2 (600 x 400), v dikey 2:3 (400 x 600), s küçük 2:3 (240 x 360: kitap kapağı ve düşük çözünürlüklü dikey fotoğraf).
type Meta = { w: number; h: number; kind: 'h' | 'v' | 's'; color?: boolean; lqip: string };
// Gösterim kutuları: genişlik (px) ve en-boy oranı. Hepsi aynı standardı paylaşır; sayfada başka boy olmaz.
const BOX = { h: { w: 600, ar: '3 / 2' }, v: { w: 400, ar: '2 / 3' }, s: { w: 240, ar: '2 / 3' } } as const;
const META = imageMeta as Record<string, Meta>;

// Yazı fotoğrafları üç standart boyuttan birinde gösterilir (BOX): yatay 600 x 400, dikey 400 x 600, küçük (kapak / düşük çözünürlük) 240 x 360;
// dar ekranda genişlik %100'ü aşmaz, oran korunur. Dosyalar bu orana scripts/optimize-images.py ile kırpılır. Yüklenirken küçük bulanık bir önizleme (LQIP)
// görünür ve fotoğraf yüklenince yumuşakça yerini alır. Önizlemeler ve boyutlar scripts/image-placeholders.py ile
// üretilir; en-boy oranı baştan bilindiği için yer ayrılır ve sayfa yükleme sırasında kaymaz.
// `cover`: kitap kapağı — renkli (fotoğraflar siyah-beyaz gösterilir); boyutu dosyanın sınıfından (s) gelir.
// `thumb`: ana sayfa kartı küçük resmi — fotoğrafın oranı ne olursa olsun kutu sütun genişliğinde sabit 3:2'dir ve fotoğraf merkezden
// kırpılır (dikey fotoğraf kartı uzatıp ızgarayı bozmasın). `position`: kırpmada tutulacak yer (CSS object-position, örn. "50% 20%").
// Dosya boyutu standardı: scripts/optimize-images.py.
export default function ProgressiveImage({ path, alt, lazy = true, cover = false, thumb = false, position }: { path: string; alt: string; lazy?: boolean; cover?: boolean; thumb?: boolean; position?: string }) {
  const key = path.replace(/^\//, '');
  const meta = META[key];
  // Fotoğraflar varsayılan siyah-beyaz gösterilir; kapaklar ve scripts/image-color.json'daki (çağdaş renkli) fotoğraflar renkli kalır.
  const gray = !cover && !meta?.color;
  const src = /^(https?:)?\/\//.test(path) ? path : `${import.meta.env.BASE_URL}${key}`;
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  // Önbellekten gelen görsel onLoad tetiklenmeden tamamlanmış olabilir.
  useEffect(() => { if (ref.current?.complete) setLoaded(true); }, []);
  if (!meta) {
    if (thumb) return <img src={src} alt={alt} loading={lazy ? 'lazy' : undefined} className="block w-full aspect-[3/2] object-cover grayscale" style={{ objectPosition: position }} />;
    return <img src={src} alt={alt} loading={lazy ? 'lazy' : undefined} className={`block mx-auto w-auto h-auto max-w-full ${cover ? 'max-h-[360px]' : 'max-h-[600px] md:max-w-[600px] grayscale'}`} />;
  }
  return (
    <span
      className={`relative block max-w-full overflow-hidden ${thumb ? 'w-full' : 'mx-auto'}`}
      style={{ width: thumb ? undefined : `min(${BOX[meta.kind].w}px, 100%)`, aspectRatio: thumb ? '3 / 2' : BOX[meta.kind].ar } as CSSProperties}
    >
      <img src={meta.lqip} alt="" aria-hidden className={`absolute inset-0 h-full w-full scale-110 object-cover blur-xl ${gray ? 'grayscale' : ''}`} style={{ objectPosition: position }} />
      <img
        ref={ref}
        src={src}
        alt={alt}
        width={meta.w}
        height={meta.h}
        loading={lazy ? 'lazy' : undefined}
        fetchPriority={lazy ? undefined : 'high'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover ${gray ? 'grayscale' : ''} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ objectPosition: position }}
      />
    </span>
  );
}

// Figure için: küçük (s) sınıfında altyazı fotoğraftan geniş olsun diye sarmalayıcı 480 px'e kadar açılır; diğerlerinde sarmalayıcı
// fotoğrafın kutusu kadar (yatay 600, dikey 400 px) olur ve altyazı fotoğrafın genişliğini geçmez.
export const isSmallImage = (path: string) => META[path.replace(/^\//, '')]?.kind === 's';
export const boxWidth = (path: string) => BOX[META[path.replace(/^\//, '')]?.kind ?? 'h'].w;
