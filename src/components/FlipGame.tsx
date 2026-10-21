import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { curlyPass } from '@/lib/curly-dom';

// Palavan–Euwe: önce Beyaz tarafından bir oynatıcı (analiz), bitince tahta Siyah tarafına döner ve aynı konum bir bulmacaya dönüşür.
// Önde `front` (oynatıcı), arkada `back` (bulmaca) durur; ön oynatıcı son hamlesine gelince yorumun yanında bir oynat düğmesi çıkar,
// arka yüz o düğmeye basılınca öne gelir (kendiliğinden dönmez). Bulmacanın altındaki yorumlar okur hamleyi bulunca (ya da analizdeki bir hamleyi denerse) açılır.
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
const ICONS = '/chesspublica/icons.js';
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
    let atEnd = false;

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
      if (flipped || !f.contains(e.target as Node)) return;
      atEnd = !!(e as CustomEvent).detail?.gameOver;
      if (atEnd) requestAnimationFrame(toPlay);
    };

    // Ön oynatıcı son hamlesindeyken yorumun yanındaki "başa dön" düğmesi bir "oynat" düğmesine çevrilir; tahta yalnızca ona basılınca döner.
    // (cloneNode oynatıcının onclick işleyicisini taşımaz; yeni düğmeye döndürme işlevi bağlanır.)
    const toPlay = async () => {
      if (flipped || !atEnd) return;
      const { lucideIconUrl } = await import(/* @vite-ignore */ ICONS);
      f.querySelectorAll('.comment-play-btn').forEach((btn) => {
        if (btn.hasAttribute('data-flip')) return;
        const next = btn.cloneNode(true) as HTMLElement;
        next.setAttribute('data-flip', '1');
        const icon = next.querySelector('.lucide-icon') as HTMLElement | null;
        icon?.style.setProperty('--icon', lucideIconUrl('circle-play'));
        icon?.setAttribute('aria-label', 'Play');
        next.addEventListener('click', flip);
        btn.replaceWith(next);
      });
    };
    const watch = new MutationObserver(() => { if (atEnd && !flipped) void toPlay(); });
    watch.observe(f, { childList: true, subtree: true });

    // Bulmaca yorumları: sıralı işlenir (biçimleyici modülü eşzamansız yüklenir).
    const shown = new Map<string, HTMLElement>();
    let queue: Promise<void> = Promise.resolve();

    const addLine = (v: Variation, d: PuzzleDetail, fmt: Format, reveal: boolean) => {
      const key = `${d.index}|${v.moves.join(' ')}`;
      const old = shown.get(key);
      if (old) {
        if (reveal) { old.classList.remove('flash'); void old.offsetWidth; old.classList.add('flash'); }
        return;
      }
      const p = document.createElement('p');
      p.className = reveal ? 'pn-line flash' : 'pn-line';
      p.innerHTML = fmt(lineText(v, d));
      notes.appendChild(p);
      curlyPass(p);
      shown.set(key, p);
    };

    // Hamlelerin yorumları oynatıcının kendi yorum kutusunda (tahtanın altında) görünür (pgn-player.js yaması, `_showComment`).
    // Burada yalnızca yan varyantlar (analizdeki alternatif hamleler) alta satır olarak eklenir, yalnızca analizdeki bir hamle denenince (hamle bulununca kendiliğinden açılmaz).
    const handle = (d: PuzzleDetail, fmt: Format) => {
      if (d.type === 'solved') return;
      if (d.type === 'wrong') {
        // Çözüm değil ama analizde geçen bir hamle denendi: o hamleyle başlayan yan varyant açılır.
        const hit = d.attempt ? d.variations.find((v) => v.moves[0] && norm(v.moves[0]) === norm(d.attempt as string)) : undefined;
        if (hit) addLine(hit, d, fmt, true);
        return;
      }
    };

    const onPuzzle = (e: Event) => {
      const d = (e as CustomEvent<PuzzleDetail>).detail;
      if (!d || !b.contains(e.target as Node)) return;
      queue = queue.then(() => loadFormat().then(({ formatComment }) => handle(d, formatComment))).catch(() => {});
    };

    rootEl.addEventListener('cp-move', onMove);
    rootEl.addEventListener('cp-puzzle', onPuzzle);
    return () => {
      watch.disconnect();
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
