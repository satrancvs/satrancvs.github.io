import { useEffect, useState } from 'react';

// Dünya Şampiyonası 2026 (Gukesh – Sindarov) maçının ortak verisi: Lichess'in resmî FIDE yayını (herkese açık, CORS açık).
// `LiveMatch` (yazıdaki canlı bölüm) sabitleri buradan alır; `useChampionship` ana sayfadaki duyuruyu (MatchBanner) sürer.
export const TOUR = 'qfkdt8mn';
export const API = 'https://lichess.org';
export type Round = { id: string; name: string; startsAt: number; finished?: boolean };
// Yayın ağdan alınamazsa yedek tur listesi (id, başlangıç ms).
export const FALLBACK: Round[] = [
  ['xLgOJ6cb', 1795528800000], ['L3j03TZq', 1795615200000], ['fnmEB1kH', 1795701600000], ['wIwJtPqz', 1795874400000],
  ['ueVpeXxW', 1795960800000], ['b0ACq4LF', 1796047200000], ['OZYNuhhF', 1796220000000], ['K9grUNXr', 1796306400000],
  ['gBI5kKDi', 1796392800000], ['NhfhTSep', 1796565600000], ['bAU22Apj', 1796652000000], ['vRbnvNEi', 1796738400000],
  ['S4C6oJ1k', 1796911200000], ['MDkKXuQD', 1796997600000],
].map(([id, startsAt], i) => ({ id: id as string, name: `Game ${i + 1}`, startsAt: startsAt as number }));

export const tag = (pgn: string, name: string) => pgn.match(new RegExp(`\\[${name}\\s+"([^"]*)"\\]`))?.[1] ?? '';

// Ana sayfadaki duyuru bu tarihten sonra her durumda kalkar (maç ya da ayrım oyunları uzasa da).
const HARD_END = Date.parse('2026-12-20T00:00:00Z');
const LIVE_WINDOW = 10 * 36e5; // bir oyunun "canlı" sayılacağı en uzun süre (yayın bitişi bildirilmezse)
const WIN = 7.5; // 14 oyunluk klasik maçta kazanmak için gereken puan

export type Phase =
  | { kind: 'before'; at: number }
  | { kind: 'live'; n: number }
  | { kind: 'between'; n: number; at?: number; g: number; s: number }
  | { kind: 'ended' };

const resultsCache: Record<string, { g: number; s: number }> = {};

export function useChampionship(): { phase: Phase; now: number; score: { g: number; s: number }; scoreReady: boolean } {
  const [now, setNow] = useState(() => Date.now());
  const [rounds, setRounds] = useState<Round[]>(FALLBACK);
  const [, bump] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);

  const start = rounds[0].startsAt;
  const over = now >= HARD_END;
  // Tur listesi (bitti bilgisi): maça bir saat kala ve sonrasında dakikada bir.
  const watch = !over && now >= start - 36e5;
  useEffect(() => {
    if (over) return;
    let off = false;
    const go = () => fetch(`${API}/api/broadcast/${TOUR}`).then((r) => r.json()).then((d) => {
      const rs = (d?.rounds ?? []).filter((r: Round) => r.startsAt).map((r: Round) => ({ id: r.id, name: r.name, startsAt: r.startsAt, finished: r.finished }));
      if (!off && rs.length) setRounds(rs);
    }).catch(() => {});
    go();
    if (!watch) return () => { off = true; };
    const t = window.setInterval(go, 60_000);
    return () => { off = true; window.clearInterval(t); };
  }, [over, watch]);

  // Biten turların sonuçları (skor ve maçın bitişi için): her tur bir kez.
  useEffect(() => {
    if (!watch) return;
    rounds.filter((r) => r.finished && !resultsCache[r.id]).forEach((r) => {
      fetch(`${API}/api/broadcast/round/${r.id}.pgn`).then((x) => x.text()).then((t) => {
        const first = t.trim().split(/\n\s*\n(?=\[Event )/)[0];
        const res = tag(first, 'Result');
        if (!/^(1-0|0-1|1\/2-1\/2)$/.test(res)) return;
        const gWhite = /gukesh/i.test(tag(first, 'White'));
        const [a, b] = res === '1-0' ? [1, 0] : res === '0-1' ? [0, 1] : [.5, .5];
        resultsCache[r.id] = gWhite ? { g: a, s: b } : { g: b, s: a };
        bump((n) => n + 1);
      }).catch(() => {});
    });
  }, [rounds, watch]);

  const done = rounds.filter((r) => resultsCache[r.id]);
  const g = done.reduce((t, r) => t + resultsCache[r.id].g, 0), s = done.reduce((t, r) => t + resultsCache[r.id].s, 0);
  const score = { g, s };
  // Skor yalnızca biten her turun sonucu alındıysa doğrudur (eksik tur varken yanlış skor gösterilmesin).
  const scoreReady = rounds.some((r) => r.finished) ? rounds.filter((r) => r.finished).every((r) => resultsCache[r.id]) : now >= start - 36e5;
  if (over || g >= WIN || s >= WIN) return { phase: { kind: 'ended' }, now, score, scoreReady };
  if (now < start) return { phase: { kind: 'before', at: start }, now, score, scoreReady };
  const liveIdx = rounds.findIndex((r) => r.startsAt <= now && !r.finished && now < r.startsAt + LIVE_WINDOW);
  if (liveIdx >= 0) return { phase: { kind: 'live', n: liveIdx + 1 }, now, score, scoreReady };
  const next = rounds.findIndex((r) => r.startsAt > now && !r.finished);
  return { phase: { kind: 'between', n: next >= 0 ? next + 1 : rounds.length, at: next >= 0 ? rounds[next].startsAt : undefined, g, s }, now, score, scoreReady };
}

