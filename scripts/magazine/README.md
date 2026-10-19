# Dijital dergi (PDF)

`magazine/satranc-vs-ekim-2026.pdf`, `articles.json` + `src/content/*.md` dosyalarından üretilir: `build.mjs` HTML'i oluşturur, `print.mjs` Chromium (Playwright) ile PDF'e basar, `make.sh` içindekiler sayfa numaraları için iki geçiş yapar.
Gerekenler: `chess.js`, `marked`, `playwright`; ayrıca çalışma klasöründe `local.css` (Fraunces/Manrope/JetBrains Mono `@font-face`, yerel .ttf), `img/` (fotoğrafların siyah-beyaza çevrilmiş kopyaları + `cover-bg.jpg`) ve `pieces/*.b64` (`public/chesspublica/pieces` PNG'lerinin base64'ü).
Oyunlar (oynatıcı dahil) metin olarak basılır; `[D]` ve `[P]` işaretleri diyagram olur, oynatıcı kopyaları (`[View "player"]`, hamle metni yazıda zaten var) tekrar basılmaz.
