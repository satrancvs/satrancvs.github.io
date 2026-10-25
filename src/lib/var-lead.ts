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
    if (before) box.insertBefore(lead, before);
    else box.append(lead);
  }
  // Yorum satırında görünür metin kalmadıysa (yalnızca varyant başı yorumlarından oluşuyordu) satır kaldırılır.
  if (!line.textContent?.replace(/\s+/g, '')) line.remove();
}

export function watchVarLead(root: Element) {
  const scan = (el: Element) => {
    if (el.matches('.video-comment')) process(el);
    el.querySelectorAll('.video-comment').forEach(process);
    const parent = el.closest('.video-comment');
    if (parent && parent.closest(GAME)) process(parent);
  };
  scan(root);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((n) => n.nodeType === Node.ELEMENT_NODE && scan(n as Element));
      if (record.type === 'characterData') {
        const parent = (record.target as Node).parentElement?.closest('.video-comment');
        if (parent) process(parent);
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
