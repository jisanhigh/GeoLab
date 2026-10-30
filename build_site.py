#!/usr/bin/env python3
"""GeoLab independent complete content build. Noncommercial derivative."""
import re,json,shutil,struct,zlib
from html import unescape
from io import BytesIO
from pathlib import Path
from urllib.request import Request,urlopen
from zipfile import ZipFile
HOME=Path(__file__).resolve().parent
SITE=HOME/'site'
URL='https://codeload.github.com/twotimeessgeo/country-map-maker/zip/refs/heads/main'
REQUIRED=['tools/climate/index.html','tools/climate/korea.html','tools/stats/data/stats.json','tools/ox/data/ox.json','tools/cut/data/ebsi_geo_data.json','notes/index.html','atlas-archive/index.html','ds/codec.js','LICENSE','LICENSE-CODE.md','LICENSE-DATA']
def icon(size,path):
    raw=bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            xx=(x+.5)/size-.5; yy=(y+.5)/size-.5;r=xx*xx+yy*yy
            v=(202,225,225) if abs(r-.1)<.006 or r<.1 and (abs(yy)<.009 or abs(xx)<.009) else ((40,95,109) if r<.1 else (19,41,60))
            raw.extend((*v,255))
    def ch(t,s):return struct.pack('>I',len(s))+t+s+struct.pack('>I',zlib.crc32(t+s)&0xffffffff)
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',size,size,8,6,0,0,0))+ch(b'IDAT',zlib.compress(raw))+ch(b'IEND',b''))

# The upstream repository was replaced by redirect pages on Oct 15, 2026.
# Pin the last complete public Git tree rather than the current branch.
HISTORIC_TREE="00cde01f529adc74c09a89107eea4eccd5097241"
HISTORIC_ARCHIVE="https://codeload.github.com/twotimeessgeo/country-map-maker/zip/"+HISTORIC_TREE
def full_historic_snapshot():
    from concurrent.futures import ThreadPoolExecutor,as_completed
    import hashlib,time
    from urllib.parse import quote
    print("Recovering complete historic public release...",flush=True)
    # Check whether GitHub can serve an archive directly from the old tree.
    try:
        with urlopen(Request(HISTORIC_ARCHIVE,headers={'User-Agent':'GeoLab-Education/1.0'}),timeout=200) as f:
            raw=f.read()
        with ZipFile(BytesIO(raw)) as z:
            members=[x for x in z.infolist() if not x.is_dir()]
            if len(members)>=3000:
                prefix=members[0].filename.split('/')[0]+'/'
                for item in members:
                    if not item.filename.startswith(prefix):continue
                    name=Path(item.filename[len(prefix):])
                    if not name.parts or name.is_absolute() or '..' in name.parts:raise ValueError('Unsafe archive')
                    p=SITE/name;p.parent.mkdir(parents=True,exist_ok=True)
                    with z.open(item) as src,p.open('wb') as dest:shutil.copyfileobj(src,dest)
                return set(x.filename[len(prefix):] for x in members if x.filename.startswith(prefix))
    except Exception as e:
        print("Historic ZIP unavailable; fetching Git objects by path:",str(e)[:160],flush=True)
    api="https://api.github.com/repos/twotimeessgeo/country-map-maker/git/trees/"+HISTORIC_TREE+"?recursive=1"
    with urlopen(Request(api,headers={'User-Agent':'GeoLab-Education/1.0','Accept':'application/vnd.github+json'}),timeout=60) as r:
        response=json.load(r)
    items=[x for x in response.get('tree',[]) if x.get('type')=='blob']
    if len(items)<3000 or response.get('truncated'):raise RuntimeError('Historic file manifest is incomplete')
    source="https://raw.githubusercontent.com/twotimeessgeo/country-map-maker/"+HISTORIC_TREE+"/"
    def one(obj):
        path=obj['path'];dest=SITE/path
        uri=source+quote(path,safe='/')
        for retry in range(4):
            try:
                with urlopen(Request(uri,headers={'User-Agent':'GeoLab-Education/1.0'}),timeout=120) as f:
                    data=f.read()
                actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
                if actual!=obj['sha']:raise RuntimeError('Hash mismatch '+path)
                dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
                return path
            except Exception:
                if retry==3:raise
                time.sleep((retry+1)*2)
    paths=set()
    with ThreadPoolExecutor(max_workers=12) as ex:
        futures=[ex.submit(one,obj) for obj in items]
        for i,f in enumerate(as_completed(futures),1):
            paths.add(f.result())
            if i%300==0:print("Recovered",i,"/",len(items),flush=True)
    return paths

