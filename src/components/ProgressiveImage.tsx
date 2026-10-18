import { useEffect, useRef, useState, type CSSProperties } from 'react';
import imageMeta from '@/data/image-meta.json';

type Meta = { w: number; h: number; lqip: string };
const META = imageMeta as Record<string, Meta>;

// Yazı fotoğrafları: en fazla 600 px genişlik, 720 px yükseklik. Yüklenirken küçük bulanık bir önizleme (LQIP)
// görünür ve fotoğraf yüklenince yumuşakça yerini alır. Önizlemeler ve boyutlar scripts/image-placeholders.py ile
// üretilir; en-boy oranı baştan bilindiği için yer ayrılır ve sayfa yükleme sırasında kaymaz.
// `cover`: kitap kapağı — küçük (en fazla 240 px) ve renkli (fotoğraflar siyah-beyaz gösterilir).
// `thumb`: ana sayfa kartı küçük resmi — fotoğrafın oranı ne olursa olsun kutu sütun genişliğinde sabit 3:2'dir ve fotoğraf merkezden
// kırpılır (dikey fotoğraf kartı uzatıp ızgarayı bozmasın). `position`: kırpmada tutulacak yer (CSS object-position, örn. "50% 20%").
// Dosya boyutu standardı: scripts/optimize-images.py.
export default function ProgressiveImage({ path, alt, lazy = true, cover = false, thumb = false, position }: { path: string; alt: string; lazy?: boolean; cover?: boolean; thumb?: boolean; position?: string }) {
  const key = path.replace(/^\//, '');
  const meta = META[key];
  const src = /^(https?:)?\/\//.test(path) ? path : `${import.meta.env.BASE_URL}${key}`;
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  // Önbellekten gelen görsel onLoad tetiklenmeden tamamlanmış olabilir.
  useEffect(() => { if (ref.current?.complete) setLoaded(true); }, []);
  if (!meta) {
    if (thumb) return <img src={src} alt={alt} loading={lazy ? 'lazy' : undefined} className="block w-full aspect-[3/2] object-cover grayscale" style={{ objectPosition: position }} />;
    return <img src={src} alt={alt} loading={lazy ? 'lazy' : undefined} className={`block mx-auto w-auto h-auto max-w-full ${cover ? 'max-h-[360px]' : 'max-h-[720px] md:max-w-[600px] grayscale'}`} />;
  }
  return (
    <span
      className={`relative block max-w-full overflow-hidden ${thumb ? 'w-full' : `mx-auto ${cover ? 'w-[min(240px,calc(360px*var(--ar)))]' : 'w-[min(600px,calc(720px*var(--ar)))]'}`}`}
      style={{ '--ar': meta.w / meta.h, aspectRatio: thumb ? '3 / 2' : `${meta.w} / ${meta.h}` } as CSSProperties}
    >
      <img src={meta.lqip} alt="" aria-hidden className={`absolute inset-0 h-full w-full scale-110 object-cover blur-xl ${cover ? '' : 'grayscale'}`} style={{ objectPosition: position }} />
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
        className={`absolute inset-0 h-full w-full object-cover ${cover ? '' : 'grayscale'} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ objectPosition: position }}
      />
    </span>
  );
}
