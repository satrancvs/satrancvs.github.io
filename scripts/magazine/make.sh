#!/bin/bash
# iki geçiş: sayfa numaralarını bul, içindekilere işle
set -e
cd "$(dirname "$0")"
node build.mjs >/dev/null && node print.mjs >/dev/null
N=$(pdfinfo magazine.pdf | awk '/Pages/{print $2}')
python3 - "$N" <<'P'
import subprocess,sys,json
n=int(sys.argv[1]); ids=json.load(open('articles.list.json')); pages={}
for p in range(1,n+1):
    t=subprocess.run(['pdftotext','-f',str(p),'-l',str(p),'magazine.pdf','-'],capture_output=True,text=True).stdout
    for a in ids:
        if 'MAKALE %02d / %02d'%(a['n'],a['total']) in t: pages[a['id']]=p
json.dump(pages,open('pages.json','w')); print(pages)
P
node build.mjs --pages "$(cat pages.json)" >/dev/null && node print.mjs "${1:-magazine.pdf}"
pdfinfo magazine.pdf | grep -E "Pages|File size"
