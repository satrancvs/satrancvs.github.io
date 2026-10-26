# Satranç vs.

[satrancvs.com](https://satrancvs.com) adresinde yayınlanan bağımsız Türkçe dijital satranç dergisi. Satranç tarihi yazıları, turnuva günlükleri, analizli oyunlar, açılış dosyaları, literatür incelemeleri, özel dosyalar, söyleşiler ve “Satranç dersleri” köşesi.

Site React + Vite + Tailwind ile yazılmıştır ve `main` dalından GitHub Pages'e yayınlanır. Satranç tahtaları ve oyun oynatıcıları [ChessPublica](https://chesspublica.github.io/) ile çizilir (`public/chesspublica/` altında yamalanmış yerel bir kopyası var).

## Başlarken

Node.js 20+ ve [pnpm](https://pnpm.io/) gerekir.

```sh
pnpm install
pnpm dev              # geliştirme sunucusu (varsayılan: http://localhost:3000)
pnpm build            # önce oyunları denetler, sonra dist/ klasörünü üretir
pnpm preview          # derlenmiş siteyi http://localhost:4173 adresinde sunar
```

## Denetimler

| Komut | Ne yapar |
|---|---|
| `pnpm check:games` | `src/content/` altındaki bütün satranç oyunlarını (ana hat, varyantlar, yorumlar) denetler. Geçersiz hamle, kapanmayan `{ }` / `( )` ya da ChessPublica'nın sessizce silebileceği metin varsa hata verir. `pnpm build` ve `pnpm test` bunu zaten çalıştırır. |
| `pnpm test` | Birim testleri (`tests/`). |
| `pnpm check:render` | Yayınlanmış her sayfayı gerçek bir tarayıcıda açar ve oyun hatası arar. Önce `pnpm build && pnpm preview` çalışıyor olmalı. Chromium yolunu `CHROMIUM_PATH` ile verebilirsiniz. |
| `pnpm lint` | ESLint. |

Bir oyun eklerken ya da düzenlerken izlenecek kurallar `CLAUDE.md` içinde, ChessPublica'nın bilinen tuhaflıkları `docs/chesspublica-quirks.md` içinde anlatılıyor; satranç gösterimine dokunmadan önce ikisini de okuyun.

## Proje yapısı

```
src/
  data/articles.json        Yazı üst bilgileri (başlık, yazar, köşe, adres, …)
  data/articles.ts          Yazıları yükler, liste sırası (LIST_ORDER)
  content/*.md              Yazı gövdeleri (Markdown + PGN oyunları)
  content/satranca-ilk-adim/  “Satranca ilk adım” kitabının bölümleri
  pages/                    Ana sayfa (Index), yazı sayfası (Post), 404 vb.
  components/               ArticleBody (yazı/oyun çizimi), FenDiagram, NewsletterForm, …
  components/ui/            shadcn/ui bileşenleri
  lib/                      Tipografi (curly), ChessPublica yardımcıları, analitik, …
  site.css                  Sitenin asıl stilleri (tema değişkenleri, diyagramlar, oynatıcılar)
public/
  images/                   Yazı fotoğrafları
  chesspublica/             Yamalanmış ChessPublica paketi
  fonts/                    Satranç sembolleri için yazı tipi alt kümeleri
  newsletter/               Bülten e-postasının görselleri
scripts/                    Oyun ve görsel denetim/iyileştirme betikleri
docs/                       Teknik notlar
```

## Yeni yazı eklemek

1. `src/data/articles.json` dosyasına bir kayıt ekleyin (`id`, `slug`, `title`, `author` ve `date` zorunlu; `date` sayı dönemidir, örn. “Ekim–Kasım–Aralık 2026”; köşe için `cat`).
2. Gövdeyi `src/content/<ad>.md` olarak yazın.
3. `src/data/articles.ts` içindeki `CHUNKS` tablosuna `id` ile kaydedin.
4. “Tüm yazılar” listesindeki yerini `LIST_ORDER` ile belirleyin.
5. Fotoğraf eklediyseniz `public/images/` altına koyup `python3 scripts/optimize-images.py` çalıştırın (Pillow gerekir); fotoğrafı sitenin üç standart kutusundan birine uydurur.
6. `pnpm build && pnpm preview`, ardından `pnpm check:render` ile sayfayı denetleyin.

Ayrıntılar (yazarlar, köşeler, adres değişikliği, taslak/gizli yazı, alıntı ve diyagram söz dizimi, vurgu işareti vb.) `CLAUDE.md` içinde.

## Yayın

`main` dalına yapılan her gönderim `.github/workflows/deploy.yml` ile derlenir ve GitHub Pages'e yayınlanır. İş akışı sırasıyla `pnpm check:games`, `pnpm test` ve `pnpm build` çalıştırır; biri başarısız olursa yayın yapılmaz.

## Bülten

Ana sayfadaki abonelik formu (`src/components/NewsletterForm.tsx`) e-postayı Sender'ın herkese açık form adresine gönderir. Çift onay (double opt-in) Sender panelinden ayarlanır. Bülten e-postalarının görselleri `public/newsletter/` altında durur ve e-postalar bu dosyaları `https://satrancvs.com/newsletter/…` adresinden çağırır, bu yüzden dosya adlarını değiştirmeyin.

## Lisanslar

Yazıların telif hakkı yazarlarına aittir; ayrıntı sitenin “Hakkında” bölümünde. Kullanılan üçüncü taraf yazılım ve yazı tipi alt kümelerinin lisansları `public/chesspublica/LICENSES.txt` içindedir.
