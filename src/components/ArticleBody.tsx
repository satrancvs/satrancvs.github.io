import { Children, Fragment, isValidElement, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import FlipGame from '@/components/FlipGame';
import Markdown from 'markdown-to-jsx';
import { useChessPublica } from '@/lib/chesspublica';
import { curlyComments, curlyProse, watchComments } from '@/lib/curly-dom';
import ProgressiveImage, { boxWidth, isSmallImage } from '@/components/ProgressiveImage';
import { watchInlinePlay } from '@/lib/inline-play';
import { watchLocalization } from '@/lib/localize-dom';
import { watchStudy } from '@/lib/study-fix';
import { watchVariationFix } from '@/lib/variation-fix';
import { GLYPH_COLOR } from '@/components/FenDiagram';
import { splitChunks } from '@/lib/split-chunks';

// Makale gövdesi: markdown metni + PGN oyun blokları + çapraz tablo + video bağlantısı.

const NAG: Record<string, string> = {
  '1': '!', '2': '?', '3': '!!', '4': '??', '5': '!?', '6': '?!',
  '10': '=', '13': '∞', '14': '⩲', '15': '⩱', '16': '±', '17': '∓',
  '18': '+−', '19': '−+', '36': '↑', '40': '→', '44': '⯹', '132': '⇆', '146': 'N',
};

function parseTags(chunk: string) {
  const tags: Record<string, string> = {};
  for (const m of chunk.matchAll(/^\[(\w+)\s+"([^"]*)"\]\s*$/gm)) tags[m[1]] = m[2];
  return tags;
}

function cleanMoves(raw: string) {
  return raw
    .replace(/\[%[^\]]*\]/g, '')
    .replace(/\[[DP]\]/g, '')
    .replace(/\{\s*\}/g, '')
    .replace(/\$(\d+)/g, (_, n: string) => NAG[n] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function Game({ header, moves }: { header: string; moves: string }) {
  const t = parseTags(header);
  const result = (t.Result ?? '').replace('1/2-1/2', '½–½').replace(/-/g, '–');
  const parts = cleanMoves(moves).split(/(\{[^}]*\})/g).filter(Boolean);
  return (
    <figure className="border-t border-[color:var(--line)] pt-4 pb-4">
      <figcaption className="f-mono text-[color:var(--accent)] leading-relaxed">
        {t.Round && <span>{t.Round}. tur · </span>}
        {t.White} {t.WhiteElo && `(${t.WhiteElo})`} — {t.Black} {t.BlackElo && `(${t.BlackElo})`} · {result}
      </figcaption>
      <p className="mt-4 text-[1.3125rem] leading-[1.7] text-[color:rgb(var(--fg-rgb)/0.85)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {parts.map((p, i) =>
          p.startsWith('{') ? (
            <span key={i} className="italic text-[color:var(--mute)]"> {p.slice(1, -1).trim()} </span>
          ) : (
            <Fragment key={i}>{p}</Fragment>
          ),
        )}
      </p>
    </figure>
  );
}

// Bulmaca işareti: yorumda [P] ya da [P2] (çözülecek yarım hamle sayısı).
const PUZZLE_MARK = /\[P\s*\d*\]/;

// Ana hattaki ilk [P] işaretinde hamle sırası kimdeyse onu döndürür ('w' | 'b'); işaret yoksa null.
function puzzleSide(header: string, moves: string): 'w' | 'b' | null {
  const fen = header.match(/\[FEN\s+"([^"]+)"\]/i)?.[1];
  const blackFirst = fen ? fen.split(' ')[1] === 'b' : false;
  let plies = 0;
  let depth = 0;
  const re = /\{[^}]*\}|[()]|\$\d+|\d+\.+|1-0|0-1|1\/2-1\/2|\*|[^\s(){}]+/g;
  for (const m of moves.matchAll(re)) {
    const t = m[0];
    if (t === '(') depth++;
    else if (t === ')') depth--;
    else if (t[0] === '{') { if (depth === 0 && PUZZLE_MARK.test(t)) return (plies % 2 === 0) !== blackFirst ? 'w' : 'b'; }
    else if (depth === 0 && /^[A-Za-z]/.test(t) && !/^\d/.test(t)) plies++;
  }
  return null;
}

// ChessPublica <pgn> öğesini çizerken DOM'u kendisi değiştirdiği için oyun, React'in içine
// dokunmadığı bir kutuda (dangerouslySetInnerHTML) durur. [P] işaretli oyunlar <pgn-player>
// ile çizilir (bulmaca görünümü); ilk işaret Siyah'ın hamlesindeyse tahta Siyah tarafından açılır.
// Oyunlar ekrana yaklaşınca (1500 px kala) yüklenir: sayfa açılırken 13 oyun birden kurulmaz, ham PGN metni de
// görünmez (kutu, oyun gelene kadar boş bir yer tutucudur). Adreste #bağlantı varsa kaydırma konumu doğru
// hesaplansın diye hepsi hemen kurulur.
// [View "study"]: aynı oyun <pgn-study> (tahta üstte, altında hamle ve yorum listesi) ile çizilir; uzun yorumlu oyunlar için.
const WATCH_TAG = /^\[View\s+"(?:player|study)"\]\s*$/im;
const STUDY_TAG = /^\[View\s+"study"\]\s*$/im;
// [EventLine "..."]: oyun başlığındaki etkinlik satırını (Etkinlik, Yer, yıl yerine) kendi metniyle verir; satır içi Markdown/HTML (<i>) kullanılabilir.
// ChessPublica'ya geçirilmez.
const EVENT_LINE_TAG = /^\[EventLine\s+"[^"]*"\]\s*$/im;
// [Frame "quote"]: oyun, alıntı kutusunun (.quote) içinde çizilir (diyagram + <pgn>); oyuncu başlığı yerine EventLine kaynak satırı olur (Palavan'ın analizi).
const QUOTE_TAG = /^\[Frame\s+"quote"\]\s*$/im;
// `[Flip "puzzle"]` (yalnızca bir `[Frame "quote"]` oyununda): oyun <pgn-player> ile çizilir ve bitince, hemen ardından gelen aynı oyunun bulmaca hali (FlipGame)
// tahta Siyah tarafına dönerek öne gelir. Etiket ChessPublica'ya geçirilmez.
const FLIP_TAG = /^\[Flip\s+"[^"]*"\]\s*$/im;

