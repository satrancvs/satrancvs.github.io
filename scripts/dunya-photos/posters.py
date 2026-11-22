"""FIDE Müzesi'nden (museum.fide.com, "World Championship Posters") indirilen resmî maç afişlerini (posters/p-*.img) yazıya yerleştirir.
Müze sitesinin şartı: kopyalama yalnızca kaynağa etkin bağlantıyla; altyazı bu yüzden müze sayfasına bağlanır. Renkli kalmaları için scripts/image-color.json'a eklenir."""
import json,os,re
from PIL import Image
T=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(T+'/../..')
ids=json.load(open(T+'/ids.json'))
P=[ # (dosya, maç kimliği, altyazı metni, müze sayfası)
('1981','1981','Merano 1981','1981-world-championship-match-poster'),
('1999','1999','Las Vegas 1999 (eleme turnuvası)','knockout-world-chess-championship-poster'),
('2014','2014','Soçi 2014','poster-of-the-world-chess-championship-match-between-carlsen-and-anand'),
('2018','2018','Londra 2018','fide-world-chess-championship-2018-poster'),
('2021','2021','Dubai 2021','2021-world-championship-match-poster'),
('2023d','2023','Astana 2023 (Ding Liren afişi)','fide-world-championship-match-2023-poster-ding-liren'),
('2023n','2023','Astana 2023 (Nepomniachtchi afişi)','fide-world-championship-match-2023-poster-ian-nepomniachtchi'),
]
MD=ROOT+'/src/content/dunya-sampiyonasi.md'; text=open(MD,encoding='utf-8').read()
col=json.load(open(ROOT+'/scripts/image-color.json')); colset=set(col['colors'])
per={}
for k,mid,cap,slug in P:
    name=f'dunya-afis-{k}.jpg'; path=f'images/{name}'
    im=Image.open(f'{T}/posters/p-{k}.img')
    if im.mode!='RGB':
        bg=Image.new('RGB',im.size,(255,255,255)); im=im.convert('RGBA'); bg.paste(im,mask=im.split()[3]); im=bg
    im.save(f'{ROOT}/public/{path}','JPEG',quality=90)
    c=f'Resmî maç afişi · {cap} · [<span lang="en">FIDE Museum</span>](https://museum.fide.com/exhibits/{slug}) · © <span lang="en">FIDE</span>'
    per.setdefault(mid,[]).append((path,f'{cap} maç afişi',c))
    if name not in colset: col['colors'].append(name)
json.dump(col,open(ROOT+'/scripts/image-color.json','w'),ensure_ascii=False,indent=2)
for mid,items in per.items():
    marker=f'#### {ids[mid]["heading"]}\n\n*{ids[mid]["site"]}*\n\n'
    if marker not in text: print('YOK',mid); continue
    block='\n'.join(f'![{a}]({p} "{c}")' for p,a,c in items)+'\n\n'
    if items[0][0] in text: continue
    text=text.replace(marker,marker+block,1)
open(MD,'w',encoding='utf-8').write(text); print('afişler yerleşti',list(per))
