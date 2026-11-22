import { useEffect } from 'react';
import type { RefObject } from 'react';

// Dünya Şampiyonası yazısındaki oynatıcı bölümleri sırayla yüklenir (üstteki canlı yayın önce, sonra yazının içindeki seçiciler):
// kapsayıcıdaki ilk <pgn-player> kurulunca `done` çağrılır. Oynatıcı hiç kurulmayacaksa (bölüm sayfada çok aşağıda, tembel yükleme)
// ya da 8 sn'yi geçerse de çağrılır; böylece sıra hiçbir zaman takılmaz.
type PlayerEl = HTMLElement & { _engine?: unknown };

export function usePlayerLoaded(ref: RefObject<HTMLElement>, enabled: boolean, done?: () => void) {
  useEffect(() => {
    if (!enabled || !done) return;
    let n = 0;
    const t = window.setInterval(() => {
      n++;
      const el = ref.current;
      const player = el?.querySelector('pgn-player') as PlayerEl | null;
      const far = !!el && el.getBoundingClientRect().top > window.innerHeight + 1600;
      if ((player && player._engine) || far || n > 40) {
        window.clearInterval(t);
        done();
      }
    }, 200);
    return () => window.clearInterval(t);
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