// Oyun yorumlarında (`{ … }`): `### Başlık` satırı başlık (`.cp-heading`, İçindekiler'e girer), boş satır paragraf ayracıdır.
// ChessPublica yorumlarda yalnızca satır içi etiketlere izin verir; başlık bu yüzden class'ı izinli bir <span>'dır (bkz. docs/chesspublica-quirks.md).
const COMMENT_HEADING = /(^|\n)[ \t]*###[ \t]+([^\n]+)\n*/g;
// Yorumun içindeki tek başına bir satır olan `![açıklama](yol "künye")` bir fotoğraftır: PgnGame satırı `@@FIG0@@` yer tutucusuyla değiştirir,
// commentMarkup yer tutucuyu boş bir <span class="cp-fig"> yapar, ChessPublica çizdikten sonra Figure bu <span>'a portal ile basılır (yazıdaki fotoğrafla aynı bileşen).
// Aynı mekanizma, yorumun içindeki tek başına bir `[FEN "…"]` satırı için de geçerlidir: oyunda oynanmayan (analizdeki) bir konumun statik diyagramı çizilir
// (`[D]` yalnızca oyunun o anki konumunu çizer). Çalışma görünümünde (`pgn-study`) canlı tahta olduğu için FEN satırları silinir.
const COMMENT_FIG_LINE = /^[ \t]*(!\[[^\n]*\)|\[FEN\s+"[^"\n]+"\](?:[ \t]*\[[?!]{1,2}[ \t]+[a-h][1-8]\])?)[ \t]*$/gm;
const COMMENT_FEN = /^\[FEN\s+"([^"]+)"\](?:\s*\[([?!]{1,2})\s+([a-h][1-8])\])?$/;
// Önceki boş satır da yutulur: blok olan figürün üst boşluğu yalnızca kendi kenar boşluğu olsun (altıyla eşit), araya <br><br> girmesin.
const COMMENT_FIG = /\s*@@FIG\d+@@[ \t]*\n*/g;
const commentMarkup = (movetext: string) =>
  movetext.replace(/\{([^}]*)\}/g, (_, body: string) =>
    `{${body.replace(COMMENT_FIG, '<span class="cp-fig"></span>\n').replace(COMMENT_HEADING, (_m, pre: string, title: string) => `${pre}<span class="cp-heading">${title.trim()}</span> `).replace(/\n[ \t]*\n\s*/g, '<br><br>')}}`);

