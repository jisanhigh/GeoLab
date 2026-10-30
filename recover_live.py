#!/usr/bin/env python3
"""Restore the existing publicly deployed GeoLab files before overlaying updates.

Read-only HTTP backup of this repository's OWN currently published GitHub Pages.
Does not read/rewrite the original third-party repository.
"""
from __future__ import annotations
import concurrent.futures
import html.parser
import json
import os
import re
import shutil
import threading
from collections import Counter, deque
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from urllib.request import Request, urlopen

BASE = "https://jisanhigh.github.io/GeoLab/"
ROOT = Path(__file__).resolve().parent
TARGET = ROOT / "site"
HEADERS = {"User-Agent": "GeoLab-Backup/1.0"}
MAX_WORKERS = 20
ALLOWED_SUFFIXES = {
 ".html",".js",".css",".json",".geojson",".png",".jpg",".jpeg",".gif",
 ".svg",".webp",".avif",".ico",".woff",".woff2",".ttf",".otf",".mp3",".mp4",
 ".ogg",".wav",".pdf",".xml",".csv",".txt",".md",".webmanifest",".map",
 ".wasm",".webm",".vtt",".m4a",".gz",".zip"
}
REQUIRED = [
 "index.html", "catalog.json", "INVENTORY.json", "ds/codec.js",
 "tools/ox/data/ox.json", "tools/ox/data/ox-extra.json",
 "tools/stats/data/stats.json", "tools/cut/data/ebsi_geo_data.json",
 "tools/climate/index.html", "tools/climate/korea.html",
 "tools/ox/index.html", "tools/stats/index.html", "tools/cut/data/question-image-manifest.json",
 "tools/ox/audio/bgm.mp3", "notes/index.html",
 "atlas-archive/index.html", "LICENSE","LICENSE-CODE.md","LICENSE-DATA",
]
def qualify(ref, parent=BASE):
 if not isinstance(ref,str):return None
 ref=ref.strip().replace("\\","/")
 if not ref or ref.startswith(("data:","javascript:","mailto:","tel:","#","blob:")):return None
 # Local strings inside JavaScript are commonly relative to site root
 u=urlsplit(urljoin(parent,ref))
 base=urlsplit(BASE)
 if (u.scheme,u.netloc)!=(base.scheme,base.netloc) or not u.path.startswith(base.path):
  return None
 rel=unquote(u.path[len(base.path):])
 if rel.endswith("/"):rel+="index.html"
 if not rel or rel.startswith((".", "/")) or ".." in Path(rel).parts:return None
 if not Path(rel).suffix.lower() in ALLOWED_SUFFIXES and not rel in ("LICENSE","LICENSE-DATA","LICENSE-CODE.md",".nojekyll"):
  return None
 return rel

class Parser(html.parser.HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=True)
  self.refs=[]
 def handle_starttag(self, tag, attrs):
  for k,v in attrs:
   if not v:continue
   if k in ("src","href","poster","data-src","data-href","data-url","data-original","data-background"):
    self.refs.append(v)
   elif k=="srcset":
    self.refs.extend(part.strip().split()[0] for part in v.split(",") if part.strip())

def references(rel, data):
 if Path(rel).suffix.lower() not in (".html",".css",".js",".json",".geojson"):
  return set()
 txt=data.decode("utf-8",errors="replace")
 u=urljoin(BASE,rel)
 out=set()
 def add(x,parent=u):
  val=qualify(x,parent)
  if val and val != rel:out.add(val)
 if rel.endswith(".html"):
  parser=Parser()
  try: parser.feed(txt)
  except Exception: pass
  for v in parser.refs:add(v)
 if rel.endswith(".css") or rel.endswith(".html"):
  for x in re.findall(r"""url\(\s*['"]?([^'")]+)""",txt,re.I):add(x)
 if rel.endswith((".js",".html")):
  # Quoted literal paths used for runtime data loading.
  for x in re.findall(r"""['"]((?:\./|\.\./|/)?(?:tools/|notes/|atlas-archive/|ds/|meridian/|fonts/|data/)[^'"<>\s]+)['"]""",txt):
   add(x,BASE)
  for x in re.findall(r"""['"]((?:\./|\.\./)?[^'"]+\.(?:json|geojson|js|css|html|png|webp|svg|woff2?|mp3|mp4|webmanifest))['"]""",txt):
   add(x,u)
 if rel.endswith((".json",".geojson")):
  try:
   obj=json.loads(txt)
  except Exception:return out
  # All 959 official question images are listed in the published manifest.
  if rel=="tools/cut/data/question-image-manifest.json":
   if not isinstance(obj,dict) or len(obj.get("items",[]))!=959:
    raise RuntimeError("Incomplete official question image manifest")
   for item in obj["items"]:
    add(item["url"],urljoin(BASE,"tools/cut/index.html"))
  # Only reference-bearing JSON keys are crawled; packed data aren't recursively exploded.
  def walk(x,depth=0):
   if depth>7:return
   if isinstance(x,dict):
    for k,v in x.items():
     if isinstance(v,str) and k in ("url","href","src","path","image","image_url","audio","file"):
      add(v,BASE)
     elif isinstance(v,(list,dict)):walk(v,depth+1)
   elif isinstance(x,list):
    for v in x:walk(v,depth+1)
  walk(obj)
 return out

