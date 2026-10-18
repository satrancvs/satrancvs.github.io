#!/usr/bin/env python3
"""public/images/*.jpg dosyalarını fotoğraf standardına getirir ve önizlemeleri (image-meta.json) yeniler.

Standart (docs yok, kural burada; ProgressiveImage.tsx'teki gösterim kutusunun 2 katı = retina):
  - Fotoğraf: 1200 x 1440 px kutusuna sığar (gösterim kutusu 600 x 720 px). Yatay 3:2 -> 1200 x 800, dikey 2:3 -> 960 x 1440.
  - Kitap kapağı (dosya adında `adventurous-way` veya `chess-for-zebras`): 480 x 720 px kutusuna sığar (gösterim 240 x 360 px).
  - Oran korunur, kırpılmaz, asla büyütülmez. Kutuyu %3'ten fazla aşan dosya küçültülüp JPEG kalite 82, progressive, EXIF'siz
    yeniden kodlanır; kutuya sığan dosyalara dokunulmaz (her çalıştırmada yeniden sıkıştırıp kaliteyi düşürmemek için).
  - Dosya boyutu hedefi: 300 KB altı (aşanlar uyarıyla listelenir).

Kullanım:
  python3 scripts/optimize-images.py          # uygular, sonra image-placeholders.py'yi çalıştırır
  python3 scripts/optimize-images.py --check  # yalnızca raporlar; standarda uymayan dosya varsa 1 ile çıkar
Pillow gerekir.
"""
import glob, os, re, subprocess, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
PHOTO_BOX = (1200, 1440)
COVER_BOX = (480, 720)
TOLERANCE = 1.03
QUALITY = 82
BUDGET_KB = 300
COVER = re.compile(r'adventurous-way|chess-for-zebras')


def box_for(name):
    return COVER_BOX if COVER.search(name) else PHOTO_BOX


def main():
    check = '--check' in sys.argv
    changed, bad = 0, 0
    rows = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'public/images/*.jpg'))):
        name = os.path.basename(f)
        bw, bh = box_for(name)
        im = Image.open(f).convert('RGB')
        w, h = im.size
        kb = os.path.getsize(f) / 1024
        too_big = w > bw * TOLERANCE or h > bh * TOLERANCE
        note = ''
        if too_big:
            bad += 1
            scale = min(bw / w, bh / h)
            nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
            if check:
                note = f'-> {nw}x{nh} olmalı'
            else:
                im.resize((nw, nh), Image.LANCZOS).save(f, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
                changed += 1
                note = f'-> {nw}x{nh}'
        after = os.path.getsize(f) / 1024
        if after > BUDGET_KB:
            note += f'  UYARI: {after:.0f} KB > {BUDGET_KB} KB'
        rows.append((name, f'{w}x{h}', f'{kb:.0f} KB', note))
    width = max(len(r[0]) for r in rows)
    for name, size, kb, note in rows:
        print(f'{name:<{width}}  {size:>10}  {kb:>7}  {note}')
    if check:
        print(f'\n{bad} dosya standarda uymuyor.' if bad else '\nTüm dosyalar standarda uyuyor.')
        sys.exit(1 if bad else 0)
    print(f'\n{changed} dosya yeniden boyutlandırıldı.')
    subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'image-placeholders.py')], check=True)


if __name__ == '__main__':
    main()
