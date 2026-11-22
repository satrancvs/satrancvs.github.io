"""Dünya Şampiyonası yazısının fotoğraflarını Wikimedia Commons'tan indirir (scripts/dunya-photos/raw/, git'e girmez).
Wikimedia aynı IP'den sık isteği 429 + Retry-After ile keser; betik bekler ve devam eder. Kullanım: python3 scripts/dunya-photos/download.py"""
import json,os,sys,time,requests
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import photos
T=os.path.dirname(os.path.abspath(__file__))
photos.ALL.update(json.load(open(T+'/extra_info.json')))
photos.PEOPLE['morozevich']=('Alexander Morozevich','File:Alexander Morozevic.jpg')
H={'User-Agent':'satrancvs-editorial/1.0 (static site; image credit kept)'}
T=os.path.dirname(os.path.abspath(__file__))
os.makedirs(T+'/raw',exist_ok=True)
prio=['gukesh','sindarov','carlsen','nakamura','caruana','giri','kasparov','karpov','fischer','spassky','anand','kramnik','botvinnik']
items={f'pair-{k}':v[0] for k,v in photos.PAIRS.items()}
items.update({f'p-{k}':photos.PEOPLE[k][1] for k in prio})
items.update({f'p-{k}':v[1] for k,v in photos.PEOPLE.items()})
res={}
import time as _t
_t.sleep(int(os.environ.get('FIRST_WAIT','0')))
for key,title in items.items():
    out=f'{T}/raw/{key}.img'
    i=photos.ALL.get(title)
    if not i: print('NOINFO',key,title);continue
    if os.path.exists(out) and os.path.getsize(out)>2000: res[key]=title;continue
    ok=False
    import urllib.parse
    wd=min(1600,i['w'])
    nm=urllib.parse.quote(title[5:].replace(' ','_'),safe='()_,.-')
    for url in (f'https://commons.wikimedia.org/w/thumb.php?f={nm}&w={wd}',i['orig']):
        for t in range(40):
            time.sleep(1.5)
            r=requests.get(url,headers=H,timeout=90)
            if r.status_code==429:
                w=min(700,int(r.headers.get('retry-after','60')))+60; print('429 wait',w,key,flush=True); time.sleep(w);continue
            if r.status_code==200 and len(r.content)>2000: open(out,'wb').write(r.content);ok=True;break
            print('HTTP',r.status_code,key);break
        if ok:break
    print(key,'ok' if ok else 'FAIL',flush=True)
    if ok: res[key]=title
    json.dump(res,open(T+'/downloaded.json','w'))
json.dump(res,open(T+'/downloaded.json','w'))
