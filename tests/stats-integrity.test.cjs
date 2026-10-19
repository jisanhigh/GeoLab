"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const root=path.join(__dirname,"..","site"),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const ctx={};vm.createContext(ctx);
for(const file of ["ds/codec.js","stats-utils.js","stats-format.js","study-stats.js"])vm.runInContext(read(file),ctx);
const original=ctx.TwCodec.unwrap(JSON.parse(read("tools/stats/data/stats.json")));
const helper=ctx.GeoLabStats,fmt=ctx.GeoLabStatFormat;
let total={baseTables:0,views:0,values:0,numeric:0,named:0,text:0,numericStrings:0,strings:0,missing:0,badRows:0,missingSources:0,invalidNamed:0,mixedBefore:0,mixedAfter:0};
for(const [subject,sub] of Object.entries(original.subjects)){
 for(const topic of sub.topics){
  for(const tab of [...(topic.tables||[]),...(topic.regions||[]).flatMap(g=>g.tables||[])]){
   total.baseTables++;
   const parts=helper.splitTable(tab,subject);
   const rawMixed=tab.views.some(v=>new Set(v.rows.map(x=>x.group)).has("continent")&&new Set(v.rows.map(x=>x.group)).has("country"));
   if(rawMixed)total.mixedBefore++;
   for(const part of parts){
    for(const view of part.views){
     const groups=new Set(view.rows.map(x=>x.group).filter(x=>x==="continent"||x==="country"));
     if(groups.size>1)total.mixedAfter++;
    }
   }
   for(const v of tab.views){
    total.views++;
    if(!v.sources?.length)total.missingSources++;
    for(const row of v.rows||[]){
     if(row.values.length!==(v.columns||[]).length)total.badRows++;
     for(let i=0;i<row.values.length;i++){
      const val=row.values[i];total.values++;
      if(val===null){total.missing++;continue}
      if(typeof val==="object"){
       if(!fmt.isNamed(val))total.invalidNamed++;
       else total.named++;
      }else if(typeof val==="string"){total.strings++;if(fmt.isText(val))total.text++;else{total.numericStrings++;total.numeric++;}}
      else if(fmt.safeNumber(val)!==null)total.numeric++;
     }
    }
   }
  }
 }
}
assert.equal(total.baseTables,136);
assert.equal(total.views,374);
assert.equal(total.named,1445);
assert.equal(total.strings,440);assert.equal(total.text,261);assert.equal(total.numericStrings,179);
assert.equal(total.badRows,0);
assert.equal(total.missingSources,0);
assert.equal(total.invalidNamed,0);
assert.equal(total.mixedAfter,0);
let splitViews=0,splitRows=0;
for(const t of original.subjects.world.topics){
 for(const tb of t.tables||[]){
  if(!helper.SPLIT[tb.id])continue;
  const halves=helper.splitTable(tb,"world");
  assert.equal(halves.length,2,"Two independent geographic groups required");
  for(const v of tb.views){
   const grouped=halves.flatMap(h=>h.views.filter(x=>x.id===v.id).flatMap(x=>x.rows));
   assert.equal(grouped.length,v.rows.length,"Every original row must survive split: "+tb.id+"/"+v.label);
   const normalize=items=>items.map(x=>JSON.stringify(x)).sort();
   assert.deepEqual(JSON.parse(JSON.stringify(normalize(grouped))),JSON.parse(JSON.stringify(normalize(v.rows))),
    "All source data unchanged by split: "+tb.id+"/"+v.label);
   splitViews++;splitRows+=v.rows.length;
  }
 }
}

assert.equal(total.mixedBefore,7);
const m=original.subjects.world.topics.find(t=>t.id==="population").tables;
const ranks=m.find(t=>t.id==="world-ca743699");
const dest=ranks.views[0],origin=ranks.views[2];
const us=dest.rows[0].values[0],germany=dest.rows[1].values[0],india=origin.rows[0].values[0];
assert.equal(us.name,"미국");assert.ok(Math.abs(us.value/1000-52.4)<.1);
assert.equal(germany.name,"독일");assert.ok(Math.abs(germany.value/1000-16.8)<.1);
assert.equal(india.name,"인도");assert.ok(Math.abs(india.value/1000-18.5)<.1);
const migration=m.find(t=>t.id==="world-ef54d4ad");
const total2024=migration.views[0].rows.find(r=>r.label==="세계").values[0];
assert.ok(Math.abs(total2024-304)<.1);
assert.equal(Math.round(total2024*1e6),304021813);
assert.equal(Math.round(us.value*1000),52375047);
assert.equal(Math.round(germany.value*1000),16750084);
assert.equal(Math.round(india.value*1000),18533845);
const r=fmt.rankRows(dest,0);
assert.equal(r[0].name,"미국");assert.equal(r[0].val,us.value);
assert.ok(fmt.cellText(us,1).startsWith("미국 · "));
const destGroups=helper.splitTable(m.find(t=>t.id==="world-population-compare"),"world");
assert.ok(destGroups.some(t=>t.id==="world-population-compare--continent"));
assert.ok(destGroups.some(t=>t.id==="world-population-compare--country"));
const all=ctx.GeoLabExamStats.allTables(original,"world");
const entries=new Map(all.map(e=>[e.table.id,e]));
assert.ok(entries.has("world-religion-compare--continent"));
assert.ok(entries.has("world-religion-compare--country"));
assert.ok(entries.has("world-urban-compare--continent"));
assert.ok(entries.has("world-food-compare--country"));
assert.ok(read("index.html").includes("stats-format.js"));
assert.ok(read("study-stats.js").includes('data-es-scope'));
const report={
 audit_date:"2026-10-19",source_dataset_built_at:original.meta?.builtAt||null,
 kind:"structure_and_selected_official_reference_comparison",
 original:total, splitVerified:{views:splitViews,sourceRowsPreserved:splitRows},
 selectedUN2024:{international_migrants_millions:total2024,USA_destination_millions:us.value/1000,Germany_destination_millions:germany.value/1000,India_origin_millions:india.value/1000},
 reference:"https://www.un.org/development/desa/pd/content/International-migrant-stock",
 cross_check_table:"https://www.bpb.de/kurz-knapp/zahlen-und-fakten/globalisierung/52711/migration-aufnahmestaaten/",
 verification:"Exact values checked for four UN 2024 migration metrics against independently published UN tabulation. All other 136 source tables receive structural and metadata checks only.",
 note:"Checks preserve values, columns, view provenance, source presence and 2024 UN headline figures. Individual values of all other 136 tables have NOT been independently verified against primary statistical publishers. Original data may include inaccuracies."
};
fs.writeFileSync(path.join(root,"STATISTICS_AUDIT.json"),JSON.stringify(report,null,2));
console.log("PASS: original 136 tables / 374 views; "+total.named+" named numerical values, "+total.text+" text cells; all 7 mixed tables separated; UN headline cross-checks OK");