function PgnGame({ header, moves }: { header: string; moves: string }) {
  // [View "player"] etiketi oyunu (bulmaca işareti olmasa da) <pgn-player> ile çizdirir; ChessPublica'ya geçirilmez.
  const watch = WATCH_TAG.test(header) || FLIP_TAG.test(header);
  const study = STUDY_TAG.test(header);
  const clean = header.replace(WATCH_TAG, '').replace(EVENT_LINE_TAG, '').replace(QUOTE_TAG, '').replace(FLIP_TAG, '').trim();
  const side = study ? null : puzzleSide(clean, moves);
  const head = side === 'b' && !/\[Orientation\s/i.test(clean) ? `${clean}\n[Orientation "black"]` : clean;
  const tag = study ? 'pgn-study' : side || watch ? 'pgn-player' : 'pgn';
  // ChessPublica <pgn> ilk hamleden önceki yorumu çizmez; oyun metninin başındaki `{ … }` yorumu bu yüzden ayrılıp oyunun üstünde bir paragraf olarak gösterilir.
  const lead = tag === 'pgn' ? moves.match(/^\s*\{([^}]*)\}\s*/) : null;
  const movetext = lead ? moves.slice(lead[0].length) : moves;
  const intro = lead?.[1].replace(/\[D\]/g, '').trim();
  // <pgn-study>'de bulmaca olmaz: [P] işaretleri silinir.
  const figs: string[] = [];
  const noFigs = movetext.replace(/\{[^}]*\}/g, (c) => c.replace(COMMENT_FIG_LINE, (_m, fig: string) => (study && COMMENT_FEN.test(fig) ? '' : `@@FIG${figs.push(fig) - 1}@@`)));
  const text = study ? noFigs.replace(/\{\s*\[P\s*\d*\]\s*\}|\[P\s*\d*\]/g, '') : noFigs;
  // Etiketler (başlık <span>'ı, <br>) kaçışlandıktan SONRA eklenir: <pgn> içeriğini innerHTML ile okur, etiketler böyle gerçek etiket olarak ChessPublica'ya ulaşır.
  const raw = commentMarkup(`${head}\n\n${text.trim()}`.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(() => typeof window === 'undefined' || typeof IntersectionObserver === 'undefined' || !!window.location.hash);
  useEffect(() => {
    if (near || !box.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); }
    }, { rootMargin: '1500px 0px' });
    io.observe(box.current);
    return () => io.disconnect();
  }, [near]);
  // Sonradan kurulan düz <pgn> öğeleri için ChessPublica yeniden taratılır (<pgn-player> kendini kurar).
  useEffect(() => { if (near) window.ChessPublica?.initAll(); }, [near]);
  // Yorumlardaki fotoğraf yer tutucuları (.cp-fig) ChessPublica çizdikçe bulunur; Figure'lar portal ile içlerine basılır. Yalnızca ÇİZİLMİŞ çıktıdaki (.pgn-container) yer tutucular
  // sayılır: ham <pgn> kaynağındakine basılırsa ChessPublica kaynağı okurken künyeyi yorumun içine metin olarak da kopyalar.
  const [slots, setSlots] = useState<Element[]>([]);
  useEffect(() => {
    if (!near || !figs.length || !box.current) return;
    const el = box.current;
    const find = () => setSlots((prev) => { const now = [...el.querySelectorAll('.pgn-container .cp-fig')]; return now.length === prev.length && now.every((n, k) => n === prev[k]) ? prev : now; });
    find();
    const mo = new MutationObserver(find);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [near]); // eslint-disable-line react-hooks/exhaustive-deps
  const game = near
    ? <div ref={box} className="cp-game pb-4" dangerouslySetInnerHTML={{ __html: `<div class="cp-loading">Oyun yükleniyor...</div><${tag}>\n${raw}\n</${tag}>` }} />
    : <div ref={box} className="cp-game cp-placeholder pb-4" />;
  const figures = slots.map((el, k) => figs[k] && createPortal(COMMENT_FEN.test(figs[k]) ? <FenBlock fen={figs[k].match(COMMENT_FEN)![1]} ready analysis badge={(m => (m[2] ? { glyph: m[2], square: m[3] } : undefined))(figs[k].match(COMMENT_FEN)!)} /> : <Figure chunk={figs[k]} />, el, `fig${k}`));
  return intro ? <><p className="art-prose pb-4">{intro}</p>{game}{figures}</> : <>{game}{figures}</>;
}

// İçindekiler: yazıdaki tüm oyunlar, [Event] başlıklarından otomatik çıkarılır.
type GameItem = { id: string; key: string; round: string; hasRound: boolean; label: string; result: string; watch: boolean; study: boolean; at: number; players: string; place: string; venue: string; credit: string };
// `chunk`: başlığın geçtiği paragraf; `at`: İçindekiler'in (ilk öğe için) önüne konacağı paragraf; `game`: oyun yorumundaki başlıkta, oyun bölümünün kimliği.
type TocItem = { id: string; label: string; markup: string; chunk: number; at: number; game?: string };

function surname(name?: string) {
  return (name ?? '').split(',')[0].trim();
}

// PGN'de "Soyad, Ad" yazılan adı başlıkta "Ad Soyad" gösterir.
const fullName = (name?: string) => (name ?? '').split(',').map((x) => x.trim()).filter(Boolean).reverse().join(' ');

function gameToc(chunks: string[]): GameItem[] {
  const items: GameItem[] = [];
  chunks.forEach((c, at) => {
    if (!c.trim().startsWith('[Event ')) return;
    const t = parseTags(c);
    const n = items.length + 1;
    const watch = WATCH_TAG.test(c);
    items.push({
      id: `oyun-${t.Round || n}${watch ? '-izle' : ''}`,
      key: gameKey(c),
      watch,
      study: STUDY_TAG.test(c),
      at,
      // Turnuva, yer, yıl; art arda aynı değer (örn. Event ve Site aynıysa) bir kez yazılır.
      venue: [t.Event, t.Site, (t.Date ?? '').match(/^\d{4}/)?.[0]].filter((v, i, a) => v && v !== a[i - 1]).join(', '),
      credit: t.EventLine ?? '',
      place: t.EventLine || [t.Event, t.Site, (t.Date ?? '').match(/^\d{4}/)?.[0]].filter((v, i, a) => v && v !== a[i - 1]).join(', '),
      players: `${fullName(t.White)}${t.WhiteElo ? ` (${t.WhiteElo})` : ''} – ${fullName(t.Black)}${t.BlackElo ? ` (${t.BlackElo})` : ''}`,
      round: t.Round || String(n),
      hasRound: !!t.Round,
      label: `${surname(t.White)} – ${surname(t.Black)}`,
      result: (t.Result ?? '').replace('1/2-1/2', '½–½').replace(/-/g, '–'),
    });
  });
  return items;
}

