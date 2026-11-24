import { Link } from 'react-router-dom';
import { useChampionship } from '@/lib/championship';

// Ana sayfada ekranın altına sabit Dünya Şampiyonası duyurusu (yazı: /dunya-satranc-sampiyonasi/).
//  - Maç başlamadan: duyuru + 1. oyuna geri sayım.
//  - Bir oyun sürerken: "SON DAKİKA · CANLI YAYIN".
//  - Oyunlar arasında: skor + sonraki oyuna geri sayım.
//  - Maç bitince (bir oyuncu 7,5 puana ulaşınca ya da 20 Aralık'tan sonra) duyuru kalkar.
const pad = (n: number) => String(n).padStart(2, '0');
const clock = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  // Saat 0 ise gösterilmez ("00:" yazılmaz): 45:12 ; 1 saat ve üstünde 01:45:12
  return `${h > 0 ? `${pad(h)}:` : ''}${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
};
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : `${Math.floor(n) || ''}½`);

export default function MatchBanner() {
  const { phase, now } = useChampionship();
  if (phase.kind === 'ended') return null;
  const live = phase.kind === 'live';
  return (
    <>
    <div className="match-banner-gap" aria-hidden="true" />
    <Link to="/dunya-satranc-sampiyonasi/" className={`match-banner${live ? ' is-live' : ''}`} aria-label="Dünya Satranç Şampiyonası yazısına git">
      <span className="mb-text">
        <span className="mb-kicker f-mono">
          {live ? <><i className="live-dot" aria-hidden="true" />Son dakika · Canlı yayın</> : phase.kind === 'before' ? 'Yaklaşıyor' : 'Maç sürüyor'}
        </span>
        <b className="mb-title f-display">Dünya Satranç Şampiyonası</b>
        <span className="mb-sub f-mono">
          {phase.kind === 'before' && 'Gukesh – Sindarov · 24 Kasım · 17.00'}
          {live && `Gukesh – Sindarov · ${phase.n}. oyun`}
          {phase.kind === 'between' && `Gukesh ${fmt(phase.g)} – ${fmt(phase.s)} Sindarov`}
        </span>
      </span>
      {phase.kind === 'live' ? (
        <span className="mb-cta f-mono">Canlı izle <span aria-hidden="true">→</span></span>
      ) : phase.kind === 'before' || phase.at ? (
        <span className="mb-count" role="timer" aria-label={phase.kind === 'before' ? '1. oyuna kalan süre' : 'Sonraki oyuna kalan süre'}>
          <span className="mb-num f-display">{clock((phase.kind === 'before' ? phase.at : phase.at!) - now)}</span>
          <span className="mb-unit f-mono">{phase.kind === 'before' ? '1. oyuna kalan' : `${phase.n}. oyuna kalan`}</span>
        </span>
      ) : (
        <span className="mb-cta f-mono">Yazıya git <span aria-hidden="true">→</span></span>
      )}
    </Link>
    </>
  );
}
