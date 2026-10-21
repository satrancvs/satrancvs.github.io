import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { curlyPass } from '@/lib/curly-dom';

// Palavan–Euwe: önce Beyaz tarafından bir oynatıcı (analiz), bitince tahta Siyah tarafına döner ve aynı konum bir bulmacaya dönüşür.
// Önde `front` (oynatıcı), arkada `back` (bulmaca) durur; arka yüz, ön oynatıcının son hamlesi ve yorumu göründükten kısa süre sonra
// kendiliğinden öne gelir. Bulmacanın altındaki yorumlar okur hamleyi bulunca (ya da analizdeki bir hamleyi denerse) açılır.
// Oynatıcıdan gelen `cp-move` (gameOver) ve `cp-puzzle` olayları public/chesspublica/pgn-player.js'deki site yamalarıdır.

type Variation = { moves: string[]; comments: string[]; glyphs: string[] };
type PuzzleDetail = {
  type: 'step' | 'reply' | 'wrong' | 'solved';
  index: number | null;
  san: string | null;
  glyph: string;
  black: boolean;
  moveNumber: number;
  comment: string;
  variations: Variation[];
  attempt?: string | null;
};

type Format = (text: string) => string;
const HELPERS = '/chesspublica/helpers.js';
let helpers: Promise<{ formatComment: Format }> | null = null;
// ChessPublica'nın kendi yorum biçimleyicisi (markdown + figürin simgeleri); oynatıcıyla aynı modül örneği.
const loadFormat = () => (helpers ??= import(/* @vite-ignore */ HELPERS));

