#!/usr/bin/env python3
"""public/images/*.jpg için boyut + küçük bulanık yer tutucu (LQIP) üretir -> src/data/image-meta.json.

Yeni fotoğraf eklenince çalıştırın:  python3 scripts/image-placeholders.py  (Pillow gerekir)
"""
import base64, glob, io, json, os, sys
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import imgstd

root = os.path.join(os.path.dirname(__file__), '..')
meta = {}
color_files = set(json.load(open(os.path.join(os.path.dirname(__file__), 'image-color.json')))['colors'])  # renkli gösterilecekler
for f in sorted(glob.glob(os.path.join(root, 'public/images/*.jpg'))):
    im = Image.open(f).convert('RGB')
    w, h = im.size
    tiny = im.resize((24, max(1, round(24 * h / w))), Image.LANCZOS)
    buf = io.BytesIO()
    tiny.save(buf, 'JPEG', quality=45, optimize=True)
    kind, _ = imgstd.classify(os.path.basename(f), w, h)  # h yatay, v dikey, s küçük (scripts/imgstd.py)
    meta['images/' + os.path.basename(f)] = {
        'w': w, 'h': h, 'kind': kind, **({'color': True} if os.path.basename(f) in color_files else {}), 'lqip': 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode(),
    }
out = os.path.join(root, 'src/data/image-meta.json')
with open(out, 'w') as fh:
    json.dump(meta, fh, indent=1, ensure_ascii=False)
    fh.write('\n')
print(f'{len(meta)} görsel -> {os.path.relpath(out, root)}')
