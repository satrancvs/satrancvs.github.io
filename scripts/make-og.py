#!/usr/bin/env python3
"""Paylaşım önizlemesi için kare (200 × 200: WhatsApp/Facebook görsel 300 px ve üstündeyse büyük kart çizer, küçük yatay kart için altında kalmalı) görseller: scripts/og-images.json -> public/og/<id>.jpg.
Fotoğraflar sitedeki gibi gri tonlu (scripts/image-color.json'dakiler renkli kalır)."""
import json, os
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = json.load(open(os.path.join(ROOT, 'scripts/og-images.json'), encoding='utf-8'))
color = set(json.load(open(os.path.join(ROOT, 'scripts/image-color.json'), encoding='utf-8')).get('colors', []))
out = os.path.join(ROOT, 'public/og'); os.makedirs(out, exist_ok=True)
for aid, v in cfg.items():
    if aid == '_': continue
    name, fx, fy = v
    im = Image.open(os.path.join(ROOT, 'public/images', name)).convert('RGB')
    w, h = im.size; s = min(w, h)
    x = round((w - s) * fx); y = round((h - s) * fy)
    im = im.crop((x, y, x + s, y + s)).resize((min(200, s), min(200, s)), Image.LANCZOS)
    if name not in color: im = ImageOps.grayscale(im).convert('RGB')
    im.save(os.path.join(out, aid + '.jpg'), quality=85, optimize=True)
    print(aid, name, im.size)