// FIDE kanalının oyun yayını videoları (başlığı "World Championship" + "Game N" ya da "No Commentary"): VideoPlaylist başa alır, canlı görünümdeki video (LiveVideo) bunlardan birini gömer.
export type FideVideo = { id: string; title: string; published?: string };
// Gerçek oyun yayınlarının başlığında "… | Game N | …" ya da "… | No Commentary" biçimi vardır; "The ceremonial first moves of Game 1 …", "Recap | Game 1 |", "Game 1 Moments" gibi özet/kısa videolar sayılmaz.
const COMMENTARY = /\|\s*game\s*\d+\s*\|/i, SILENT = /\|\s*no commentary\s*$/i, NOT_STREAM = /\b(recap|moments|minutes|highlights|interview|press conference)\b/i;
export const isGameStream = (v: FideVideo) => /world championship/i.test(v.title) && !NOT_STREAM.test(v.title) && (COMMENTARY.test(v.title) || SILENT.test(v.title.trim()));
export const gameRank = (v: FideVideo) => (COMMENTARY.test(v.title) ? 0 : SILENT.test(v.title.trim()) ? 1 : 2);
/** Yayının oyun numarası: başlıktaki "Game N"; numarasız yorumsuz yayın (ilk gün) 1. oyundur. */
export const streamGameNo = (v: FideVideo) => { const m = /\bgame\s*(\d+)/i.exec(v.title); return m ? +m[1] : 1; };
/** Yalnızca o oyunun kendi yayını (yedek yok): kart kapakları için. */
export const gameStreamOf = (videos: FideVideo[], game: number): FideVideo | undefined =>
  videos.filter((v) => isGameStream(v) && streamGameNo(v) === game).sort((a, b) => (SILENT.test(a.title.trim()) ? 0 : 1) - (SILENT.test(b.title.trim()) ? 0 : 1) || +new Date(b.published ?? 0) - +new Date(a.published ?? 0))[0];
/** Canlı görünümde gömülen oyun yayını: istenen oyunun yayını (yorumsuz "No Commentary" önce, yoksa yorumlu "Game N"; aynı sınıfta en yenisi); o oyun için yayın yoksa en son oyunun yayını. */
export const pickGameStream = (videos: FideVideo[], game = 1): FideVideo | undefined => {
  const all = videos.filter(isGameStream);
  const same = all.filter((v) => streamGameNo(v) === game);
  const pool = same.length ? same : all.filter((v) => streamGameNo(v) === Math.max(...all.map(streamGameNo)));
  return pool.sort((a, b) => (SILENT.test(a.title.trim()) ? 0 : 1) - (SILENT.test(b.title.trim()) ? 0 : 1) || +new Date(b.published ?? 0) - +new Date(a.published ?? 0))[0];
};

/** Turun basın toplantısı videosu ("Press Conference | Game N | …"); oyun numarasız olanlar (maç öncesi) sayılmaz. */
export const pressConferenceOf = (videos: FideVideo[], game: number): FideVideo | undefined =>
  videos.filter((v) => /press conference/i.test(v.title) && /\bgame\s*(\d+)/i.exec(v.title)?.[1] === String(game))
    .sort((a, b) => +new Date(b.published ?? 0) - +new Date(a.published ?? 0))[0];
