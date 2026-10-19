#!/usr/bin/env python3
"""public/images/*.jpg dosyalarını fotoğraf standardına getirir ve önizlemeleri (image-meta.json) yeniler.

Standart (ayrıntı ve sayılar: scripts/imgstd.py; gösterim ProgressiveImage.tsx'te):
  - yatay  (h): 3:2, gösterim 600 x 400, dosya en fazla 1200 x 800
  - dikey  (v): 2:3, gösterim 400 x 600, dosya en fazla  800 x 1200
  - küçük  (s): 2:3, gösterim 240 x 360, dosya en fazla  480 x 720 (kitap kapağı, düşük çözünürlüklü dikey fotoğraf)
  Dosya standart orana KIRPILIR (varsayılan merkezden; tutulacak yer için scripts/image-focus.json), gerekirse küçültülür,
  asla büyütülmez. Standarda zaten uyan dosyaya dokunulmaz (her çalıştırmada yeniden sıkıştırıp kaliteyi düşürmemek için).
  JPEG kalite 82, progressive. Dosya boyutu hedefi: 300 KB altı (aşanlar uyarıyla listelenir).

Kullanım:
  python3 scripts/optimize-images.py          # uygular, sonra image-placeholders.py'yi çalıştırır
  python3 scripts/optimize-images.py --check  # yalnızca raporlar; standarda uymayan dosya varsa 1 ile çıkar
Pillow gerekir.
"""
import glob, json, os, subprocess, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import imgstd

ROOT = os.path.join(os.path.dirname(__file__), '..')
QUALITY = 82
BUDGET_KB = 300
FOCUS = json.load(open(os.path.join(os.path.dirname(__file__), 'image-focus.json')))


def main():
    check = '--check' in sys.argv
    changed, bad = 0, 0
    rows = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'public/images/*.jpg'))):
        name = os.path.basename(f)
        im = Image.open(f).convert('RGB')
        w, h = im.size
        kb = os.path.getsize(f) / 1024
        kind, err = imgstd.classify(name, w, h)
        note = ''
        if err:
            bad += 1
            note = 'HATA: ' + err
        elif not imgstd.is_standard(kind, w, h):
            bad += 1
            tw, th = imgstd.target_size(kind, w, h)
            if check:
                note = f'-> {kind} {tw}x{th} olmalı'
            else:
                cw, ch = imgstd.crop_size(w, h, imgstd.RATIO[kind])
                fx, fy = FOCUS.get(name, [0.5, 0.5])
                left = round((w - cw) * fx)
                top = round((h - ch) * fy)
                out = im.crop((left, top, left + cw, top + ch)).resize((tw, th), Image.LANCZOS)
                out.save(f, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
                changed += 1
                note = f'-> {kind} {tw}x{th}'
        else:
            note = kind
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
    print(f'\n{changed} dosya standarda getirildi.')
    subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'image-placeholders.py')], check=True)


if __name__ == '__main__':
    main()
