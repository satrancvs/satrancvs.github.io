import { useEffect, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
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


// Analiz ayarları (derinlik, aday sayısı): panelin dişlisi ya da maç seçicideki yorum kartı kullanır.
export function SfSettings() {
  const [cfg, setCfg] = useState(engineSettings);
  useEffect(() => { const on = () => setCfg(engineSettings()); window.addEventListener('cp-sf-config', on); return () => window.removeEventListener('cp-sf-config', on); }, []);
  const set = (depth: number, lines: number) => { setCfg({ depth, lines }); setEngineSettings(depth, lines); };
  return (
    <div className="live-sf-opts f-mono">
        <div className="sf-step" role="group" aria-label="Derinlik">
          <span>Derinlik</span>
          <button type="button" aria-label="Derinliği azalt" disabled={DEPTHS.indexOf(cfg.depth) <= 0} onClick={() => set(DEPTHS[Math.max(0, DEPTHS.indexOf(cfg.depth) - 1)], cfg.lines)}>−</button>
          <output aria-live="polite">{cfg.depth}</output>
          <button type="button" aria-label="Derinliği artır" disabled={DEPTHS.indexOf(cfg.depth) >= DEPTHS.length - 1} onClick={() => set(DEPTHS[Math.min(DEPTHS.length - 1, DEPTHS.indexOf(cfg.depth) + 1)], cfg.lines)}>+</button>
        </div>
        <div className="sf-step" role="group" aria-label="Aday">
          <span>Aday</span>
          <button type="button" aria-label="Aday sayısını azalt" disabled={cfg.lines <= LINE_COUNTS[0]} onClick={() => set(cfg.depth, cfg.lines - 1)}>−</button>
          <output aria-live="polite">{cfg.lines}</output>
          <button type="button" aria-label="Aday sayısını artır" disabled={cfg.lines >= LINE_COUNTS[LINE_COUNTS.length - 1]} onClick={() => set(cfg.depth, cfg.lines + 1)}>+</button>
        </div>
    </div>
  );
}

// Stockfish canlı analiz paneli (canlı ekran ve maç seçici): `boardRef` içindeki oynatıcıların `cp-sf` olaylarını (eval-bar.ts) dinler.
export default function SfPanel({ boardRef, idle = false, idleText = '', intro }: { boardRef: RefObject<HTMLElement>; idle?: boolean; idleText?: string; intro?: ReactNode }) {
  const [sf, setSf] = useState<Sf | null>(null);
  const [engineOn, setEngineOn] = useState(engineEnabled);
  const [cfg, setCfg] = useState(engineSettings);
  const [showOpts, setShowOpts] = useState(false);
  // Stockfish ayarları açıkken ayarların ve dişlinin dışına tıklanınca (ya da Esc) kapanır.
  useEffect(() => {
    if (!showOpts) return;
    const out = (e: Event) => { const t = e.target as Element | null; if (!t?.closest('.live-sf-opts, .live-sf-gear')) setShowOpts(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowOpts(false); };
    document.addEventListener('pointerdown', out, true);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', out, true); document.removeEventListener('keydown', esc); };
  }, [showOpts]);
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
  useEffect(() => { const on = () => setCfg(engineSettings()); window.addEventListener('cp-sf-config', on); return () => window.removeEventListener('cp-sf-config', on); }, []);
  useEffect(() => { if (idle) setSf(null); }, [idle]);
  const ev = sf && !idle && engineOn ? evalText(sf) : null;
  const rows = sf && !idle && engineOn ? sf.lines.map((l) => ({ num: evalText(l).num, text: pvText(sf.fen, l.pv, cfg.lines > 1 ? 6 : 8) })) : [];
  return (
    <aside className={`live-sf${ev ? '' : ' is-wait'}${engineOn ? '' : ' is-off'}`} aria-label="Stockfish canlı analizi" aria-live="off">
      <div className="live-sf-body" data-n={cfg.lines}>
      <div className="live-sf-head f-mono">
        <img src={`${import.meta.env.BASE_URL}stockfish/logo.png`} alt="" width="22" height="22" />
        <span className="live-sf-title">{engineOn ? <><span>Stockfish 19 ·</span> <span>canlı analiz</span></> : <span>Stockfish · durdu</span>}</span>
        <button type="button" className="live-sf-gear" aria-expanded={showOpts} aria-controls="sf-opts" aria-label="Analiz ayarları" title="Analiz ayarları" onClick={() => setShowOpts((v) => !v)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
        </button>
        <button type="button" role="switch" aria-checked={engineOn} aria-label="Stockfish analizi" title={engineOn ? 'Analizi durdur' : 'Analizi başlat'} className="live-sf-switch" onClick={() => setEngineEnabled(!engineOn)}><i /></button>
      </div>
      {showOpts && <SfSettings />}
      <div className="live-sf-score">
        <p className="live-sf-num f-display">{ev ? ev.num : '—'}</p>
        <p className="live-sf-label">{ev ? ev.label : !engineOn ? 'Analiz durduruldu. Anahtarla yeniden başlatabilirsiniz.' : idle ? idleText : 'Analiz ediliyor...'}</p>
      </div>
      <p className="live-sf-pv-title f-mono">{cfg.lines > 1 ? 'En iyi devam yolları' : 'En iyi devam yolu'}</p>
      {rows.length ? (
        <ol className="live-sf-lines">{rows.map((r, i) => <li key={i}>{cfg.lines > 1 && <b className="f-mono">{r.num}</b>}<span>{r.text}</span></li>)}</ol>
      ) : <p className="live-sf-pv">—</p>}
      </div>
      {intro}
    </aside>
  );
}
