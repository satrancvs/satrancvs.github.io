import { useChampionship } from '../lib/championship';

// Dünya Şampiyonası yazısının dekindeki canlı skor: biten turların sonuçlarından hesaplanır (Lichess yayını), her oyundan sonra kendiliğinden güncellenir.
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : `${Math.floor(n) || ''}½`);

export default function LiveScore() {
  const { score, scoreReady } = useChampionship();
  if (!scoreReady) return null;
  return <> <strong>Güncel skor: Gukesh {fmt(score.g)} – Sindarov {fmt(score.s)}</strong></>;
}
