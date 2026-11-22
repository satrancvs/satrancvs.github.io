import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { Chess } from 'chess.js';
import { engineEnabled, setEngineEnabled, engineSettings, setEngineSettings, DEPTHS, LINE_COUNTS } from '@/lib/eval-bar';
import type { SfResult as Sf } from '@/lib/eval-bar';

// Stockfish analizi (eval-bar.ts her konum için `cp-sf` olayı yollar): sol paneldeki skor, derinlik ve en iyi varyant.
const FIG: Record<string, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' };
const figurine = (san: string) => san.replace(/^[KQRBN]/, (c) => FIG[c]);
function pvText(fen: string, pv: string[], max = 8): string {
  try {
    const g = new Chess(fen);
    const parts: string[] = [];
    let n = g.moveNumber();
    let first = true;
    for (const u of pv.slice(0, max)) {
      const white = g.turn() === 'w';
      const mv = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (white) parts.push(`${n}. ${figurine(mv.san)}`);
      else parts.push(first ? `${n}… ${figurine(mv.san)}` : figurine(mv.san));
      if (!white) n++;
      first = false;
    }
    return parts.join(' ');
  } catch { return ''; }
}
function evalText(sf: { cp: number | null; mate: number | null }): { num: string; label: string; white: number } {
  if (sf.mate !== null) {
    const m = sf.mate;
    return { num: `${m > 0 ? '+' : '−'}M${Math.abs(m)}`, label: `${m > 0 ? 'Beyaz' : 'Siyah'} ${Math.abs(m)} hamlede mat yapıyor`, white: m > 0 ? 100 : 0 };
  }
  const cp = sf.cp ?? 0;
  const a = Math.abs(cp);
  const side = cp > 0 ? 'Beyaz' : 'Siyah';
  const label = a < 30 ? 'Eşit' : a < 100 ? `${side} hafif üstün` : a < 300 ? `${side} üstün` : a < 600 ? `${side} açık üstün` : `${side} kazanıyor`;
  return { num: `${cp > 0 ? '+' : cp < 0 ? '−' : ''}${(a / 100).toFixed(1)}`, label, white: 100 / (1 + Math.exp(-cp / 400)) };
}


// Stockfish canlı analiz paneli (canlı ekran ve maç seçici): `boardRef` içindeki oynatıcıların `cp-sf` olaylarını (eval-bar.ts) dinler.
export default function SfPanel({ boardRef, idle = false, idleText = '' }: { boardRef: RefObject<HTMLElement>; idle?: boolean; idleText?: string }) {
  const [sf, setSf] = useState<Sf | null>(null);
  const [engineOn, setEngineOn] = useState(engineEnabled);
  const [cfg, setCfg] = useState(engineSettings);
  useEffect(() => {
    const on = () => { setEngineOn(engineEnabled()); if (!engineEnabled()) setSf(null); };
    window.addEventListener('cp-sf-toggle', on);
    return () => window.removeEventListener('cp-sf-toggle', on);
  }, []);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const on = (e: Event) => setSf((e as CustomEvent<Sf>).detail);
    el.addEventListener('cp-sf', on);
    return () => el.removeEventListener('cp-sf', on);
  }, [boardRef]);
  useEffect(() => { if (idle) setSf(null); }, [idle]);
  const ev = sf && !idle && engineOn ? evalText(sf) : null;
  const rows = sf && !idle && engineOn ? sf.lines.map((l) => ({ num: evalText(l).num, text: pvText(sf.fen, l.pv, cfg.lines > 1 ? 6 : 8) })) : [];
  const set = (depth: number, lines: number) => { setCfg({ depth, lines }); setEngineSettings(depth, lines); };
  return (
    <aside className={`live-sf${ev ? '' : ' is-wait'}${engineOn ? '' : ' is-off'}`} aria-label="Stockfish canlı analizi" aria-live="off">
      <div className="live-sf-head f-mono">
        <img src={`${import.meta.env.BASE_URL}stockfish/logo.png`} alt="" width="22" height="22" />
        <span>Stockfish 19 · canlı analiz</span>
        <button type="button" role="switch" aria-checked={engineOn} aria-label="Stockfish analizi" title={engineOn ? 'Analizi durdur' : 'Analizi başlat'} className="live-sf-switch" onClick={() => setEngineEnabled(!engineOn)}><i /></button>
      </div>
      <p className="live-sf-num f-display">{ev ? ev.num : '—'}</p>
      <p className="live-sf-label">{ev ? ev.label : !engineOn ? 'Analiz durduruldu. Anahtarla yeniden başlatabilirsiniz.' : idle ? idleText : 'Analiz ediliyor...'}</p>
      <p className="live-sf-pv-title f-mono">{cfg.lines > 1 ? 'En iyi devam yolları' : 'En iyi devam yolu'}</p>
      {rows.length ? (
        <ol className="live-sf-lines">{rows.map((r, i) => <li key={i}>{cfg.lines > 1 && <b className="f-mono">{r.num}</b>}<span>{r.text}</span></li>)}</ol>
      ) : <p className="live-sf-pv">—</p>}
      <div className="live-sf-opts f-mono">
        <label>Derinlik<select value={cfg.depth} onChange={(e) => set(Number(e.target.value), cfg.lines)}>{DEPTHS.map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
        <label>Aday<select value={cfg.lines} onChange={(e) => set(cfg.depth, Number(e.target.value))}>{LINE_COUNTS.map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
      </div>
    </aside>
  );
}
