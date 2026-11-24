import { useEffect, useState } from 'react';
import { pickGameStream } from '@/lib/championship';
import type { FideVideo } from '@/lib/championship';

// Canlı yayın görünümünde, sağ sütunun boşluğunda FIDE'nin oyun yayını videosu (YouTube; oynat düğmesine basılınca yüklenir).
// `poster`: video kapak resmi (verilmezse YouTube küçük resmi); oynat düğmesine basılana kadar gösterilir.
// Video, FIDE kanalının son videoları listesinden seçilir (public/fide-videos.json, bkz. src/lib/championship.ts `pickGameStream`).
export default function LiveVideo({ poster }: { poster?: string }) {
  const [v, setV] = useState<FideVideo | undefined>();
  const [on, setOn] = useState(false);
  useEffect(() => {
    let off = false;
    fetch(`${import.meta.env.BASE_URL}fide-videos.json`).then((r) => r.json()).then((d) => { if (!off && Array.isArray(d?.videos)) setV(pickGameStream(d.videos)); }).catch(() => {});
    return () => { off = true; };
  }, []);
  if (!v) return null;
  return (
    <div className="live-video" role="group" aria-label="FIDE canlı yayını">
      <p className="live-video-label f-mono"><i className="live-dot" aria-hidden="true" />FIDE canlı yayını</p>
      <div className="vp-embed">
        {on ? (
          <iframe src={`https://www.youtube.com/embed/${v.id}?rel=0&iv_load_policy=3&playsinline=1&autoplay=1`} title={v.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <button type="button" className="vp-poster" onClick={() => setOn(true)} aria-label={`Yayını oynat: ${v.title}`}>
            <img src={poster ?? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" />
            <span className="vp-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
          </button>
        )}
      </div>
    </div>
  );
}
