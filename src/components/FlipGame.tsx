import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { curlyPass } from '@/lib/curly-dom';

// Palavan–Euwe: iki ayrı oynatıcı alt alta durur. Üstte Beyaz tarafından analiz (`front`), altında Siyah tarafından bulmaca (`back`).
// Bulmacanın altındaki yorumlar okur hamleyi bulunca (ya da analizdeki bir hamleyi denerse) açılır; yan varyantlar yalnızca denenince satır olarak eklenir.
// Oynatıcıdan gelen `cp-puzzle` olayı public/chesspublica/pgn-player.js'deki site yamasıdır. (Eskiden analiz bitince tahta dönerdi; kaldırıldı.)

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
  const backEl = useRef<HTMLDivElement>(null);
  const notesEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootEl = root.current;
    const b = backEl.current;
    const notes = notesEl.current;
    if (!rootEl || !b || !notes) return;

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

    rootEl.addEventListener('cp-puzzle', onPuzzle);
    return () => {
      rootEl.removeEventListener('cp-puzzle', onPuzzle);
    };
  }, []);

  return (
    <div ref={root} className="flip-stage">
      <div className="flip-face flip-front">{front}</div>
      <div ref={backEl} className="flip-face flip-back is-active">
        {back}
        <div ref={notesEl} className="puzzle-notes" aria-live="polite" />
      </div>
    </div>
  );
}
