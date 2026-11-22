"""Seçici kartlarında aynı görsel iki kez kullanılmasın diye, tekrar eden oyuncular için ek Wikimedia Commons fotoğrafları indirir
(public/images/dunya-x-<anahtar>.jpg). Commons thumb.php yolu kullanılır (upload.wikimedia.org hız sınırına takılıyor)."""
import json,os,re,sys,time,urllib.parse,requests
from PIL import Image
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import photos
T=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(T+'/../..')
H={'User-Agent':'satrancvs-editorial/1.0 (static site; image credit kept)'}
photos.ALL.update(json.load(open(T+'/extra_info.json')))
def lookup(sub):
    # önbellekte yoksa Commons araması (ilk sonuç, dosya adı parçasıyla eşleşen)
    from commons import get,API,re as _re
    d=get(API,dict(action='query',generator='search',gsrsearch=sub,gsrnamespace=6,gsrlimit=5,prop='imageinfo',iiprop='url|size|mime|extmetadata'))
    for p in sorted((d.get('query',{}).get('pages',{})).values(),key=lambda x:x.get('index',0)):
        ii=(p.get('imageinfo') or [{}])[0]
        if not ii or not p['title'].lower().replace('_',' ').startswith(('file:'+sub.lower()[:12],)) and sub.lower()[:8] not in p['title'].lower(): continue
        m=ii.get('extmetadata',{})
        photos.ALL[p['title']]=dict(w=ii['width'],h=ii['height'],mime=ii['mime'],url=ii['url'],orig=ii['url'],lic=m.get('LicenseShortName',{}).get('value',''),artist=_re.sub('<[^>]+>','',m.get('Artist',{}).get('value','')),desc='',date='',page=ii.get('descriptionurl'))
        return p['title']
    return None
def find(sub):
    c=[k for k in photos.ALL if sub.lower() in k.lower()]
    return c[0] if c else lookup(sub)
# kişi: [(anahtar, Commons dosya adı ya da parça)]
EXTRA={
'gukesh':[('gukesh-2024','Gukesh in 2024 (cropped).jpg'),('gukesh-2023','Dommaraju Gukesh in 2023.jpg'),('gukesh-candidates','Gukesh D at the Candidates 2024 tournament 03.jpg')],
'sindarov':[('sindarov-a','Javokhir Sindarov (cropped).jpg'),('sindarov-b','JavokhirSindarov23.jpg'),('sindarov-c','Javokhir Sindarov Tata 2023 - 68.jpg'),('sindarov-d','Javokhir Sindarov chess player.jpg')],
'kasparov':[('kasparov-a','Optiebeurs schaakvierkamp Garri Kasparov'),('kasparov-b','KRO schaaktweekamp Timman tegen Kasparov')],
'karpov':[('karpov-a','Ohra schaaktoernooi Anatoli Karpov'),('karpov-b','Interpolis Schaaktoernooi Karpov, close'),('karpov-c','Interpolisschaaktoernooi Tilburg Karpov aan zet'),('karpov-d','Anatoly Karpov in 1993.jpg')],
'botvinnik':[('botvinnik-a','Botvinnik 1933.jpg'),('botvinnik-b','De GAK-zeskamp te Amsterdam Dr ir M M Botwinnik')],
'smyslov':[('smyslov-a','Hoogovenschaaktoernooi, Smyslov (USSR), kop'),('smyslov-b','Vassily Smyslov in 1954.jpg')],
'alekhine':[('alekhine-a','Alexandre Alekhine (cropped).jpg'),('alekhine-b','Alexandre Alekhine Color.jpg')],
'bogoljubov':[('bogoljubov-a','Dr Euwe vs Bogoliubov (1928)')],
'lasker':[('lasker-a','Lasker, Emanuel - DPLA'),('lasker-b','Frank Eugene Smith - Bildnis')],
'steinitz':[('steinitz-a','Steinitz, Wilhelm ("William") -3 - DPLA'),('steinitz-b','Steinitz, Wilhelm 1883 - DPLA'),('steinitz-c','Steinitz, Wilhelm 1896 - DPLA')],
'chigorin':[('chigorin-a','Mikhail Chigorin (cropped).jpg')],
'topalov':[('topalov-a','Veselin Topalov Sofia Airport')],
'anand':[('anand-a','Vishy Anand.jpg'),('anand-b','ViswanathanAnand13.jpg'),('anand-c','VishyAnand09.jpg')],
}
if __name__=='__main__':
    # bilgi (lisans, yazar) önbelleğinde olmayanlar için Commons API
    from commons import info
    need=[]
    for ps in EXTRA.values():
        for k,sub in ps:
            if not find(sub): need.append(sub)
    if need: print('önbellekte yok:',need)
    out={}
    os.makedirs(T+'/raw',exist_ok=True)
    for who,ps in EXTRA.items():
        for k,sub in ps:
            title=find(sub)
            if not title: print('YOK',k); continue
            i=photos.ALL[title]; dst=f'{T}/raw/x-{k}.img'
            if not (os.path.exists(dst) and os.path.getsize(dst)>2000):
                nm=urllib.parse.quote(title[5:].replace(' ','_'),safe='()_,.-')
                for t in range(30):
                    time.sleep(1.5)
                    r=requests.get(f'https://commons.wikimedia.org/w/thumb.php?f={nm}&w={min(1600,i["w"])}',headers=H,timeout=90)
                    if r.status_code==429: time.sleep(int(r.headers.get('retry-after','60'))+30); continue
                    if r.status_code==200 and len(r.content)>2000: open(dst,'wb').write(r.content); break
                    print('HTTP',r.status_code,k); break
            if os.path.exists(dst):
                im=Image.open(dst)
                im=im.convert('RGB')
                m=max(im.size)
                if m>1600: s=1600/m; im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
                im.save(f'{ROOT}/public/images/dunya-x-{k}.jpg','JPEG',quality=88)
                out[k]=dict(who=who,title=title,**{x:i[x] for x in ('w','h','lic','artist')})
                print(k,'ok',i['w'],i['h'],i['lic'])
    json.dump(out,open(T+'/extra_done.json','w'),ensure_ascii=False,indent=1)
