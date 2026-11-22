"""Oyun seçicide (MatchPicker) hiçbir iki kartın aynı görseli kullanmaması için kart görsellerini atar: her `#### …` bloğuna `[KART images/…]` satırı yazar.
Aday sırası: bloğun kendi fotoğrafları (afiş > maç fotoğrafı > portre), oyuncuların ana portreleri, oyuncuların ek fotoğrafları (extra_photos.py; kullanılırsa
künyeli figür olarak bloğa da eklenir). En az adayı olan öğe önce atanır. Tekrar çalıştırılabilir."""
import json,os,re,sys,html
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from extra_photos import EXTRA
T=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(T+'/../..')
MD=ROOT+'/src/content/dunya-sampiyonasi.md'
meta=json.load(open(ROOT+'/src/data/image-meta.json'))
done=json.load(open(T+'/extra_done.json'))
NAMES={'gukesh':'Gukesh Dommaraju','sindarov':'Javokhir Sindarov','kasparov':'Garry Kasparov','karpov':'Anatoly Karpov','botvinnik':'Mikhail Botvinnik','smyslov':'Vasily Smyslov','alekhine':'Alexander Alekhine','bogoljubov':'Efim Bogoljubov','lasker':'Emanuel Lasker','steinitz':'Wilhelm Steinitz','chigorin':'Mikhail Chigorin','topalov':'Veselin Topalov','anand':'Viswanathan Anand'}
def en(t): return f'<span lang="en">{html.escape(t,quote=False)}</span>'
def caption(k):
    d=done[k]; a=re.sub(r'\s+',' ',d.get('artist','')).strip(); a=re.sub(r'^(Photographer|Author|Creator)\s*:?\s*','',a)
    h=len(a)//2
    if h and a[:h].strip()==a[h:].strip(): a=a[:h].strip()
    if len(a)>46: a=a[:44].rstrip()+'…'
    if a.lower().startswith('unknown'): a=''
    parts=[NAMES[d['who']],'Wikimedia Commons']+([a] if a else [])+[d.get('lic','')]
    return ' · '.join(en(p) for p in parts if p)
def surn(t): t=re.sub(r'\s*\([^)]*\)','',t); return [w.split(' ')[-1].lower().replace('ó','o').replace('á','a').replace('ı','i') for w in re.split(r'\s+[–,]\s+|,\s*',t)]
s=open(MD,encoding='utf-8').read()
s=re.sub(r'(?m)^\[KART [^\]]*\]\n\n','',s)
parts=re.split(r'(?m)^(\[MAÇ SEÇİCİ: [^\]]+\]\n)',s)
out=[parts[0]]
for gi in range(1,len(parts),2):
    marker,body=parts[gi],parts[gi+1]
    end=body.find('\n### '); tail='' if end<0 else body[end:]; body=body if end<0 else body[:end]
    blocks=re.split(r'(?m)^(?=#### )',body); pre=blocks[0]; blocks=blocks[1:]
    info=[]
    for b in blocks:
        head=b.split('\n')[0][5:]; title=re.sub(r'^[^·]*·\s*','',head)
        figs=re.findall(r'!\[[^\]]*\]\((images/[^ )]+)',b)
        names=surn(title)
        c=sorted(set(figs),key=lambda f:(0 if 'afis' in f else 1 if ('mac-' in f or 'fide-2018' in f) else 2, figs.index(f)))
        c+=[f'images/dunya-{n}.jpg' for n in names if f'images/dunya-{n}.jpg' in meta and f'images/dunya-{n}.jpg' not in c]
        ex=[f'images/dunya-x-{k}.jpg' for n in names for k,_ in EXTRA.get(n,[]) if f'images/dunya-x-{k}.jpg' in meta and k in done]
        info.append((b,c,ex))
    used=set(); pick={}
    for i in sorted(range(len(info)),key=lambda i:len(info[i][1])+len(info[i][2])):
        b,c,ex=info[i]
        for cand in c+ex:
            if cand not in used: pick[i]=cand; used.add(cand); break
        else: print('ATANAMADI:',b.split('\n')[0])
    nb=[]
    for i,(b,c,ex) in enumerate(info):
        p=pick.get(i)
        if p:
            lines=b.split('\n\n')
            # *site* paragrafından sonra
            k=next((j for j,x in enumerate(lines) if x.startswith('*') and x.endswith('*')),0)
            ins=[f'[KART {p}]']
            if '/dunya-x-' in p and p not in b:
                key=re.search(r'dunya-x-(.+)\.jpg',p).group(1)
                ins.append(f'![{NAMES[done[key]["who"]]}]({p} "{caption(key)}")')
            lines[k+1:k+1]=ins
            b='\n\n'.join(lines)
        nb.append(b)
    out+= [marker,pre]+nb+[tail]
open(MD,'w',encoding='utf-8').write(''.join(out)); print('atandı:',sum(1 for _ in out))