def main():
    if SITE.exists():shutil.rmtree(SITE)
    SITE.mkdir()
    print('Fetching original complete public site...',flush=True)
    with urlopen(Request(URL,headers={'User-Agent':'GeoLab-Education/1.0'}),timeout=240) as f:blob=f.read()
    with ZipFile(BytesIO(blob)) as z:
        items=[i for i in z.infolist() if not i.is_dir()]
        prefix=items[0].filename.split('/')[0]+'/'
        names=set()
        for item in items:
            if not item.filename.startswith(prefix):continue
            p=Path(item.filename[len(prefix):])
            if not p.parts or p.is_absolute() or '..' in p.parts:raise ValueError('Unsafe archive member')
            target=SITE/p;target.parent.mkdir(parents=True,exist_ok=True)
            with z.open(item) as src,target.open('wb') as dst:shutil.copyfileobj(src,dst)
            names.add(p.as_posix())
    restored_live=False
    original_count=len(names)
    if len(names)<3000:
        # Restore the complete previous GeoLab Pages site when the former
        # upstream archive is unavailable. Verify before overlaying changes.
        import recover_live
        names=recover_live.run()
        restored_live=True
        original_count=json.loads((SITE/'INVENTORY.json').read_text('utf-8'))['original_files']
    assert len(names)>=3000,('Missing original files',len(names))
    assert not (set(REQUIRED)-names),('Missing required files',set(REQUIRED)-names)
    for family in ['tools/cut/question-images/','tools/ox/audio/','fonts/','meridian/media/','atlas-archive/','notes/']:
        assert any(p.startswith(family) for p in names),('Missing source family',family)
    if not restored_live:
        (SITE/'index.html').rename(SITE/'original-home.html')
    else:
        assert (SITE/'original-home.html').is_file(), 'Missing preserved original home page'
    for p in (HOME/'app').rglob('*'):
        if p.is_file():
            dest=SITE/p.relative_to(HOME/'app')
            dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
    # Keep all original files, including images, audio, video, and fonts.
    for p in SITE.rglob('*.html'):
        if p.parent==SITE:continue
        s=p.read_text('utf-8',errors='replace')
        rel='../'*(len(p.relative_to(SITE).parts)-1)
        t=s.replace('href="https://twotimeessgeo.github.io/country-map-maker/','href="'+rel)
        if t!=s:p.write_text(t,'utf-8')
    catalog=[]
    for folder,label in [('notes','읽기 자료'),('atlas-archive','일조 자료')]:
        for p in sorted((SITE/folder).rglob('*.html')):
            if folder=='atlas-archive' and p.name=='index.html':continue
            html=p.read_text('utf-8',errors='replace')
            m=re.search(r'<title[^>]*>(.*?)</title>',html,re.I|re.S)
            title=unescape(re.sub(r'<[^>]+>','',m.group(1))).strip() if m else p.stem
            plain=re.sub(r'(?is)<(script|style)\b.*?</\1>',' ',html)
            plain=re.sub(r'\s+',' ',unescape(re.sub(r'<[^>]+>',' ',plain))).strip()
            catalog.append({'type':label,'title':title,'url':p.relative_to(SITE).as_posix(),'text':plain[:800]})
    (SITE/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    for n in (180,192,512):icon(n,SITE/('icon-%s.png'%n))
    (SITE/'.nojekyll').write_text('')
    assert len(catalog)>=2003, ('Reading library pages missing',len(catalog))
    report={'original_files':original_count,'restored_snapshot_files':len(names),'removed_original_files':0,'catalog_pages':len(catalog),
            'source':'twotimeessgeo/country-map-maker','restored_from_existing_pages':restored_live,'app':'GeoLab'}
    (SITE/'INVENTORY.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False),flush=True)
if __name__=='__main__':main()
