import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { curlyPass } from '@/lib/curly-dom';

// Palavan–Euwe: tek oynatıcı gibi görünen iki oynatıcı. Önce Beyaz tarafından analiz (`front`) oynar; analizin son yorumundaki oynat düğmesine
// basılınca analiz kaybolur, aynı yerde Siyah tarafından bulmaca (`back`, önünde `between` geçiş cümlesi) açılır. Bulmaca arka planda baştan çizili
// durur (ChessPublica tahtayı çizim anındaki genişliğe göre boyutlandırır), görünmez ve yer kaplamaz.
// Bulmacanın altındaki yorumlar okur hamleyi bulunca (ya da analizdeki bir hamleyi denerse) açılır; yan varyantlar yalnızca denenince satır olarak eklenir.
// Oynatıcıdan gelen `cp-move` (detail.gameOver) ve `cp-puzzle` olayları public/chesspublica/pgn-player.js'deki site yamalarıdır.

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

export default function FlipGame({ front, between, back }: { front: ReactNode; between?: ReactNode; back: ReactNode }) {
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

    let switched = false;
    let atEnd = false;

    // Analiz biter bitmez (son hamle ve yorumu görünürken) "başa dön" düğmesi bir "oynat" düğmesine çevrilir; ona basınca bulmaca açılır.
    // Düğmeyi oynatıcı her çizimde yeniden oluşturur: izlenir. (cloneNode oynatıcının onclick işleyicisini taşımaz; yeni düğmeye işlev bağlanır.)
    const showPuzzle = () => {
      if (switched) return;
      switched = true;
      rootEl.style.minHeight = `${rootEl.offsetHeight}px`;
      f.style.display = 'none';
      b.classList.add('is-active');
      b.removeAttribute('aria-hidden');
      requestAnimationFrame(() => { rootEl.style.minHeight = ''; });
    };
    const toPlay = async () => {
      if (switched || !atEnd) return;
      const { lucideIconUrl } = await import(/* @vite-ignore */ ICONS);
      f.querySelectorAll('.comment-play-btn').forEach((btn) => {
        if (btn.hasAttribute('data-flip')) return;
        const next = btn.cloneNode(true) as HTMLElement;
        next.setAttribute('data-flip', '1');
        const icon = next.querySelector('.lucide-icon') as HTMLElement | null;
        icon?.style.setProperty('--icon', lucideIconUrl('circle-play'));
        icon?.setAttribute('aria-label', 'Play');
        next.addEventListener('click', showPuzzle);
        btn.replaceWith(next);
      });
    };
    const onMove = (e: Event) => {
      if (switched || !f.contains(e.target as Node)) return;
      atEnd = !!(e as CustomEvent).detail?.gameOver;
      if (atEnd) requestAnimationFrame(() => void toPlay());
    };
    const watch = new MutationObserver(() => { if (atEnd && !switched) void toPlay(); });
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
        {between}
        {back}
        <div ref={notesEl} className="puzzle-notes" aria-live="polite" />
      </div>
    </div>
  );
}
