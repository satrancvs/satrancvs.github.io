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
}

function refresh(box: Element) {
  process(box);
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
