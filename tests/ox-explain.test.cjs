"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const site=path.join(__dirname,"..","site");
const load=p=>fs.readFileSync(path.join(site,p),"utf8");
const ctx={};vm.createContext(ctx);
vm.runInContext(load("ds/codec.js"),ctx);
vm.runInContext(load("ox-explain.js"),ctx);
const ox=ctx.GeoLabOX;
assert.ok(ox&&typeof ox.build==="function");
let total=0,correct=0,incorrect=0,missing=0,conceptGaps=0,sourceCorrectionsChanged=0,specific=0,failed=[];
const ids=new Set();
for(const [file,which] of [["tools/ox/data/ox.json","base"],["tools/ox/data/ox-extra.json","ext"]]){
 const d=ctx.TwCodec.unwrap(JSON.parse(load(file)));
 for(const [subject,s] of Object.entries(d.subjects||{})){
  for(const c of s.chapters||[])for(const g of c.groups||[])for(const x of g.items||[]){
   const id=subject+":"+which+":"+c.no+":"+g.title+":"+x.n;
   assert.ok(!ids.has(id),"duplicate question ID: "+id);ids.add(id);
   total++;
   const item={id,subject,chapter:c.title,group:g.title,text:x.t,answer:x.a,explanation:x.f||""};
   const result=ox.build(item);
   if(result.kind==="문항별 근거")specific++;
   if(!result.correction||result.correction.trim().length<12)failed.push("empty/too short: "+id);
   if(item.answer==="O"){
    correct++;
    if(item.explanation)failed.push("Unexpected original explanation for O: "+id);
    if(result.correction.includes("이 문항은 "+item.chapter))conceptGaps++;
   } else {
    incorrect++;
    if(!item.explanation)missing++;
    if(result.correction!==item.explanation)sourceCorrectionsChanged++;
   }
   if(!["문항별 근거","단원 핵심 개념","틀린 표현 바로잡기"].includes(result.kind))failed.push("Invalid kind: "+id);
  }
 }
}
assert.equal(total,1176);
assert.equal(correct,765);
assert.equal(incorrect,411);
assert.equal(missing,0);
assert.equal(sourceCorrectionsChanged,0);
assert.equal(conceptGaps,0,"Every O item should have a dedicated chapter/group concept");
assert.equal(failed.length,0,failed.slice(0,10).join("\n"));
const app=load("app.js"),html=load("index.html"),styles=load("app.css");
assert.ok(app.includes("GeoLabOX.build(q)"));
assert.ok(html.includes("ox-explain.js"));
assert.ok(styles.includes(".ox-explain"));
console.log("PASS: "+total+" OX explanations; "+correct+" O concept notes, "+incorrect+" original X corrections preserved, "+specific+" item-specific reasoning matches; no missing notes.");
