# Dünya Şampiyonası 2026 yazısının fotoğrafları

Yazıdaki kişi ve maç fotoğrafları Wikimedia Commons'tan (yalnızca serbest lisanslı: kamu malı, CC0, CC BY, CC BY-SA) gelir; künyede yazar ve lisans yazılır.

1. `python3 scripts/dunya-photos/download.py` : görselleri `raw/` altına indirir (Wikimedia hız sınırı koyarsa bekler; çok uzun sürebilir).
2. `python3 scripts/dunya-photos/build_images.py` : JPEG olarak `public/images/dunya-*.jpg` yazar ve künyeli `![…](…)` satırlarını `src/content/dunya-sampiyonasi.md` içine yerleştirir (art arda satırlar yan yana sıra olur, `FigureRow`).
3. `python3 scripts/optimize-images.py` : fotoğraf standardına getirir (kırpma, boyut, önizleme).

Hangi kişi/maç için hangi Commons dosyasının seçildiği `photos.py`'dedir; `persons.json`, `matchimgs.json`, `extra_info.json` Commons API yanıtlarının (boyut, lisans, yazar) önbelleğidir.
Resmî maç afişleri serbest lisanslı değildir; Commons'ta bulunamadı, bu yüzden yazıda afiş yoktur.
