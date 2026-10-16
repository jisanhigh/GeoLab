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
    assert len(names)>=3000,('Missing original files',len(names))
    assert not (set(REQUIRED)-names),('Missing required files',set(REQUIRED)-names)
    for family in ['tools/cut/question-images/','tools/ox/audio/','fonts/','meridian/media/','atlas-archive/','notes/']:
        assert any(p.startswith(family) for p in names),('Missing source family',family)
    (SITE/'index.html').rename(SITE/'original-home.html')
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
    report={'original_files':len(names),'removed_original_files':0,'catalog_pages':len(catalog),
            'source':'twotimeessgeo/country-map-maker','app':'GeoLab'}
    (SITE/'INVENTORY.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False),flush=True)
if __name__=='__main__':main()
