"""Fotoğraf boyut standardı (ortak): optimize-images.py ve image-placeholders.py kullanır.

Üç gösterim kutusu (ProgressiveImage.tsx ile aynı), dosyalar 2x (retina) üretilir:
  h  yatay      3:2  gösterim 600 x 400 px   dosya en fazla 1200 x 800
  v  dikey      2:3  gösterim 400 x 600 px   dosya en fazla  800 x 1200
  s  küçük      2:3  gösterim 240 x 360 px   dosya en fazla  480 x 720   (kitap kapağı ve düşük çözünürlüklü dikey fotoğraf)
Sınıf dosyanın kendisinden belirlenir: kapak adı -> s; yatay -> h; dikey -> v, ama 2:3'e kırpılmış hâli gösterim kutusunun 1,5 katını
(600 x 900) karşılamıyorsa s. Düşük çözünürlüklü YATAY fotoğraf desteklenmez (en az 900 x 600 kırpılabilir alan gerekir).
"""
import re

COVER = re.compile(r'adventurous-way|chess-for-zebras')
RATIO = {'h': 3 / 2, 'v': 2 / 3, 's': 2 / 3}
DISPLAY = {'h': (600, 400), 'v': (400, 600), 's': (240, 360)}
MAX_FILE = {'h': (1200, 800), 'v': (800, 1200), 's': (480, 720)}
MIN_NATIVE = 1.5  # kırpılmış alan gösterim kutusunun en az bu katı olmalı (h ve v için)


def crop_size(w, h, ratio):
    """Verilen oranda (genişlik/yükseklik) alınabilecek en büyük kırpma."""
    cw = min(w, h * ratio)
    return round(cw), round(cw / ratio)


def classify(name, w, h):
    """-> (sınıf, hata veya None)"""
    if COVER.search(name):
        return 's', None
    if w >= h:
        cw, ch = crop_size(w, h, RATIO['h'])
        need = DISPLAY['h']
        err = None if cw >= need[0] * MIN_NATIVE and ch >= need[1] * MIN_NATIVE else f'yatay fotoğraf çok küçük ({cw}x{ch} kırpılabilir; en az {int(need[0]*MIN_NATIVE)}x{int(need[1]*MIN_NATIVE)} gerekir)'
        return 'h', err
    cw, ch = crop_size(w, h, RATIO['v'])
    need = DISPLAY['v']
    if cw >= need[0] * MIN_NATIVE and ch >= need[1] * MIN_NATIVE:
        return 'v', None
    return 's', None


def target_size(kind, w, h):
    """Standart boyut: oran sabit, en fazla MAX_FILE, asla büyütme."""
    cw, ch = crop_size(w, h, RATIO[kind])
    mw, mh = MAX_FILE[kind]
    s = min(1.0, mw / cw, mh / ch)
    tw = max(1, round(cw * s))
    th = max(1, round(tw / RATIO[kind]))
    return tw, th


def is_standard(kind, w, h):
    tw, th = target_size(kind, w, h)
    return abs(w - tw) <= 1 and abs(h - th) <= 1 and abs(w / h - RATIO[kind]) < 0.006
