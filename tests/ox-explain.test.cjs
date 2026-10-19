"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),crypto=require("node:crypto");
const site=path.join(__dirname,"..","site");
const read=p=>fs.readFileSync(path.join(site,p));
const ctx={};vm.createContext(ctx);
vm.runInContext(read("ds/codec.js").toString("utf8"),ctx);
for(const f of ["ox-reviewed-2027-world.js","ox-reviewed-2027-korea.js","ox-explain.js"])vm.runInContext(read(f).toString("utf8"),ctx);
const sourceHashes={
 "tools/ox/data/ox.json":"fb8e3c58847aabd08ca7e1688efb471fbc9822adc9effef0ae8d4b9c21cc3d24",
 "tools/ox/data/ox-extra.json":"7050cf7b2e1ed589b9997ff632277a1cbe4ca0c20f564d86c7bb45856ee657d6"
};
let total=0,correct=0,incorrect=0,pending=0,reviewed=0;
const seen=new Set(),used=new Set();
for(const [p,sha] of Object.entries(sourceHashes)){
 const b=read(p),actual=crypto.createHash("sha256").update(b).digest("hex");
 assert.equal(actual,sha,"Original OX source file was modified: "+p);
 const ext=p.endsWith("ox-extra.json"),d=ctx.TwCodec.unwrap(JSON.parse(b.toString("utf8")));
 for(const [subject,v] of Object.entries(d.subjects||{})){
  for(const ch of v.chapters||[])for(const group of ch.groups||[])for(const q of group.items||[]){
   const id=subject+":"+(ext?"ext":"base")+":"+ch.no+":"+group.title+":"+q.n;
   assert.ok(!seen.has(id),"Duplicate question ID: "+id);seen.add(id);
   assert.ok(q.a==="O"||q.a==="X","Invalid original answer");
   const item=Object.freeze({id,subject,chapter:ch.title||"기타",group:group.title,text:q.t,answer:q.a,explanation:q.f||""});
   total++;
   const rendered=ctx.GeoLabOX.build(item);
   if(q.a==="O"){
     correct++;
     assert.equal(rendered.correction,"","O questions have no original correction");
     assert.equal(item.explanation,"","Do not insert original-looking explanations into O source");
     if(!rendered.checked){pending++;assert.equal(rendered.supplement,"")}
   }else{
     incorrect++;
     assert.equal(rendered.correction,q.f,"X corrections must preserve original punctuation and brackets");
   }
   if(rendered.checked){
    reviewed++;used.add(id);
    const approved=ctx.GeoLabOX.ENTRIES[id];
    assert.ok(approved&&approved.question===q.t&&approved.answer===q.a);
    assert.ok(approved.explanation.trim().length>30);
    assert.ok(approved.sources.length>0&&approved.curriculum&&approved.referencePage>0);
    assert.equal(approved.reviewBasis,"uploaded_EBS_2027");
    assert.equal(approved.answer,"O");
    assert.equal(rendered.supplement,approved.explanation);
   }
  }
 }
}
assert.equal(total,1176);
assert.equal(correct,765);
assert.equal(incorrect,411);
assert.equal(reviewed,105,"Only the 105 explicitly reviewed notes should be shown");
assert.equal(reviewed,Object.keys(ctx.GeoLabOX.ENTRIES).length,"Orphan or mismatched reviewed explanation");
assert.equal(pending,correct-reviewed);
for(const id of Object.keys(ctx.GeoLabOX.ENTRIES))assert.ok(used.has(id),"Unverified orphan entry "+id);
assert.equal(Object.keys(ctx.GeoLabOX2027World).length,43);
assert.equal(Object.keys(ctx.GeoLabOX2027Korea).length,62);
for(const id of Object.keys(ctx.GeoLabOX.ENTRIES)){
 const note=ctx.GeoLabOX.ENTRIES[id];
 assert.equal(note.question.length>0,true);
 assert.equal(note.answer,"O","Only O questions may receive supplements");
 assert.ok(note.verifiedWith.includes("2027학년도 EBS"));
}
const entry=ctx.GeoLabOX.ENTRIES["korea:base:01:위치:6"];
const tampered=ctx.GeoLabOX.build({id:"korea:base:01:위치:6",text:"임의로 바꾼 문제",answer:"O",explanation:""});
assert.equal(tampered.checked,false);
const alteredAnswer=ctx.GeoLabOX.build({id:"korea:base:01:위치:6",text:entry.question,answer:"X",explanation:""});
assert.equal(alteredAnswer.checked,false);
const app=read("app.js").toString("utf8");
assert.ok(app.includes("Object.freeze({id,subject"));
assert.ok(app.includes("const rawCorrection=q.answer"));
assert.ok(!app.includes(".replace(/\\[([^\\]]+)\\]/g"),"No bracket substitutions allowed");
console.log("PASS: 1176 original OX unchanged, source SHA-256 matched, 411 original X corrections verbatim, "+reviewed+" reviewed O explanations, "+pending+" unreviewed O notes withheld.");
