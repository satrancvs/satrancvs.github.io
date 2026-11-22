import json,os,re,sys,html
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import photos
from PIL import Image
MT={k:(v['heading'],v['site'],'') for k,v in json.load(open(os.path.dirname(os.path.abspath(__file__))+'/ids.json')).items()}
T=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(T+'/../..')
photos.ALL.update(json.load(open(T+'/extra_info.json')))
photos.PEOPLE['morozevich']=('Alexander Morozevich','File:Alexander Morozevic.jpg')
OUT=os.path.abspath(os.path.dirname(os.path.abspath(__file__))+'/../../public/images')
SUR=['Euwe','Smyslov','Keres','Botvinnik','Reshevsky','Tal','Karpov','Korchnoi','Anand','Kramnik','Carlsen','Caruana','Nepomniachtchi','Sobyanin','Ding Liren','Gukesh','Tata Steel']
def wrap(t):
    for s in sorted(SUR,key=len,reverse=True): t=re.sub(r'(?<![>\w])'+s+r'(?![\w<])',f'<span lang="en">{s}</span>',t)
    return t
def en(t): return f'<span lang="en">{html.escape(t,quote=False)}</span>'
def credit(title):
    i=photos.ALL[title]; a=re.sub(r'\s+',' ',i.get('artist','')).strip()
    a=re.sub(r'^(Photographer|Author|Creator)\s*:?\s*','',a)
    h=len(a)//2
    if h and a[:h].strip()==a[h:].strip(): a=a[:h].strip()
    if a.lower().startswith('unknown'): a=''
    if len(a)>46: a=a[:44].rstrip()+'…'
    parts=['Wikimedia Commons']+([a] if a and a.lower() not in('unknown','?') else [])+[i.get('lic','')]
    return ' · '.join(en(p) for p in parts if p)
def save(key,name):
    src=f'{T}/raw/{key}.img'
    im=Image.open(src); 
    if im.mode in('RGBA','LA','P'):
        bg=Image.new('RGB',im.size,(255,255,255)); im=im.convert('RGBA'); bg.paste(im,mask=im.split()[3]); im=bg
    else: im=im.convert('RGB')
    m=max(im.size)
    if m>1600: s=1600/m; im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    im.save(f'{OUT}/{name}.jpg','JPEG',quality=88); return f'images/{name}.jpg'
DL={f[:-4]:1 for f in os.listdir(T+'/raw') if f.endswith('.img')} if os.path.isdir(T+'/raw') else {}
made={}
def fig(key,name,alt,cap):
    if key not in DL: return None
    path=save(key,name); return f'![{alt}]({path} "{cap}")'
order=list(reversed(list(MT)))  # yazı 2024'ten geçmişe doğru sıralıdır; kişi fotoğrafı ilk göründüğü (en yeni) maçta
SL={'Steinitz':'steinitz','Zukertort':'zukertort','Chigorin':'chigorin','Gunsberg':'gunsberg','Lasker':'lasker','Marshall':'marshall','Tarrasch':'tarrasch','Capablanca':'capablanca','Alekhine':'alekhine','Bogoljubov':'bogoljubov','Euwe':'euwe','Botvinnik':'botvinnik','Smyslov':'smyslov','Keres':'keres','Reshevsky':'reshevsky','Bronstein':'bronstein','Tal':'tal','Petrosian':'petrosian','Spassky':'spassky','Fischer':'fischer','Karpov':'karpov','Korchnoi':'korchnoi','Kasparov':'kasparov','Short':'short','Timman':'timman','Anand':'anand','Kamsky':'kamsky','Khalifman':'khalifman','Akopian':'akopian','Shirov':'shirov','Kramnik':'kramnik','Leko':'leko','Ponomariov':'ponomariov','Ivanchuk':'ivanchuk','Kasimdzhanov':'kasimdzhanov','Adams':'adams','Topalov':'topalov','Gelfand':'gelfand','Carlsen':'carlsen','Karjakin':'karjakin','Caruana':'caruana','Nepomniachtchi':'nepomniachtchi','Ding':'ding','Gukesh':'gukesh','Morozevich':'morozevich'}
PL={}
for mid,v in MT.items():
    nm=re.sub(r'^\d{4}(–\d+)? · ','',v[0]); sl=[SL[w] for w in re.findall(r'[A-Za-zİıö]+',nm) if w in SL]
    if mid=='1984': sl+=['campomanes']
    if mid=='2007': sl+=['morozevich']
    PL[mid]=list(dict.fromkeys(sl))
