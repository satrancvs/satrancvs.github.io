// Yorum metnindeki hamle dizilerini ("Beyaz 2. ♘c3 oynarsa hemen 2… ♗b4 oynayacaktım, devamında 3. ♘d5 ♗e7 4. d4 d6") bulur ve
// yorumun bağlı olduğu konumdan oynar. İki yerde kullanılır: study-fix.ts (hamleleri tıklanabilir yapar) ve scripts/check-games.mjs
// (derleme sırasında bu hamlelerin oynanabilir olduğunu doğrular). Chess sınıfı dışarıdan verilir (tarayıcıda paketin chess.js'i,
// derlemede npm paketi).
//
// Kurallar: bir satır sayı işaretiyle başlar ("12." / "12…" / "12..."); işaretten sonraki hamle, yorumun bağlı olduğu hamleden
// sonraki ya da önceki konumdan, ya da aynı yorumda daha önce oynanmış bir konumdan (bir alternatifin başlangıcı) oynanabilmelidir.
// İşaret, satırın sıradaki hamlesiyse ("… ♗e7 4. d4") satır araya düz yazı girse de sürer; hamleler arasında yalnızca boşluk olur.
const FIGURINE = { '♔': 'K', '♕': 'Q', '♖': 'R', '♗': 'B', '♘': 'N' };
const SAN = '(?:[♔♕♖♗♘KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN♕♖♗♘])?|O-O-O|O-O)[+#]?';
const TOKEN = new RegExp(`(\\d+)(\\.{3}|\\.|…)|(${SAN})(?![\\p{L}\\d])`, 'gu');
const GAP = /^[\s ⁠]*$/;
const toSan = (t) => t.replace(/[♔♕♖♗♘]/g, (c) => FIGURINE[c]);
const turnOf = (fen) => fen.split(' ')[1];
const fullmove = (fen) => Number(fen.split(' ')[5]);

export class ProseLinker {
  /** @param {new (fen?: string) => any} Chess  @param {string[]} bases yorumun bağlı olduğu hamleden sonraki ve önceki konum (FEN) */
  constructor(Chess, bases) {
    this.Chess = Chess;
    this.visited = bases.filter(Boolean); // satırların başlayabileceği konumlar; oynanan her hamle bir tane ekler
    this.run = null;
    this.candidates = [];
    this.armed = false; // sıradaki hamle metni bir sayı işaretinden ya da bağlanan hamleden hemen sonra mı geliyor
    this.runs = 0;
    this.step = 0;
    this.runId = -1;
  }

  #play(game, san) {
    try { return game.move(san, { sloppy: true, strict: false }) || null; } catch { return null; }
  }

  /**
   * Bir metin parçasını tarar; { moves: bağlanan hamleler, failed: sayıdan sonra gelen ama oynanamayan hamleler } döndürür.
   * Durum parçalar arasında sürer. Bir satırın başlayabileceği birden çok konum varsa, satırın devamını en uzun oynayabilen konum seçilir.
   */
  scan(text) {
    return this.#loop(text, [...text.matchAll(TOKEN)], 0, -1, false);
  }

  // `lookahead`: aday konum denemesi; satır kopunca durur (yeni satır aramaz).
  #loop(text, all, from, markEnd0, lookahead) {
    const moves = [];
    const failed = [];
    let lastEnd = -1;
    let markEnd = markEnd0;
    for (let k = from; k < all.length; k++) {
      const m = all[k];
      const index = m.index ?? 0;
      const end = index + m[0].length;
      if (m[1] !== undefined) {
        const no = Number(m[1]);
        const black = m[2] !== '.';
        const continues = this.run && (turnOf(this.run.fen()) === 'b') === black && no === fullmove(this.run.fen());
        if (!continues) {
          if (lookahead) break;
          this.run = null;
          this.candidates = this.visited.filter((f) => (turnOf(f) === 'b') === black && fullmove(f) === no);
        }
        this.armed = !!this.run || this.candidates.length > 0;
        markEnd = end;
        continue;
      }
      if (!this.armed) continue;
      const since = lastEnd > markEnd ? lastEnd : markEnd;
      if (since < 0 || !GAP.test(text.slice(since, index))) { if (lookahead) break; this.armed = false; continue; }
      let res = null;
      if (!this.run) {
        let best = null;
        for (const f of this.candidates) {
          const g = new this.Chess(f);
          const first = this.#play(g, toSan(m[3]));
          if (!first) continue;
          // Bu konumdan satır ne kadar sürer? (ilk hamle zaten oynandı)
          const probe = new ProseLinker(this.Chess, []);
          probe.run = g;
          probe.armed = true;
          const len = 1 + probe.#loop(text, all, k + 1, end, true).moves.length;
          if (!best || len > best.len) best = { len, f, first };
        }
        this.candidates = [];
        if (best) {
          // Seçilen konumu yeniden kur (probe oynamıştı).
          const g = new this.Chess(best.f);
          res = this.#play(g, toSan(m[3]));
          this.run = g;
          this.runId = this.runs++;
          this.step = 0;
        }
      } else {
        res = this.#play(this.run, toSan(m[3]));
      }
      if (!res || !this.run) { failed.push({ index, text: m[3] }); this.run = null; this.armed = false; if (lookahead) break; continue; }
      const fen = this.run.fen();
      if (!lookahead) this.visited.push(fen);
      moves.push({ index, end, text: m[3], fen, from: res.from, to: res.to, run: this.runId, step: this.step++ });
      lastEnd = end;
    }
    return { moves, failed };
  }
}
