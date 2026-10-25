// <pgn-player>'da bir varyanttaki hamleye tıklayınca ChessPublica yorum kutusunu yeniden kurar ve tıklanan
// varyant listelerini (ile ana hat yorumunu) kutudan siler. Eski sitedeki variation-fix.js'in bu siteye uyarlanmış
// hali: canlı liste düğümlerini (tıklama işleyicileriyle birlikte) yerine koyar. ChessPublica'nın iç yapısına
// (`_engine`, `_variation`) bağlıdır; bu dosya dışında bu alanlara erişilmez. Ayrıntı: docs/chesspublica-quirks.md.
type Variation = { contentEl?: HTMLElement; index: number; mainStateIndex: number; fens: unknown[] };
type Engine = {
  _variation?: Variation | null;
  exitVariation: () => void;
  goTo: (index: number) => void;
  play: () => void;
};
type Player = HTMLElement & { _engine?: Engine };

const engineOf = (player: Player) => player._engine ?? null;
const variationOf = (engine: Engine | null) => engine?._variation ?? null;
const detachVariation = (engine: Engine) => { engine._variation = null; };

const kids = (el: Element) => Array.from(el.children);
const isBlock = (el: Element) => el.classList.contains('variation-block');
// Üst düzey varyant blokları: doğrudan kutuda ya da sol sütun kutusunda (.cp-left-stack, var-lead.ts) durabilir.
const topBlocks = (box: Element) => Array.from(box.querySelectorAll('.variation-block')).filter((b) => !b.parentElement?.closest('.variation-block'));
const textOf = (el?: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

// Ana hatta en son görülen üst düzey varyant blokları ve onların bağlı olduğu ana hat yorumu (kopya), oyuncu başına.
const savedBlocks = new WeakMap<Player, Element[] | null>();
const savedLines = new WeakMap<Player, Element | null>();

function ensurePlayButton(box: Element) {
  // Düğme satır içine taşınmış olabilir (inline-play.ts): kutunun herhangi bir yerinde aranır, ikincisi eklenmez.
  // Oynatıcı her yeniden çizimde kendi düğmesini ekler; bizim taşıdığımız varsa iki düğme olur: varyant içindeki (yoksa ilk) kalır.
  const all = Array.from(box.querySelectorAll('.comment-play-btn'));
  const keep = all.find((b) => b.closest('.variation-block')) ?? all[0];
  all.forEach((b) => b !== keep && b.remove());
  let button = box.querySelector('.comment-play-btn');
  // Düğme varyant blokları geri konmadan önce yorum satırının içine taşınmış olabilir (satır gizliyse ya da varyanttan uzaktaysa görünmez):
  // kutuya geri konur, inline-play.ts onu en son varyantın son metnine taşır.
  if (button && !button.closest('.variation-block') && box.querySelector(':scope > .variation-block')) box.append(button);
  if (!button) {
    button = document.createElement('button');
    button.className = 'comment-play-btn';
    const icon = document.createElement('span');
    icon.className = 'lucide-icon';
    button.append(icon);
    box.append(button);
  }
  // Düğme her zaman düz "oynat" simgesi gösterir: varyant sonundaki "tekrar" simgesi burada yaptığı işi anlatmaz.
  const icon = button.querySelector<HTMLElement>('.lucide-icon');
  const source = box.querySelector<HTMLElement>('.variation-icon');
  if (icon && source) icon.style.setProperty('--icon', source.style.getPropertyValue('--icon'));
  icon?.setAttribute('aria-label', 'Oynat');
}

// ChessPublica, varyantın tüm hamlelerini (iç içe varyantlar dahil) sayarak vurgulanacak hamleyi bulur; iç içe bir
// varyanttan sonra bu yüzden bir hamle erken işaretler. Varyantın kendi hamleleri (iç listeler değil) sayılır.
function syncActiveMove(box: Element, variation: Variation) {
  const content = variation.contentEl;
  if (!content || !(variation.index >= 1)) return;
  const own = Array.from(content.querySelectorAll('.var-move')).filter((m) => m.closest('.variation-content') === content);
  const target = own[variation.index - 1];
  if (!target) return;
  box.querySelectorAll('.var-move.active').forEach((m) => m !== target && m.classList.remove('active'));
  if (!target.classList.contains('active')) target.classList.add('active');
}

// Varyant içinde etkin hamlenin yorumu iki kez görünür: varyantın üstündeki yorum satırında ve varyant metninde.
// Satır yalnızca bunu tekrar ediyorsa gizlenir (.cp-duplicate).
function hideDuplicateComment(box: Element) {
  const line = box.querySelector(':scope > .comment-line');
  if (!line) return;
  const inline = box.querySelector('.var-move.active')?.nextElementSibling;
  line.classList.toggle('cp-duplicate', Boolean(inline?.classList.contains('variation-comment')) && textOf(inline) === textOf(line));
}

// Ana hat yorumunu, tanıttığı varyantların önünde tutar.
function restoreLine(player: Player, box: Element) {
  const line = savedLines.get(player);
  if (!line) return;
  const present = kids(box).filter((el) => el.classList.contains('comment-line'));
  if (present.length === 1 && (present[0] as HTMLElement).dataset.cpSaved) return;
  present.forEach((el) => el.remove());
  const copy = line.cloneNode(true) as HTMLElement;
  copy.dataset.cpSaved = '1';
  box.prepend(copy);
}

function restore(player: Player) {
  const engine = engineOf(player);
  const box = player.querySelector('.video-comment');
  if (!engine || !box) return;
  const variation = variationOf(engine);

  if (!variation) {
    box.classList.remove('cp-in-variation');
    box.querySelector(':scope > .comment-line')?.classList.remove('cp-duplicate');
    const blocks = topBlocks(box);
    savedBlocks.set(player, blocks.length ? blocks : null);
    const line = box.querySelector(':scope > .comment-line');
    savedLines.set(player, line ? (line.cloneNode(true) as Element) : null);
    return;
  }

  box.classList.add('cp-in-variation');
  const saved = savedBlocks.get(player);
  const content = variation.contentEl;
  if (saved && content && saved.some((block) => block.contains(content))) {
    const present = topBlocks(box);
    const intact = present.length === saved.length && saved.every((block) => box.contains(block));
    if (!intact) {
      present.forEach((block) => block.remove());
      box.querySelectorAll(':scope > .cp-left-stack').forEach((stack) => stack.remove());
      saved.forEach((block) => box.append(block));
    }
  } else if (content && !box.contains(content)) {
    box.append(content);
  }
  restoreLine(player, box);
  syncActiveMove(box, variation);
  hideDuplicateComment(box);
  ensurePlayButton(box);
}

// Yakalama aşaması: ChessPublica'nın kendi işleyicilerinden önce çalışır.
function onClick(player: Player, event: Event) {
  const engine = engineOf(player);
  if (!engine) return;
  const variation = variationOf(engine);
  const target = event.target as Element | null;
  if (!target?.closest) return;

  // Varyant içinden oynat: dallandığı ana hat konumuna dön ve oradan oynat.
  if (variation && target.closest('.comment-play-btn')) {
    event.stopPropagation();
    event.preventDefault();
    const index = variation.mainStateIndex;
    engine.exitVariation();
    engine.goTo(index);
    engine.play();
    return;
  }

  // Şimdikinden başka bir varyanttaki hamle: önce şimdikinden çık (üst varyant olarak yığılmasın, tek hamle
  // vurgulu kalsın). Şimdikinin içindeki iç varyant gerçek bir üst/alt adımdır, dokunulmaz.
  const move = target.closest('.var-move');
  if (!move) return;
  if (variation?.contentEl) {
    const list = move.closest('.variation-content');
    const same = list === variation.contentEl;
    const nested = !same && !!list && variation.contentEl.contains(list);
    // Aynı liste içinde ilerlemek, bağlı olduğu varyantı korur: çıkmak üst varyantı unuturdu.
    if (same) detachVariation(engine);
    else if (!nested) engine.exitVariation();
  }
  player.querySelector('.video-comment')?.querySelectorAll('.var-move.active').forEach((m) => m.classList.remove('active'));
}

/** root altındaki her <pgn-player> için düzeltmeyi kurar (sonradan eklenenler dahil). Durdurma işlevi döndürür. */
export function watchVariationFix(root: Element) {
  const done = new WeakSet<Element>();
  const cleanups: Array<() => void> = [];
  const attach = (player: Player) => {
    if (done.has(player)) return;
    done.add(player);
    const observer = new MutationObserver(() => restore(player));
    observer.observe(player, { childList: true, subtree: true });
    const click = (event: Event) => onClick(player, event);
    player.addEventListener('click', click, true);
    cleanups.push(() => { observer.disconnect(); player.removeEventListener('click', click, true); });
  };
  const scan = (el: Element) => {
    if (el.matches('pgn-player')) attach(el as Player);
    el.querySelectorAll('pgn-player').forEach((p) => attach(p as Player));
  };
  scan(root);
  const discover = new MutationObserver((records) => {
    for (const record of records) record.addedNodes.forEach((n) => n.nodeType === Node.ELEMENT_NODE && scan(n as Element));
  });
  discover.observe(root, { childList: true, subtree: true });
  return () => { discover.disconnect(); cleanups.forEach((fn) => fn()); };
}
