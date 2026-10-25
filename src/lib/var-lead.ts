// `( { Steinitz'e göre } 33... g5 … )`: varyantın başındaki yorum ChessPublica tarafından silinir, bu yüzden ArticleBody.tsx (hoistVariationLeads)
// onu önündeki hamlenin yorumuna taşır ve <pgn-player> için işaretler ( sıra  metin ). Üç sütunlu düzende o yorum satırı
// tahtanın soluna gider; varyantın başındaki yorum ise varyantla birlikte, sağ sütunda kalmalıdır. Bu izleyici işaretli metni yorum satırından
// çıkarıp ilgili varyant bloğunun hemen önüne koyar (`.cp-var-lead`). Oynatıcı yorum kutusunu her adımda yeniden kurduğu için eklenen öğeler izlenir.
const START = '';
const MID = '';
const END = '';
const GAME = '.cp-game';

function textNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text);
  return out;
}

function process(box: Element) {
  const line = box.querySelector(':scope > .comment-line');
  if (!line || !line.textContent?.includes(START)) return;
  for (let guard = 0; guard < 20; guard++) {
    const nodes = textNodes(line);
    const startNode = nodes.find((n) => n.data.includes(START));
    if (!startNode) break;
    const startAt = startNode.data.indexOf(START);
    let endNode: Text | undefined;
    let endAt = -1;
    for (const n of nodes.slice(nodes.indexOf(startNode))) {
      const from = n === startNode ? startAt : 0;
      const at = n.data.indexOf(END, from);
      if (at >= 0) { endNode = n; endAt = at; break; }
    }
    if (!endNode) break;
    const range = document.createRange();
    range.setStart(startNode, startAt);
    range.setEnd(endNode, endAt + 1);
    const fragment = range.extractContents();
    const lead = document.createElement('div');
    lead.className = 'cp-var-lead';
    lead.append(fragment);
    // Başa " sıra " gelir; sıra, bu yorumun hangi varyant bloğuna ait olduğunu söyler.
    const first = textNodes(lead)[0];
    const head = first?.data.match(new RegExp(`^${START}(\\d+)${MID}`));
    const k = head ? Number(head[1]) : 0;
    if (first && head) first.data = first.data.slice(head[0].length);
    const last = textNodes(lead).pop();
    if (last) last.data = last.data.replace(END, '');
    box.querySelectorAll(`:scope > .cp-var-lead[data-k="${k}"]`).forEach((old) => old.remove());
    lead.dataset.k = String(k);
    const blocks = box.querySelectorAll(':scope > .variation-block');
    const before = blocks[k] ?? null;
    // Cümle varyantın ilk hamlesinin ardından sürüyorsa (`{ …görünen} 21... Ne7 { fikrini öneriyor.}`) giriş, hamle ve devamı tek satırda akar:
    // giriş varyant satırının başına satır içi eklenir, ilk hamlenin yorumu satır içi çizilir (.cp-lead-inline).
    const content = before?.querySelector('.variation-content');
    if (before && content && content.querySelector(':scope > .variation-comment[data-for-mi="0"]')) {
      const span = document.createElement('span');
      span.className = 'cp-var-lead-inline';
      span.append(...Array.from(lead.childNodes), ' ');
      content.querySelectorAll(':scope > .cp-var-lead-inline').forEach((old) => old.remove());
      content.prepend(span);
      before.classList.add('cp-lead-inline');
    } else if (before) box.insertBefore(lead, before);
    else box.append(lead);
  }
  // Yorum satırında görünür metin kalmadıysa (yalnızca varyant başı yorumlarından oluşuyordu) satır kaldırılır.
  if (!line.textContent?.replace(/\s+/g, '')) line.remove();
}

// Eskiden üç sütunlu düzende sol yorum tahtadan uzunsa kutuya dolgu/min-height eklenirdi; artık sol yorum kendi içinde kayıyor (site.css), bu yüzden eski satır içi değerler yalnızca temizlenir.
function reserve(box: Element) {
  const el = box as HTMLElement;
  if (el.style.paddingBottom) el.style.paddingBottom = '';
  if (el.style.minHeight) el.style.minHeight = '';
}

