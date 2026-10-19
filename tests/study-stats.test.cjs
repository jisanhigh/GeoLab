"use strict";
const assert=require("node:assert/strict"),fs=require("fs"),vm=require("vm"),path=require("path");
const root=path.join(__dirname,"..","site");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const c={};vm.createContext(c);
for(const f of ["ds/codec.js","stats-utils.js","study-stats.js"])vm.runInContext(read(f),c);
const raw=JSON.parse(read("tools/stats/data/stats.json"));
const data=c.TwCodec.unwrap(raw);
const mod=c.GeoLabExamStats;
let count=0;
for(const subject of ["world","korea"]){
 const all=mod.allTables(data,subject),shown=mod.featured(data,subject);
 assert.ok(all.length>45,"all source tables should still be available: "+subject);
 assert.ok(shown.length>=5);
 const ids=new Set(all.map(x=>x.table.id));
 for(const cat of shown){
  assert.ok(cat.items.length>0,"core category must have a real table: "+cat.name);
  for(const item of cat.items){
   assert.ok(ids.has(item.entry.table.id),"featured dataset missing: "+item.label);
   const v=item.entry.table.views[item.view];
   assert.ok(v&&v.rows.length>0,"no rows: "+item.label);
   assert.ok(v.columns.length>0,"no numeric columns: "+item.label);
   count++;
  }
 }
 const climate=data.subjects[subject].topics.find(t=>t.id==="climate");
 assert.ok(climate&&(!climate.tables||climate.tables.length===0));
}
const world=mod.allTables(data,"world");
const continents=world.find(x=>x.table.id==="world-energy-compare--continent").table;
const countries=world.find(x=>x.table.id==="world-energy-compare--country").table;
assert.ok(continents.views[0].rows.length>0&&countries.views[3].rows.length>0);
assert.ok(continents.views[0].rows.every(x=>c.GeoLabStats.CONTINENTS.has(x.label)));
const energy=data.subjects.world.topics.find(t=>t.id==="energy");
assert.ok(energy.tables.some(x=>x.id==="world-energy-compare"),"source data must be preserved");
const korea=mod.allTables(data,"korea");
const test=korea.find(x=>x.table.id==="korea-industry-compare").table.views[0];
const ranks=mod.ranked(test,2,false);
assert.ok(ranks.length>5);
for(let i=1;i<ranks.length;i++)assert.ok(ranks[i-1].val>=ranks[i].val);
assert.ok(!ranks.some(x=>x.row.label==="전국"));
const html=read("index.html");
assert.ok(html.includes("study-stats.js"));
assert.ok(html.includes("study-stats.css"));
assert.ok(read("native.js").includes("GeoLabExamStats.render(subject,focus)"));
console.log("PASS: "+count+" exam-focused tables, full catalog retained, original energy separated, numeric ranking verified");
