"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..","site");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const context={};vm.createContext(context);
vm.runInContext(read("ds/codec.js"),context);
vm.runInContext(read("stats-utils.js"),context);
const data=context.TwCodec.unwrap(JSON.parse(read("tools/stats/data/stats.json")));
const util=context.GeoLabStats;
const energy=data.subjects.world.topics.find(t=>t.id==="energy");
const samples=[
 {id:"world-energy-compare",continent:"대륙별 에너지",country:"주요 국가별 에너지",views:5},
 {id:"world-8cf8c2b8",continent:"대륙별 수력 제외 신·재생 에너지 발전",country:"주요 국가별 수력 제외 신·재생 에너지 발전",views:2}
];
let checked=0;
for(const target of samples){
 const original=energy.tables.find(t=>t.id===target.id);
 assert.ok(original, "original energy table must remain available: "+target.id);
 const list=util.splitTable(original,"world");
 assert.equal(list.length,2);
 assert.equal(list[0].id,target.id+"--continent");
 assert.equal(list[1].id,target.id+"--country");
 assert.equal(list[0].title,target.continent);
 assert.equal(list[1].title,target.country);
 assert.equal(list[0].views.length,target.views);
 assert.equal(list[1].views.length,target.views);
 for(let i=0;i<original.views.length;i++){
  const source=original.views[i];
  const a=list[0].views[i],b=list[1].views[i];
  assert.ok(a.rows.length>0 && b.rows.length>0);
  assert.equal(a.rows.length+b.rows.length,source.rows.length,"No rows lost or duplicated: "+target.id+"/"+source.label);
  assert.equal(a.rows.filter(row=>util.CONTINENTS.has(row.label)).length,a.rows.length);
  assert.equal(b.rows.filter(row=>util.CONTINENTS.has(row.label)).length,0);
  assert.deepEqual(JSON.parse(JSON.stringify(a.rows)),JSON.parse(JSON.stringify(source.rows.filter(r=>util.CONTINENTS.has(r.label)))));
  assert.deepEqual(JSON.parse(JSON.stringify(b.rows)),JSON.parse(JSON.stringify(source.rows.filter(r=>!util.CONTINENTS.has(r.label)))));
  for(const split of [a,b]){
   for(const field of ["columns","sources","year","note","rowLabel"]){
    assert.deepEqual(JSON.parse(JSON.stringify(split[field]??null)),JSON.parse(JSON.stringify(source[field]??null)),field+" unchanged");
   }
  }
  checked++;
 }
}
const all=util.tablesForTopic(energy,"world");
const ids=new Set(all.map(x=>x.table.id));
for(const sample of samples){
 assert.ok(ids.has(sample.id+"--continent"));
 assert.ok(ids.has(sample.id+"--country"));
 assert.ok(!ids.has(sample.id),"Do not show mixed table: "+sample.id);
}
const unrelated=energy.tables.find(t=>t.id==="world-global-primary-energy");
assert.equal(util.splitTable(unrelated,"world")[0],unrelated);
assert.equal(util.splitTable(energy.tables[0],"korea")[0],energy.tables[0]);
const index=read("index.html");
const native=read("native.js");
const app=read("app.js");
assert.ok(index.includes('stats-utils.js'));
assert.ok(native.includes("GeoLabStats.tablesForTopic(t,subject)"));
assert.ok(app.includes("GeoLabStats.tablesForTopic(t,s)"));
console.log("PASS: "+checked+" energy views separated, row counts and source values preserved, independent search links");