// İçindekiler: yazıdaki "###" başlıkları. Başlık metnindeki *vurgu* işaretleri kaldırılır, kimlik başlıktan türetilir.
const TR_MAP: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[çğıöşüâîû]/g, (ch) => TR_MAP[ch])
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
const headingText = (chunk: string) => chunk.replace(/^###\s+/, '').trim();
const headingLabel = (chunk: string) => headingText(chunk).replace(/[*_]/g, '');

function sectionToc(chunks: string[], games: GameItem[]): TocItem[] {
  const seen = new Set<string>();
  const items: TocItem[] = [];
  const add = (label: string, markup: string, chunk: number, at: number, game?: string) => {
    let id = slugify(label) || `bolum-${items.length + 1}`;
    while (seen.has(id)) id += '-2';
    seen.add(id);
    items.push({ id, label, markup, chunk, at, game });
  };
  chunks.forEach((raw, i) => {
    const c = raw.trim();
    if (c.startsWith('### ')) return add(headingLabel(c), headingText(c), i, i);
    // Oyun yorumlarındaki "### Başlık" satırları (hamle metni paragrafı, başlık paragrafından sonra gelir).
    const game = chunks[i - 1]?.trim().startsWith('[Event ') && MOVETEXT_START.test(c) ? games.find((g) => g.at === i - 1) : undefined;
    if (!game) return;
    for (const m of c.matchAll(/\{([^}]*)\}/g)) {
      for (const h of m[1].matchAll(/(?:^|\n)[ \t]*###[ \t]+([^\n]+)/g)) add(h[1].replace(/[*_]/g, '').trim(), h[1].trim(), i, i - 1, game.id);
    }
  });
  return items;
}

function Toc({ items, onGo }: { items: TocItem[]; onGo: (id: string) => void }) {
  return (
    <nav aria-label="İçindekiler" className="mt-16 mb-10">
      <h3 className="f-display text-3xl md:text-4xl text-[color:var(--fg)] mb-6">İçindekiler</h3>
      <ol className="border-t border-[color:var(--line)]">
        {items.map((it, n) => (
          <li key={it.id} className="border-b border-[color:var(--line)]">
            <a href={`#${it.id}`} onClick={(e) => { e.preventDefault(); onGo(it.id); }}
              className="group flex items-baseline gap-4 py-3 text-[color:rgb(var(--fg-rgb)/0.85)] hover:text-[color:var(--accent)] transition-colors">
              <span className="f-mono text-[color:var(--accent)] w-[3rem] shrink-0">{String(n + 1).padStart(2, '0')}</span>
              <span className="flex-1"><Markdown options={{ forceInline: true }}>{it.markup}</Markdown></span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Oyun bölümü: tur başlığı ve altında oyun (her zaman açık).
function GameSection({ item, watchId, watchLabel, onWatch, children }: { item: GameItem; watchId?: string; watchLabel?: string; onWatch?: (id: string) => void; children: React.ReactNode }) {
  // [Round] etiketi olan oyunlar turnuva listesi biçiminde (N. tur, oyuncular, sonuç) başlar; etiketi olmayan oyunlar ve izleme
  // bölümü oyuncuları (Elo ile) ve altında "Turnuva, Yer, Yıl" satırını gösterir.
  const info = item.watch || !item.hasRound;
  return (
    <section id={item.id} className={`scroll-mt-8 ${item.study ? 'study-frame' : 'my-4 border-b border-[color:var(--line)]'}`}>
      {info && (
        <div className="mx-auto mb-4 w-full max-w-[520px] py-2 text-center">
          <h4 className="text-[color:rgb(var(--fg-rgb)/0.9)]">{item.players}</h4>
          {item.place && <p className="mt-1 text-[color:var(--mute)]"><Markdown options={{ forceInline: true }}>{item.place}</Markdown></p>}
        </div>
      )}
      {!info && <h4 className="flex items-baseline gap-4 py-4 mb-4 text-[color:rgb(var(--fg-rgb)/0.9)] md:grid md:grid-cols-[1fr_400px_1fr] md:gap-0">
        <span className="f-mono text-[color:var(--accent)] w-[5rem] shrink-0">{`${item.round}. tur`}</span>
        <span className="flex-1 md:text-center">{item.label}</span>
        <span className="f-mono text-[color:var(--mute)] md:justify-self-end">{item.result}</span>
      </h4>}
      {watchId && onWatch && (
        <div className="mb-4 flex justify-center">
          <button type="button" onClick={() => onWatch(watchId)}
            className="btn-mono ghost h-9 rounded-full border border-[color:var(--line)] px-5 text-[color:var(--accent)] transition-colors hover:bg-[color:var(--hover-bg)]">
            {watchLabel ?? 'Oyunu izle'} ↓
          </button>
        </div>
      )}
      {children}
    </section>
  );
}

// Markdown resim bloğu: ![alt](yol "açıklama") — açıklama satır içi markdown (bağlantı) içerebilir.
// Yol göreliyse sitenin kök adresine (BASE_URL) göre çözülür. Resim, makale sütununda ortalanır.
const IMG_CHUNK = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([\s\S]*)")?\)$/;

const captionOptions = {
  forceInline: true,
  overrides: { a: { props: { className: 'underline underline-offset-2 hover:text-[color:var(--fg)]', target: '_blank', rel: 'noreferrer' } } },
};

// Fotoğraf içeren alıntı (Korchnoi): `> ` satırları tek kutuda; araya giren görsel Figure olarak kutunun içinde kalır,
// kaynak satırı (— ...) en sonda bir kez gelir.
// Alıntı içindeki tek başına `[FEN "..."]` satırı statik bir diyagram (<fen>) olur (Capablanca alıntısı): yazı sütununda ortalı, en çok 340 px.
// `[FEN "…"] (crop: top-half)`: yalnızca tahtanın üst yarısı (8–5. yataylar) gösterilir.
// Tek başına duran `[FEN "…"]` paragrafı (alıntı dışında) statik diyagram olur (etüt).
const FIRST_MOVE_DIAGRAM = /^\s*\d+\.(?:\.\.)?\s*\S+\s*\{\s*\[D\]/;
const FEN_BLOCK = /^\[FEN\s+"([^"]+)"\](\s*\(crop:\s*top-half\))?$/;
// `analysis`: oyunda oynanmamış bir analiz konumu (yorumdaki FEN satırı): varyant diyagramları gibi küçük ve soluk; `badge`: karenin sağ üst köşesinde hamle rozeti.
function FenBlock({ fen, ready, crop = false, analysis = false, badge }: { fen: string; ready: boolean; crop?: boolean; analysis?: boolean; badge?: { glyph: string; square: string } }) {
  useEffect(() => { if (ready) window.ChessPublica?.initAll(); }, [ready]);
  const at = badge && { right: `${(7 - (badge.square.charCodeAt(0) - 97)) * 12.5 - 0.6}%`, top: `${(8 - Number(badge.square[1])) * 12.5 - 0.6}%` };
  return (
    <div role="img" aria-label={analysis ? 'Analiz diyagramı' : 'Diyagram'} className={`art-fen${crop ? ' art-fen-top' : ''}${analysis ? ' art-fen-analysis' : ''}`}>
      <div dangerouslySetInnerHTML={{ __html: `<fen>${fen}</fen>` }} />
      {badge && at && <div aria-hidden className="gm-badge art-fen-badge" style={{ background: GLYPH_COLOR[badge.glyph] ?? '#00AA00', ...at }}>{badge.glyph}</div>}
    </div>
  );
}

// " · " in a quote's source line breaks the line (poem: author/title, then translator).
const citeNodes = (nodes: ReactNode[]): ReactNode[] => nodes.flatMap((n, k) => (typeof n === 'string' ? n.split(' · ').flatMap((part, i) => (i ? [<br key={`${k}-${i}`} />, part] : [part])) : [n]));
// Kaynak satırı satır içi Markdown/HTML alabilir: yabancı adlarda `<span lang="en">…</span>` büyük harfe çevirmede Türkçe İ yerine o dilin kuralını kullandırır.
const CiteMd = ({ cite }: { cite: string }) => <>{cite.split(' · ').map((part, i) => <span key={i}>{i > 0 && <br />}<Markdown options={{ forceInline: true }}>{part}</Markdown></span>)}</>;

function QuoteWithFigure({ chunk, ready }: { chunk: string; ready: boolean }) {
  const blocks = chunk.split('\n').map((l) => l.replace(/^>\s?/, '')).join('\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const last = blocks[blocks.length - 1] ?? '';
  const cite = /^[—–-]\s+\S/.test(last) ? last.replace(/^[—–-]\s+/, '') : null;
  const body = cite ? blocks.slice(0, -1) : blocks;
  return (
    <blockquote className="quote">
      {body.map((b, k) => (IMG_CHUNK.test(b)
        ? <Figure key={k} chunk={b} />
        : FEN_BLOCK.test(b)
        ? <FenBlock key={k} fen={b.match(FEN_BLOCK)![1]} crop={!!b.match(FEN_BLOCK)![2]} ready={ready} />
        : <Markdown key={k} options={{ ...mdOptions, forceBlock: true }}>{b}</Markdown>))}
      {cite && <footer className="quote-cite f-mono">— <CiteMd cite={cite} /></footer>}
    </blockquote>
  );
}

function Figure({ chunk }: { chunk: string }) {
  const m = chunk.match(IMG_CHUNK);
  if (!m) return null;
  const [, alt, path, caption] = m;
  // Kitap kapağı küçük gösterilir; dar görselin altındaki künye okunabilsin diye künye kapaktan geniş tutulur.
  const cover = /^images\/[^/]*(adventurous-way|chess-for-zebras)/.test(path);
  const small = cover || isSmallImage(path);
  return (
    <figure className={`my-10 mx-auto w-full ${small ? 'md:max-w-[480px] text-center' : ''}`} style={small ? undefined : { maxWidth: boxWidth(path) }}>
      <ProgressiveImage path={path} alt={alt} cover={cover} />
      {caption && (
        <figcaption className="credit mt-3 text-[color:var(--mute)]">
          <Markdown options={captionOptions}>{caption}</Markdown>
        </figcaption>
      )}
    </figure>
  );
}

// YouTube videosu: markdown'daki <figure class="video-embed"> bloğundan video kimliği, başlangıç (`start`) ve isteğe bağlı bitiş (`end`) saniyesi,
// başlık ve açıklama okunur; gizlilik dostu youtube-nocookie alan adıyla gömülü oynatıcı çizilir.
// `<figure data-poster="/images/…">` varsa önce o kapak görseli ve bir oynat düğmesi gösterilir; YouTube oynatıcısı (ve
// onun kapak görseli, "More videos" şeridi) yalnızca düğmeye basılınca yüklenir ve kendiliğinden oynar.
function Video({ chunk }: { chunk: string }) {
  const poster = chunk.match(/<figure[^>]*\bdata-poster="([^"]+)"/)?.[1];
  const [started, setStarted] = useState(!poster);
  const id = chunk.match(/embed\/([\w-]+)(?:\?start=(\d+)(?:&(?:amp;)?end=(\d+))?)?/);
  if (!id) return null;
  const title = chunk.match(/<iframe[^>]*\btitle="([^"]*)"/)?.[1] ?? 'YouTube videosu';
  const capLines = (chunk.match(/<figcaption>([\s\S]*?)<\/figcaption>/)?.[1] ?? '')
    .split(/<br\s*\/?>/)
    
    .map((l) => l.trim())
    .filter(Boolean);
  // rel=0: öneriler yalnızca aynı kanaldan; iv_load_policy=3: video üstü notlar kapalı; playsinline: iPhone'da tam ekrana geçmeden oynar.
  const embedQuery = `?${[id[2] && `start=${id[2]}`, id[3] && `end=${id[3]}`, 'rel=0', 'iv_load_policy=3', 'playsinline=1'].filter(Boolean).join('&')}`;
  const src = `https://www.youtube-nocookie.com/embed/${id[1]}${embedQuery}${poster ? '&autoplay=1' : ''}`;
  const href = `https://www.youtube.com/watch?v=${id[1]}${id[2] ? `&t=${id[2]}s` : ''}`;
  return (
    <figure className="my-10 mx-auto w-full md:max-w-[600px]">
      <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: '16 / 9' }}>
        {started ? (
          <iframe
            src={src}
            title={title}
            loading="lazy"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button type="button" onClick={() => setStarted(true)} aria-label={`Videoyu oynat: ${title}`} className="group absolute inset-0 block h-full w-full cursor-pointer border-0 p-0">
            <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-[#F1E9DC] transition-colors group-hover:bg-black/80 group-focus-visible:bg-black/80">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true"><path d="M9 6v12l9-6z" /></svg>
            </span>
          </button>
        )}
      </div>
      <figcaption className="credit mt-3 text-[color:var(--mute)]">
        <Markdown options={captionOptions}>{capLines.map((l) => (/[.!?…]$/.test(l.replace(/<[^>]+>/g, '')) ? l : `${l}.`)).join(' ')}</Markdown>{' '}
        <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[color:var(--fg)]">YouTube'da aç</a>
      </figcaption>
    </figure>
  );
}

// Alıntı: Fraunces italik, sol altın çizgi. Son paragraf "— " ile başlıyorsa kaynak satırı olur (mono, küçük harf yok, soluk):
//   > "Alıntı metni."
//   >
//   > — Kaynak adı
function Quote({ children }: { children?: ReactNode }) {
  const kids = Children.toArray(children);
  const last = kids[kids.length - 1];
  const lastKids = isValidElement<{ children?: ReactNode }>(last) ? Children.toArray(last.props.children) : [];
  const first = lastKids[0];
  const dash = typeof first === 'string' ? first.match(/^\s*[—–-]\s+([\s\S]*)$/) : null;
  const cite = dash && (dash[1] || lastKids.length > 1) ? [dash[1], ...lastKids.slice(1)] : null;
  return (
    <blockquote className="quote">
      {cite ? kids.slice(0, -1) : kids}
      {cite && <footer className="quote-cite f-mono">— {citeNodes(cite)}</footer>}
    </blockquote>
  );
}

// "Devamı gelecek. Kaçırmamak için [bültene abone ol](/#bulten)." paragrafı yazının bir parçası değildir; ayrı, sakin bir kapanış bloğu olarak çizilir.
const CONTINUED = /^Devamı gelecek\./;
function Continued({ text }: { text: string }) {
  const rest = text.replace(CONTINUED, '').trim().replace(/\.$/, ''); // son nokta bağlantı hapından sonra tek başına kalmasın
  return (
    <aside className="to-be-continued" aria-label="Devamı gelecek">
      <p className="tbc-label f-mono">Devamı gelecek</p>
      <p className="tbc-text"><Markdown options={{ forceInline: true, overrides: { a: { props: { className: 'tbc-link' } } } }}>{rest}</Markdown></p>
    </aside>
  );
}

const mdOptions = {
  overrides: {
    h3: { props: { className: 'f-display text-4xl md:text-5xl mt-16 mb-6 text-[color:var(--fg)]' } },
    a: { props: { className: 'text-[color:var(--accent)] underline underline-offset-4', target: '_blank', rel: 'noreferrer' } },
    blockquote: { component: Quote },
    ul: { props: { className: 'list-disc pl-6 mb-6 space-y-2 marker:text-[color:var(--accent)]' } },
    strong: { props: { className: 'font-semibold text-[color:var(--fg)]' } },
  },
};

// Markdown dosyasını paragraf bloklarına böler. Giriş (dek) metni articles.json'dan gelir;
// dosyanın hiçbir paragrafı sayfadan ayrılmaz.
export function splitArticle(md: string) {
  return { chunks: splitChunks(md) };
}

// Oyunun hamle metni başlıktan sonraki paragraftır. [View "player"] başlığının ardından hamle metni gelmiyorsa
// (yalnızca etiketler yazılmışsa), oyuncu yazıdaki daha önceki, Round/White/Black/Date etiketleri aynı olan oyunun
// hamle metnini kullanır; böylece aynı PGN iki kez yazılmaz. `own`: hamle metni bu başlığın kendi paragrafıdır.
const MOVETEXT_START = /^\s*(\d+\s*\.|\{)/;
const gameKey = (header: string) => {
  const t = parseTags(header);
  return [t.White, t.Black, t.Date, t.Round].join('|');
};
function gameMoves(chunks: string[], i: number): { moves: string; own: boolean } {
  const next = chunks[i + 1] ?? '';
  if (!WATCH_TAG.test(chunks[i]) || MOVETEXT_START.test(next)) return { moves: next, own: true };
  const key = gameKey(chunks[i]);
  for (let j = 0; j < i; j++) {
    const h = chunks[j].trim();
    if (h.startsWith('[Event ') && !WATCH_TAG.test(h) && gameKey(h) === key && MOVETEXT_START.test(chunks[j + 1] ?? '')) {
      return { moves: chunks[j + 1], own: false };
    }
  }
  return { moves: next, own: true };
}

export default function ArticleBody({ chunks }: { chunks: string[] }) {
  const hasGames = chunks.some((c) => c.trim().startsWith('[Event ') || FEN_BLOCK.test(c.trim()) || (c.startsWith('>') && /^>\s*\[FEN\s/m.test(c)));
  const hasStudy = chunks.some((c) => STUDY_TAG.test(c));
  const cp = useChessPublica(hasGames, { study: hasStudy });
  // ChessPublica yüklenemezse eski düz metin görünümüne düşülür.
  const useFallback = cp === 'error';
  const games = gameToc(chunks);
  const toc = sectionToc(chunks, games);
  // Tembel yüklenen fotoğraflar kaydırma sırasında sayfa yüksekliğini değiştirir; bu yüzden kaydırma
  // bittikten sonra konum (scroll-mt-8 = 32 px) gerekirse yeniden düzeltilir.
  // `fallback`: oyun yorumundaki başlık oyun henüz kurulmadıysa (tembel yükleme) önce oyun bölümüne gidilir; başlık çizilince konum düzeltilir.
  const scrollToGame = (id: string, smooth: boolean, fallback?: string) => {
    const find = () => document.getElementById(id) ?? (fallback ? document.getElementById(fallback) : null);
    const go = (behavior: ScrollBehavior) => find()?.scrollIntoView({ behavior, block: 'start' });
    go(smooth ? 'smooth' : 'auto');
    [900, 1800].forEach((ms) =>
      window.setTimeout(() => {
        const el = find();
        if (el && Math.abs(el.getBoundingClientRect().top - 32) > 4) go('auto');
      }, ms),
    );
  };
  const goTo = (id: string) => {
    scrollToGame(id, true, toc.find((t) => t.id === id)?.game);
    window.history.replaceState(null, '', `#${id}`);
  };
  let gameNo = 0;
  let tocPlaced = false;
  const out: JSX.Element[] = [];

  // Curly quotes: yazı metni ve oyunların YORUMLARI (hamle metni değil). ChessPublica yorumları geç çizdiği için
  // gözlemci bağlanır; oyunlar hazır olunca son bir geçiş daha yapılır.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    curlyProse(el);
    curlyComments(el);
    const stopCurly = watchComments(el);
    const stopLocalize = watchLocalization(el);
    const stopInlinePlay = watchInlinePlay(el);
    const stopVariationFix = watchVariationFix(el);
    const stopStudy = watchStudy(el);
    // Oyun yorumlarındaki başlıklara (.cp-heading) İçindekiler'deki kimlik verilir (sectionToc ile aynı slugify).
    const idHeadings = () => el.querySelectorAll('.cp-heading').forEach((h) => { const id = slugify(h.textContent ?? ''); if (id && h.id !== id) h.id = id; });
    idHeadings();
    const headingObserver = new MutationObserver(idHeadings);
    headingObserver.observe(el, { childList: true, subtree: true });
    return () => { stopCurly(); stopLocalize(); stopInlinePlay(); stopVariationFix(); stopStudy(); headingObserver.disconnect(); };
  }, [chunks]);
  useEffect(() => {
    const el = rootRef.current;
    if (el && (cp === 'ready' || cp === 'error')) {
      curlyProse(el);
      curlyComments(el);
    }
  }, [cp]);

  // Adresteki #oyun-N bağlantısı ile açılırsa, oyunlar çizildikten sonra o oyuna kaydırır.
  useEffect(() => {
    if (cp !== 'ready' && cp !== 'error') return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    window.setTimeout(() => scrollToGame(id, false, toc.find((t) => t.id === id)?.game), 80);
  }, [cp]); // eslint-disable-line react-hooks/exhaustive-deps

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i].trim();
    if (toc.length > 1 && !tocPlaced && i === toc[0].at) {
      out.push(<Toc key="toc" items={toc} onGo={goTo} />);
      tocPlaced = true;
    }
    if (c.startsWith('[Event ')) {
      const item = games[gameNo++];
      const { moves, own } = gameMoves(chunks, i);
      // Aynı oyunun yazının sonunda oynatıcılı (View "player") bir bölümü varsa, metin halinin başlığına oraya kaydıran bir düğme konur.
      const watchItem = !item.watch ? games.find((g) => g.watch && g.key === item.key) : undefined;
      // Düğme, izleme bölümünün hemen önünde "###" başlığı varsa (Oyunu izleyin / Oyunu inceleyin) o başlığa kaydırır, yoksa bölümün kendisine.
      const watchTarget = watchItem && chunks[watchItem.at - 1]?.trim().startsWith('### ')
        ? toc.find((t) => t.chunk === watchItem.at - 1)?.id ?? watchItem.id
        : watchItem?.id;
      const game = useFallback
        ? <Game header={c} moves={moves} />
        : <PgnGame header={c} moves={moves} />;
      // <pgn> (oynatıcısız) oyunlar bir başlangıç FEN'inden başlıyorsa, hamle metninin üstünde o konum bir diyagramla gösterilir.
      // İlk hamlenin hemen ardından yazarın kendi diyagramı ([D]) geliyorsa başlangıç diyagramı gösterilmez (Andersson–Timman).
      const startFen = !useFallback && !WATCH_TAG.test(c) && !FLIP_TAG.test(c) && !puzzleSide(c, moves) && !FIRST_MOVE_DIAGRAM.test(moves) ? c.match(/\[FEN\s+"([^"]+)"\]/i)?.[1] : undefined;
      if (QUOTE_TAG.test(c)) {
        // Hemen ardından aynı oyunun bulmaca (oynatıcılı) hali geliyorsa o da aynı kutunun içine girer (Palavan–Euwe).
        const nextAt = i + (own ? 2 : 1);
        const nextItem = chunks[nextAt]?.trim().startsWith('[Event ') ? games[gameNo] : undefined;
        const puzzle = nextItem && !nextItem.watch && nextItem.key === item.key ? nextItem : undefined;
        let puzzleBox: ReactNode = null;
        let flipBox: ReactNode = null;
        let skip = own ? 1 : 0;
        if (puzzle) {
          gameNo++;
          const hdr = chunks[nextAt].trim();
          const pm = gameMoves(chunks, nextAt);
          // `[Flip "puzzle"]`: oynatıcı (analiz) bitince tahta döner, bulmaca öne gelir (FlipGame). ChessPublica yüklenemediyse düz sıralı halde kalır.
          if (FLIP_TAG.test(c) && !useFallback) {
            flipBox = <div id={puzzle.id} className="scroll-mt-8"><FlipGame front={game} back={<PgnGame header={hdr} moves={pm.moves} />} /></div>;
          } else {
            puzzleBox = <div id={puzzle.id} className="scroll-mt-8 mt-8">{useFallback ? <Game header={hdr} moves={pm.moves} /> : <PgnGame header={hdr} moves={pm.moves} />}</div>;
          }
          skip = nextAt - i + (pm.own ? 1 : 0);
        }
        out.push(
          <section key={i} id={item.id} className="scroll-mt-8">
            <blockquote className="quote quote-game">
              <div className="mx-auto mb-4 w-full max-w-[520px] py-2 text-center not-italic">
                <h4 className="text-[color:rgb(var(--fg-rgb)/0.9)]">{item.players}</h4>
                {item.venue && <p className="mt-1 text-[color:var(--mute)]">{item.venue}</p>}
              </div>
              {startFen && <FenBlock fen={startFen} ready={cp === 'ready'} />}
              {flipBox ?? game}
              {puzzleBox}
              {item.credit && <footer className="quote-cite f-mono">— <CiteMd cite={item.credit} /></footer>}
            </blockquote>
          </section>,
        );
        i += skip;
        continue;
      }
      out.push(
        <GameSection key={i} item={item} watchId={watchTarget} watchLabel={watchItem?.study ? 'Oyunu incele' : undefined} onWatch={(id) => scrollToGame(id, true)}>
          {startFen && <FenBlock fen={startFen} ready={cp === 'ready'} />}
          {game}
        </GameSection>,
      );
      if (own) i++;
    } else if (CONTINUED.test(c)) {
      out.push(<Continued key={i} text={c} />);
    } else if (FEN_BLOCK.test(c)) {
      const m = c.match(FEN_BLOCK)!;
      out.push(<FenBlock key={i} fen={m[1]} crop={!!m[2]} ready={cp === 'ready'} />);
    } else if (c.startsWith('### ')) {
      const section = toc.find((t) => t.chunk === i);
      out.push(
        <h3 key={i} id={section?.id} className="f-display text-4xl md:text-5xl mt-16 mb-6 text-[color:var(--fg)] scroll-mt-8">
          <Markdown options={{ forceInline: true }}>{headingText(c)}</Markdown>
        </h3>,
      );
    } else if (c.startsWith('<pre>')) {
      out.push(
        <pre key={i} className="crosstable my-10 overflow-x-auto">
          {c.replace(/<\/?pre>/g, '').replace(/^\n/, '')}
        </pre>,
      );
    } else if (c.startsWith('>') && /^>\s*(!\[|\[FEN\s)/m.test(c)) {
      out.push(<QuoteWithFigure key={i} chunk={c} ready={cp === 'ready'} />);
    } else if (IMG_CHUNK.test(c)) {
      out.push(<Figure key={i} chunk={c} />);
    } else if (c.startsWith('<figure')) {
      out.push(<Video key={i} chunk={c} />);
    } else {
      // Alıntının başındaki `> [sağa yaslı]` ve `> [şiir]` satırları (metne girmez) alıntıyı sağa yaslar / Fraunces italik yapar.
      let body = c;
      const marks: string[] = [];
      for (let m = body.match(/^>\s*\[(sağa yaslı|şiir)\]\s*(\n|$)/); m; m = body.match(/^>\s*\[(sağa yaslı|şiir)\]\s*(\n|$)/)) {
        marks.push(m[1] === 'şiir' ? 'quote-poem' : 'quote-right');
        body = body.slice(m[0].length);
      }
      out.push(
        <div key={i} className={['art-prose [&>p]:mb-6 [&>h3]:mb-6', ...marks].join(' ')}>
          <Markdown options={{ ...mdOptions, forceBlock: true }}>{body}</Markdown>
        </div>,
      );
    }
  }
  if (toc.length > 1 && !tocPlaced) out.unshift(<Toc key="toc" items={toc} onGo={goTo} />);
  return (
    <div ref={rootRef} className="text-[1.3125rem] leading-[1.7] text-[color:rgb(var(--fg-rgb)/0.85)]" data-cp={cp}>
      {out}
    </div>
  );
}
