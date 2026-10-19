import { useEffect, useState } from 'react';

// ChessPublica (https://chesspublica.github.io) — <pgn> öğelerini etkileşimli oyun görünümüne çevirir.
// Paket (jQuery + chess.js + chessboard.js + ChessPublica) bu repo'da public/chesspublica/ altında durur
// ve yalnızca oyun içeren sayfalarda yüklenir. Paket üzerinde yapılan düzeltmeler:
//  - taş görselleri chessboardjs.com'dan değil public/chesspublica/pieces/ altından gelir (üçüncü taraf istek yok, ana sayfada daha hızlı);
//  - pgn-player.js'i yüklemeye çalışan, tek dosya paketinde hata fırlatan blok kaldırıldı;
//  - paketin kendi basit <pgn-player> tanımı kaldırıldı; <pgn-player> artık ayrı ES modülünden
//    (pgn-player.js + helpers/pgn/icons/board.js) gelir ve [P] ile bulmaca görünümü sağlar;
//  - <pgn> oyun başlığı (kt) <pgn-player> başlığıyla aynı biçime getirildi: unvan + Elo, Event ve tarih (.?? kırpılır);
//  - geçersiz parantezli hamle dizisi (yorum içinde) sessizce silinmez, kırmızı uyarı olarak gösterilir (pgn.js + paket);
//  - global nesneye window.ChessPublica takma adı eklendi (paket yalnızca window.JekyllChess veriyordu).
const BASE = `${import.meta.env.BASE_URL}chesspublica`;

type CP = { initAll: () => void };
declare global {
  interface Window { ChessPublica?: CP }
}

// İki aşama: temel paket (jQuery + chess.js + chessboard.js + ChessPublica; <fen> ve <pgn> için yeter) ve <pgn-player> modülü.
// Ana sayfadaki <fen> diyagramı yalnızca temel paketi ister: oyuncu modülü (ve 5 ek dosya) gereksiz gecikme olurdu.
let baseLoading: Promise<void> | null = null;
let playerLoading: Promise<void> | null = null;

function loadBase(): Promise<void> {
  if (window.ChessPublica) return Promise.resolve();
  if (baseLoading) return baseLoading;
  baseLoading = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${BASE}/ChessPublica.all.min.css`;
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = `${BASE}/ChessPublica.all.min.js`;
    js.async = true;
    js.onload = () => resolve();
    js.onerror = () => { baseLoading = null; reject(new Error('ChessPublica yüklenemedi')); };
    document.head.appendChild(js);
  });
  return baseLoading;
}

// <pgn-player> öğesini tanımlayan modül, paketin global Chess/Chessboard nesnelerini kullanır.
function loadPlayer(): Promise<void> {
  if (customElements.get('pgn-player')) return Promise.resolve();
  if (playerLoading) return playerLoading;
  playerLoading = loadBase().then(() => new Promise<void>((resolve, reject) => {
    const mod = document.createElement('script');
    mod.type = 'module';
    mod.src = `${BASE}/pgn-player.js`;
    mod.onload = () => resolve();
    mod.onerror = () => { playerLoading = null; reject(new Error('pgn-player yüklenemedi')); };
    document.head.appendChild(mod);
  }));
  return playerLoading;
}

const load = (player: boolean) => (player ? loadBase().then(loadPlayer) : loadBase());

const PIECES = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];

/** Ana sayfa: tarayıcı boşta kalınca temel paketi ve 12 taş görselini önceden indirir; diyagram ekrana gelince hazır bulunur. */
export function preloadChessPublica() {
  const go = () => {
    loadBase().catch(() => {});
    PIECES.forEach((p) => { new Image().src = `${BASE}/pieces/${p}.png`; });
  };
  if (document.readyState === 'complete') setTimeout(go, 300);
  else window.addEventListener('load', () => setTimeout(go, 300), { once: true });
}

/** `active` true iken ChessPublica'yı yükler ve sayfadaki <pgn> öğelerini çizdirir. */
export function useChessPublica(active: boolean, { player = true }: { player?: boolean } = {}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setStatus('loading');
    load(player)
      .then(() => {
        if (cancelled) return;
        window.ChessPublica?.initAll();
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [active, player]);
  return status;
}