const norm = (san: string) => san.replace(/[+#!?]/g, '');
const REDUCED = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// "1… Rf8 2. Bg4 Kg7 yorum 3. Rd7 …": yan varyantın hamleleri ve yorumları, numaralarıyla tek satır metin.
function lineText(v: Variation, d: PuzzleDetail) {
  let n = d.moveNumber;
  let black = d.black;
  let needNumber = true;
  const out: string[] = [];
  v.moves.forEach((san, i) => {
    if (!black) out.push(`${n}.`);
    else if (needNumber) out.push(`${n}…`);
    out.push(san + (v.glyphs[i] || ''));
    needNumber = false;
    if (v.comments[i]) {
      out.push(v.comments[i]);
      needNumber = true;
    }
    if (black) n++;
    black = !black;
  });
  return out.join(' ');
}

export default function FlipGame({ front, back }: { front: ReactNode; back: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const frontEl = useRef<HTMLDivElement>(null);
  const backEl = useRef<HTMLDivElement>(null);
  const notesEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootEl = root.current;
    const f = frontEl.current;
    const b = backEl.current;
    const notes = notesEl.current;
    if (!rootEl || !f || !b || !notes) return;

    let flipped = false;
    let timer: number | undefined;
    let solved = false;
    let finalShown = false;

    const flip = () => {
      if (flipped) return;
      flipped = true;
      rootEl.style.minHeight = `${rootEl.offsetHeight}px`;
      const swap = () => {
        f.style.display = 'none';
        b.classList.add('is-active');
        b.removeAttribute('aria-hidden');
      };
      const unlock = () => { rootEl.style.minHeight = ''; };
      if (REDUCED() || !f.animate || !b.animate) {
        swap();
        unlock();
        return;
      }
      const edge = 'perspective(1400px) rotateY(90deg)';
      const flat = 'perspective(1400px) rotateY(0deg)';
      f.animate([{ transform: flat, opacity: 1 }, { transform: edge, opacity: 0.35 }], { duration: 420, easing: 'cubic-bezier(.5,0,.85,.45)', fill: 'forwards' }).onfinish = () => {
        swap();
        b.animate([{ transform: 'perspective(1400px) rotateY(-90deg)', opacity: 0.35 }, { transform: flat, opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = unlock;
      };
    };

    // Ön oynatıcı son hamlesine ve yorumuna geldi: okuma süresi kadar bekleyip döndür (okur geri sarsa vazgeç).
    const onMove = (e: Event) => {
      const target = e.target as Node;
      // Bulmaca çözülünce oynatıcı kalan son hamleyi kendisi oynar; hamle ve yorumu da alttaki yorum akışına eklenir.
      if (b.contains(target)) {
        const move = (e as CustomEvent).detail;
        if (solved && !finalShown && move?.gameOver && move.moveIndex >= 0) {
          finalShown = true;
          queue = queue.then(() => loadFormat()).then(({ formatComment }) => addFinal(move.moveIndex, formatComment)).catch(() => {});
        }
        return;
      }
      if (flipped || !f.contains(target)) return;
      window.clearTimeout(timer);
      if (!(e as CustomEvent).detail?.gameOver) return;
      const chars = f.querySelector('.comment-body')?.textContent?.length ?? 0;
      timer = window.setTimeout(flip, 1400 + chars * 45);
    };

    // Bulmaca yorumları: sıralı işlenir (biçimleyici modülü eşzamansız yüklenir).
    const shown = new Map<string, HTMLElement>();
    let para: HTMLElement | null = null;
    let queue: Promise<void> = Promise.resolve();

    const addLine = (v: Variation, d: PuzzleDetail, fmt: Format, reveal: boolean) => {
      const key = `${d.index}|${v.moves.join(' ')}`;
      const old = shown.get(key);
      if (old) {
        if (reveal) { old.classList.remove('flash'); void old.offsetWidth; old.classList.add('flash'); }
        return;
      }
      para = null;
      const p = document.createElement('p');
      p.className = reveal ? 'pn-line flash' : 'pn-line';
      p.innerHTML = fmt(lineText(v, d));
      notes.appendChild(p);
      curlyPass(p);
      shown.set(key, p);
    };

    const handle = (d: PuzzleDetail, fmt: Format) => {
      if (d.type === 'solved') {
        b.classList.add('is-solved');
        return;
      }
      if (d.type === 'wrong') {
        // Çözüm değil ama analizde geçen bir hamle denendi: o hamleyle başlayan yan varyant açılır.
        const hit = d.attempt ? d.variations.find((v) => v.moves[0] && norm(v.moves[0]) === norm(d.attempt as string)) : undefined;
        if (hit) addLine(hit, d, fmt, true);
        return;
      }
      const startsParagraph = !para;
      if (!para) {
        para = document.createElement('p');
        para.className = 'pn-para';
        notes.appendChild(para);
      }
      const label = !d.black || startsParagraph ? `${d.moveNumber}${d.black ? '…' : '.'} ${d.san}${d.glyph}` : `${d.san}${d.glyph}`;
      para.insertAdjacentHTML('beforeend', `${para.childNodes.length ? ' ' : ''}<span class="pn-move">${fmt(label)}</span>`);
      if (d.comment) {
        para.insertAdjacentHTML('beforeend', ` <span class="pn-comment">${fmt(d.comment)}</span>`);
        curlyPass(para);
        para = null;
      } else {
        curlyPass(para);
      }
      d.variations.forEach((v) => addLine(v, d, fmt, false));
    };

    // Son hamle: ayrıntı oynatıcının durumundan okunur (olay yalnızca hamle sırasını taşır).
    const addFinal = (idx: number, fmt: Format) => {
      const st = (b.querySelector('pgn-player') as unknown as { _engine?: { state?: { cache: string[]; moves: string[]; glyphs: string[]; comments: string[] } } } | null)?._engine?.state;
      if (!st) return;
      const fen = (st.cache[idx] || '').split(' ');
      handle({ type: 'reply', index: idx, san: st.moves[idx], glyph: st.glyphs[idx] || '', black: fen[1] === 'b', moveNumber: parseInt(fen[5], 10) || 1, comment: st.comments[idx] || '', variations: [] }, fmt);
    };

    const onPuzzle = (e: Event) => {
      const d = (e as CustomEvent<PuzzleDetail>).detail;
      if (!d || !b.contains(e.target as Node)) return;
      if (d.type === 'solved') solved = true;
      queue = queue.then(() => loadFormat().then(({ formatComment }) => handle(d, formatComment))).catch(() => {});
    };

    rootEl.addEventListener('cp-move', onMove);
    rootEl.addEventListener('cp-puzzle', onPuzzle);
    return () => {
      window.clearTimeout(timer);
      rootEl.removeEventListener('cp-move', onMove);
      rootEl.removeEventListener('cp-puzzle', onPuzzle);
    };
  }, []);

  return (
    <div ref={root} className="flip-stage">
      <div ref={frontEl} className="flip-face flip-front">{front}</div>
      <div ref={backEl} className="flip-face flip-back" aria-hidden="true">
        {back}
        <div ref={notesEl} className="puzzle-notes" aria-live="polite" />
      </div>
    </div>
  );
}