def run():
 if TARGET.exists():shutil.rmtree(TARGET)
 TARGET.mkdir()
 with urlopen(Request(BASE+"INVENTORY.json",headers=HEADERS),timeout=40) as f:
  inventory=json.load(f)
 with urlopen(Request(BASE+"catalog.json",headers=HEADERS),timeout=40) as f:
  catalog=json.load(f)
 expected=int(inventory["original_files"])
 assert len(catalog)==int(inventory["catalog_pages"]), "Missing live catalog pages"
 initial=set(REQUIRED)
 initial.update(["original-home.html","manifest.webmanifest","sw.js","app.js","app.css","catalog.json","INVENTORY.json"])
 for obj in catalog:
  u=obj.get("url","")
  r=qualify(u,BASE)
  if r:initial.add(r)
 seen=set()
 queued=set(initial)
 errors={}
 total_bytes=0
 rounds=0
 while queued:
  rounds+=1
  batch=sorted(queued-seen)
  if not batch:break
  queued=set()
  print("RESTORE ROUND",rounds,"BATCH",len(batch),"COMPLETE",len(seen),flush=True)
  def download(rel):
   try:
    with urlopen(Request(urljoin(BASE,rel),headers=HEADERS),timeout=90) as f:
     content=f.read()
     if f.status!=200:raise ValueError("HTTP "+str(f.status))
    p=TARGET/rel
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_bytes(content)
    return rel,content,None
   except Exception as exc:
    return rel,None,str(exc)[:180]
  with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
   for rel,data,err in pool.map(download,batch):
    seen.add(rel)
    if err:
     errors[rel]=err
     continue
    total_bytes+=len(data)
    for child in references(rel,data):
     if child not in seen:queued.add(child)
  # Allow new path patterns discovered in later batches; cap runaway navigation.
  if rounds>16:break
 count=sum(1 for p in TARGET.rglob("*") if p.is_file())
 got={p.relative_to(TARGET).as_posix() for p in TARGET.rglob("*") if p.is_file()}
 missing_required=[x for x in REQUIRED if x not in got]
 categories={x:sum(1 for p in got if p.startswith(x)) for x in (
  "tools/cut/question-images/","tools/ox/audio/","fonts/","meridian/media/",
  "atlas-archive/","notes/","tools/climate/","tools/stats/")}
 report={"expected_original_files":expected,"catalog_pages":len(catalog),
         "restored_files":count,"bytes":total_bytes,
         "missing_required":missing_required,"families":categories,
         "errors":errors,"paths":sorted(got)}
 report_path=ROOT/"recovery-audit.json"
 report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print("RESULT",json.dumps({k:v for k,v in report.items() if k not in ("paths","errors")},ensure_ascii=False),flush=True)
 print("ERROR_COUNT",len(errors),"FIRST_ERRORS",str(list(errors.items())[:15]),flush=True)
 print("SAVED AUDIT",report_path,flush=True)
 if missing_required:
  raise RuntimeError("Critical public assets missing: "+", ".join(missing_required))
 if categories["tools/cut/question-images/"]!=959:
  raise RuntimeError("Question image backup incomplete: expected 959 images")
 if count<expected:
  raise RuntimeError("Restored file count "+str(count)+" smaller than original inventory "+str(expected))
 return got
if __name__=="__main__":run()
