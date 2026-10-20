// Markdown dosyasını paragraf bloklarına böler. Hamle metni paragrafı (`1. e4 …` ya da `{ … }` ile başlayan) bir yorumun
// içinde boş satır varsa (yorumda paragraf ayırmak için) açık `{` kapanana kadar bölünmez. Hem site (splitArticle) hem
// scripts/check-games.mjs bunu kullanır.
const MOVETEXT_START = /^\s*(\d+\s*\.|\{)/;
const open = (s) => (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;

export function splitChunks(md) {
  const parts = md.trim().split(/\n\s*\n/);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    let cur = parts[i];
    if (MOVETEXT_START.test(cur)) {
      while (open(cur) > 0 && i + 1 < parts.length) cur += `\n\n${parts[++i]}`;
    }
    out.push(cur);
  }
  return out;
}
