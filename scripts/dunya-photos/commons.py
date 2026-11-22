import requests,json,sys,re,os
API='https://commons.wikimedia.org/w/api.php'; WP='https://en.wikipedia.org/w/api.php'
H={'User-Agent':'satrancvs-article-bot/1.0 (editorial; contact via site)'}
def get(u,p):
    import time
    for i in range(8):
        time.sleep(1.2)
        r=requests.get(u,params=dict(p,format='json'),headers=H,timeout=40)
        if r.status_code==429:
            time.sleep(float(r.headers.get('retry-after',5))+3*i); continue
        try: return r.json()
        except Exception: time.sleep(3)
    raise RuntimeError('rate limited')
def page_images(title):
    out=[];cont={}
    while True:
        d=get(WP,dict(action='query',titles=title,prop='images',imlimit=500,**cont))
        for p in d['query']['pages'].values(): out+= [i['title'] for i in p.get('images',[])]
        if 'continue' in d: cont=d['continue']
        else: break
    return out
def info(files):
    res={}
    for i in range(0,len(files),40):
        d=get(API,dict(action='query',titles='|'.join(files[i:i+40]),prop='imageinfo',iiprop='url|size|mime|extmetadata',iiurlwidth=1200))
        for p in d['query']['pages'].values():
            ii=(p.get('imageinfo') or [{}])[0]
            if not ii: continue
            m=ii.get('extmetadata',{})
            res[p['title']]=dict(w=ii['width'],h=ii['height'],mime=ii['mime'],url=ii.get('thumburl') or ii['url'],orig=ii['url'],
              lic=m.get('LicenseShortName',{}).get('value',''),artist=re.sub('<[^>]+>','',m.get('Artist',{}).get('value','')),
              desc=re.sub('<[^>]+>','',m.get('ImageDescription',{}).get('value',''))[:160],date=m.get('DateTimeOriginal',{}).get('value','')[:30],page=ii.get('descriptionurl'))
    return res
if __name__=='__main__':
    t=sys.argv[1]; files=[f for f in page_images(t) if re.search(r'\.(jpe?g|png|tiff?)$',f,re.I)]
    r=info(files)
    for k,v in r.items(): print(k[5:60],v['w'],v['h'],v['lic'],'|',v['desc'][:70])