// Sol sütundaki yorum satırında: tek satırlık yorum sağa yaslanır (.cp-one-line), oynat düğmesi metinden ayrı kendi satırına düştüyse sağa yaslanır
// (.cp-btn-alone). Ölçüm sınıflar kaldırılmışken yapılır, sonuç aynıysa sınıflara dokunulmaz (boyut gözlemcisiyle döngü olmasın).
function classify(box: Element) {
  const line = box.querySelector<HTMLElement>(':scope > .comment-line');
  if (!line) return;
  const classes = ['cp-one-line', 'cp-btn-alone'];
  const had = classes.filter((c) => line.classList.contains(c));
  const active = getComputedStyle(line).position === 'absolute' && getComputedStyle(line).display !== 'none';
  let alone = false;
  let oneLine = false;
  if (active) {
    had.forEach((c) => line.classList.remove(c));
    const btn = line.querySelector<HTMLElement>('.comment-play-btn');
    const tops = new Set<number>();
    let bottom = 0;
    for (const node of textNodes(line.querySelector('.comment-text-block') ?? line)) {
      if (!node.data.trim() || btn?.contains(node)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of Array.from(range.getClientRects())) {
        if (!r.width) continue;
        tops.add(Math.round(r.top / 4));
        bottom = Math.max(bottom, r.bottom);
      }
    }
    alone = !!btn && tops.size > 0 && btn.getBoundingClientRect().top >= bottom - 2;
    oneLine = tops.size === 1 && !alone;
  }
  const want = [oneLine, alone];
  classes.forEach((c, k) => { if (line.classList.contains(c) !== want[k]) line.classList.toggle(c, want[k]); });
}

