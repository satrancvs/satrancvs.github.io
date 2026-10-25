// <pgn-player> yorumlarının sonundaki oynat düğmesini yorum metninin son satırına taşır (satır içi öğe gibi):
// satır sonunda yer varsa metnin hemen yanında, yoksa bir alt satırda durur. Düğme her adımda yeniden oluşturulduğu
// için taşıma, eklenen düğmeler izlenerek yapılır. Varyantlı yorumlarda en son varyantın son metin satırına girer.
const GAME = '.cp-game';

// Düğmenin gireceği yer: yorumun (varyant varsa en son varyantın) son metin öğesi.
function lastTextTarget(container: Element): Element {
  const last = container.lastElementChild;
  if (last?.matches('.variation-block')) return lastTextTarget(last.querySelector('.variation-content') ?? last);
  if (last?.matches('.variation-comment')) return last.lastElementChild ?? last;
  return container;
}

function move(btn: Element) {
  const comment = btn.parentElement;
  if (!comment?.classList.contains('video-comment') || !comment.closest(GAME)) return;
  // Sütunlu düzende oyun sonu tekrar düğmesi tahtanın yanına konur (site.css, left tanımlı): satıra taşınmaz.
  if (btn.classList.contains('cp-replay') && getComputedStyle(btn).left !== 'auto') return;
  const blocks = comment.querySelectorAll(':scope > .variation-block');
  const bodies = comment.querySelectorAll('.comment-body');
  const lastBlock = blocks[blocks.length - 1];
  const target = lastBlock ? lastTextTarget(lastBlock.querySelector('.variation-content') ?? lastBlock) : bodies[bodies.length - 1];
  if (!target) return;
  btn.classList.add('cp-inline');
  // Düğmeden önce sıradan bir boşluk: satır sonunda yer varsa metinle arasında boşluk kalır, bir alt satıra inerse
  // boşluk satır sonunda erir ve düğme metinle aynı sol kenardan başlar (margin kullanılırsa girinti kalırdı).
  target.append(document.createTextNode(' '), btn);
}

export function watchInlinePlay(root: Element) {
  const scan = (el: Element) => {
    if (el.matches('.comment-play-btn')) move(el);
    el.querySelectorAll('.video-comment > .comment-play-btn').forEach(move);
  };
  scan(root);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((n) => n.nodeType === Node.ELEMENT_NODE && scan(n as Element));
    }
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