shown=set();IM={};missing=[]
EXTRA={}
def portrait(s):
    n,t=photos.PEOPLE[s]; cap=f'{en(n)} · {credit(t)}'
    f=fig(f'p-{s}',f'dunya-{s}',n,cap)
    if not f: missing.append(s)
    return f
def pairfig(k):
    t,d,ps=photos.PAIRS[k]; return fig(f'pair-{k}',f'dunya-mac-{k}',re.sub('<[^>]+>','',wrap(d)),f'{wrap(d)} · {credit(t)}'),ps
def row(slugs):
    fs=[portrait(x) for x in slugs if x not in shown]; shown.update(slugs); fs=[f for f in fs if f]
    return ('\n'.join(fs)+'\n\n') if len(fs)>1 else (fs[0]+'\n\n' if fs else '')
EXTRA['top']=row(['gukesh','sindarov'])
EXTRA['q1a']=row(['carlsen','nakamura','caruana'])
EXTRA['q1b']=row(['giri','weiyi','blubaum'])
EXTRA['q1c']=row(['pragg','esipenko'])
EXTRA['old1']=row(['philidor','labourdonnais','staunton'])
EXTRA['old2']=row(['anderssen','morphy'])
for mid in order:
    chunks=[]
    if mid in photos.PAIRS:
        f,ps=pairfig(mid)
        if f: chunks.append(f+'\n\n'); shown.update(ps)
        else: missing.append('pair-'+mid)
    new=[s for s in PL.get(mid,[]) if s not in shown]
    fs=[portrait(s) for s in new]; fs=[f for f in fs if f]
    shown.update(new)
    if len(fs)==1: chunks.append(fs[0]+'\n\n')
    elif fs: chunks.append('\n'.join(fs)+'\n\n')
    if chunks: IM[mid]=chunks
EXTRA['leg1']=row(['rubinstein','keres','fine'])
EXTRA['leg2']=row(['ivanchuk','polgar'])
EXTRA['leg3']=row(['larsen','geller','reshevsky','nimzowitsch'])
# --- yazıya (src/content/dunya-sampiyonasi.md) yerinde yerleştirme; tekrar çalıştırılabilir (zaten yerleştirilmiş görselleri atlar)
MD=ROOT+'/src/content/dunya-sampiyonasi.md'
text=open(MD,encoding='utf-8').read()
def have(block): return all(re.search(r'\((images/[^ )]+)',l).group(1) in text for l in block.strip().split('\n') if l.startswith('!['))
for mid,chunks in IM.items():
    marker=f'#### {MT[mid][0]}\n\n*{MT[mid][1]}*\n\n'
    block=''.join(chunks)
    if marker not in text: print('YOK (başlık bulunamadı):',mid); continue
    if have(block): continue
    text=text.replace(marker,marker+block,1)
def insert_after(prefix,extra):
    global text
    if not extra or have(extra): return
    ps=text.split('\n\n'); k=[i for i,x in enumerate(ps) if prefix in x]
    if not k: print('YOK (paragraf bulunamadı):',prefix); return
    ps.insert(k[-1]+1,extra.rstrip('\n')); text='\n\n'.join(ps)
insert_after('*Yazının güncel kısmı',EXTRA.get('top'))
insert_after("- **Gukesh'in kendisi**",EXTRA.get('q1a','')+EXTRA.get('q1b','')+EXTRA.get('q1c',''))
insert_after('Resmî bir unvan yoktu',EXTRA.get('old1','')+EXTRA.get('old2',''))
insert_after('- **Judit Polgár**',EXTRA.get('leg1','')+EXTRA.get('leg2',''))
insert_after('Bu listeye başka isimler',EXTRA.get('leg3'))
open(MD,'w',encoding='utf-8').write(text)
print('yerleştirilen maç bölümü:',len(IM),'| eksik görseller:',missing)