// Varyantın ilk hamlesinden sonraki yorum küçük harfle başlıyorsa (`23... Rd8 { ile savunmak …}`) hamlenin cümlesini sürdürür: satır içi akar (.cp-lead-inline).
function inlineContinuations(box: Element) {
  box.querySelectorAll('.variation-block').forEach((block) => {
    const first = block.querySelector(':scope > .variation-content > .variation-comment[data-for-mi="0"]');
    if (first && /^\p{Ll}/u.test(first.textContent?.trim() ?? '')) block.classList.add('cp-lead-inline');
  });
  // Cümleyi hamlenin ötesinde sürdüren yorumlar satır içi akar: küçük harfle başlayan (hamlenin cümlesini sürdürür) ya da noktalama ile bitmeyen
  // (`… ya da` 34. fxg5 Nxg5 `hamlelerinden sonra …`: cümle sonraki hamleyle sürer) varyant yorumları.
  box.querySelectorAll('.variation-block .variation-comment').forEach((c) => {
    const t = c.textContent?.trim() ?? '';
    if (!t) return;
    const inline = /^\p{Ll}/u.test(t) || !/[.!?…:;”"’)\]]$/.test(t);
    if (c.classList.contains('cp-inline-c') !== inline) c.classList.toggle('cp-inline-c', inline);
  });
}

// Üç sütunlu düzende (kutu position: static) sağ sütuna çok içerik düşerse varyant blokları (başlarındaki .cp-var-lead ile) iki sütuna paylaştırılır: ilk k blok
// sol sütundaki `.cp-left-stack` kutusuna taşınır (ana yorum varsa solda zaten durur). Karar yazı uzunluğuna göre verilir (yerleşimden bağımsız, kararlı).
const BALANCE_MIN = 280;
const topBlocks = (box: Element) => Array.from(box.querySelectorAll('.variation-block')).filter((b) => !b.parentElement?.closest('.variation-block'));
const groupOf = (block: Element) => {
  const lead = block.previousElementSibling;
  return lead?.classList.contains('cp-var-lead') ? [lead, block] : [block];
};
const weight = (els: Element[]) => els.reduce((n, e) => n + (e.textContent?.length ?? 0), 0);

function balance(box: Element) {
  const el = box as HTMLElement;
  if (!el.closest('pgn-player') || getComputedStyle(el).position !== 'static') return;
  let blocks = topBlocks(box);
  // Tek bir üst düzey blok (içinde iç varyantlarıyla) bölünemez: iç varyantlar bloğun hemen ardına, kutuya alınır; ana varyant solda, iç varyantlar sağda kalabilir.
  if (blocks.length === 1) {
    const nested = Array.from(blocks[0].querySelectorAll('.variation-block')).filter((n) => n.parentElement?.closest('.variation-block') === blocks[0]);
    if (nested.length && (blocks[0].textContent?.length ?? 0) > BALANCE_MIN) {
      const host = blocks[0].parentElement as Element;
      let ref = blocks[0].nextSibling;
      nested.forEach((n) => host.insertBefore(n, ref));
      blocks = topBlocks(box);
    }
  }
  const stack = box.querySelector<HTMLElement>(':scope > .cp-left-stack');
  const current = stack ? stack.querySelectorAll(':scope > .variation-block').length : 0;
  if (blocks.length < 2) return;
  const sizes = blocks.map((b) => weight(groupOf(b)));
  const line = weight(Array.from(box.querySelectorAll(':scope > .comment-line')));
  const total = line + sizes.reduce((a, b) => a + b, 0);
  let want = 0;
  if (total > BALANCE_MIN) {
    let best = Infinity;
    for (let k = 0; k < blocks.length; k++) {
      const left = line + sizes.slice(0, k).reduce((a, b) => a + b, 0);
      const diff = Math.abs(left - (total - left));
      if (diff < best) { best = diff; want = k; }
    }
  }
  if (want === current) return;
  const groups = blocks.map(groupOf);
  const anchor = box.querySelector(':scope > .comment-play-btn');
  groups.forEach((g) => g.forEach((n) => (anchor ? box.insertBefore(n, anchor) : box.append(n))));
  stack?.remove();
  if (want > 0) {
    const next = document.createElement('div');
    next.className = 'cp-left-stack';
    groups.slice(0, want).forEach((g) => g.forEach((n) => next.append(n)));
    const line0 = box.querySelector(':scope > .comment-line');
    if (line0) line0.after(next); else box.prepend(next);
  }
}

// Bölünemeyen tek bir varyant bloğu (iç varyantı yok) sütunlara iki sütunlu metin olarak yayılır (.cp-split): blok tahtanın iki yanına uzanan iki sütunlu bir kutu olur,
// tarayıcı sütunları dengeler; ana yorum varsa onun altında sol sütunun başında durur. Tahtanın bulunduğu orta boşluk sütun aralığıdır. Yerleşim ölçülür: yorum + blok tahtanın
// ortasına dikeyde ortalanır (`--cp-ltop`, `--cp-btop`).
const SPLIT_MAX = 900;
function split(box: Element) {
  const el = box as HTMLElement;
  const off = () => {
    if (el.classList.contains('cp-split')) {
      el.classList.remove('cp-split');
      el.style.removeProperty('--cp-ltop');
      el.style.removeProperty('--cp-btop');
    }
  };
  const player = el.closest('pgn-player');
  if (!player || getComputedStyle(el).position !== 'static') return off();
  const blocks = topBlocks(box);
  const line = el.querySelector<HTMLElement>(':scope > .comment-line');
  const lineChars = line ? weight([line]) : 0;
  const chars = blocks.length === 1 ? weight([blocks[0]]) : 0;
  if (blocks.length !== 1 || blocks[0].parentElement !== box || box.querySelector(':scope > .cp-var-lead') || chars + lineChars <= BALANCE_MIN || chars + lineChars > SPLIT_MAX) return off();
  if (!el.classList.contains('cp-split')) el.classList.add('cp-split');
  const wrap = player.querySelector<HTMLElement>('.board-wrap');
  if (!wrap) return;
  const visibleLine = line && getComputedStyle(line).display !== 'none' ? line : null;
  const gap = 12;
  const hl = visibleLine ? visibleLine.offsetHeight : 0;
  const hb = (blocks[0] as HTMLElement).offsetHeight;
  const total = (hl ? hl + gap : 0) + hb;
  const start = Math.max(0, wrap.offsetHeight / 2 - total / 2);
  el.style.setProperty('--cp-ltop', `${Math.round(start)}px`);
  el.style.setProperty('--cp-btop', `${Math.round(start + (hl ? hl + gap : 0))}px`);
}

// Üç sütunlu düzende sol yorumdaki alıntı kutusu (`> metin` → <blockquote>) sağ sütuna taşınır (`.cp-quote-right`, varyantların önünde); giriş cümleleri solda kalır.
function moveQuotes(box: Element) {
  const el = box as HTMLElement;
  const line = box.querySelector(':scope > .comment-line');
  if (!line || getComputedStyle(el).position !== 'static') return;
  const quotes = Array.from(line.querySelectorAll('blockquote'));
  if (!quotes.length) return;
  let host = box.querySelector(':scope > .cp-quote-right');
  if (!host) {
    host = document.createElement('div');
    host.className = 'cp-quote-right';
    line.after(host);
  }
  quotes.forEach((q) => (host as Element).append(q));
  // Alıntıdan arta kalan satır sonları (<br>) temizlenir.
  line.querySelectorAll('.comment-body').forEach((body) => {
    while (body.lastChild && (body.lastChild.nodeName === 'BR' || (body.lastChild.nodeType === 3 && !body.lastChild.textContent?.trim()))) body.lastChild.remove();
  });
}

function refresh(box: Element) {
  process(box);
  moveQuotes(box);
  balance(box);
  split(box);
  inlineContinuations(box);
  reserve(box);
  classify(box);
}

export function watchVarLead(root: Element) {
  const scan = (el: Element) => {
    if (el.matches('.video-comment')) refresh(el);
    el.querySelectorAll('.video-comment').forEach(refresh);
    const parent = el.closest('.video-comment');
    if (parent && parent.closest(GAME)) refresh(parent);
  };
  scan(root);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((n) => n.nodeType === Node.ELEMENT_NODE && scan(n as Element));
      // Yalnızca kutunun kendi sınıfı (cp-in-variation) izlenir; .comment-line sınıflarını biz değiştiriyoruz, izlenirse sonsuz döngü olur.
      if (record.type === 'attributes' && (record.target as Element).matches('.video-comment')) refresh(record.target as Element);
      if (record.type === 'characterData') {
        const parent = (record.target as Node).parentElement?.closest('.video-comment');
        if (parent) refresh(parent);
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
