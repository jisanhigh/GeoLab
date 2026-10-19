/* GeoLab statistics grouping: preserve original numeric values and provenance.
 * Any combined continent/country dataset is split into independent tables.
 */
(function(root){"use strict";
 const CONTINENTS=new Set(["아시아","아프리카","유럽","라틴 아메리카","앵글로아메리카","오세아니아"]);
 const SPLIT={
 "world-population-compare":["대륙별 인구","주요 국가별 인구"],
 "world-08d3586a":["대륙별 인구 구조","주요 국가별 인구 구조"],
 "world-urban-compare":["대륙별 도시·촌락","주요 국가별 도시화"],
 "world-food-compare":["대륙별 농업·식량","주요 국가별 농업·식량"],
 "world-energy-compare":["대륙별 에너지","주요 국가별 에너지"],
 "world-8cf8c2b8":["대륙별 수력 제외 신·재생 에너지","주요 국가별 수력 제외 신·재생 에너지"],
 "world-religion-compare":["대륙별 종교","주요 국가별 종교"]
 };
 function kind(row){
  if(row.group==="continent"||row.group==="country")return row.group;
  if(CONTINENTS.has(row.label))return "continent";
  return "country";
 }
 function splitTable(table,subject){
  const labels=subject==="world"&&SPLIT[table.id];
  if(!labels)return [table];
  return ["continent","country"].map((scope,i)=>({
   ...table,id:table.id+"--"+scope,originalId:table.id,title:labels[i],geographicScope:scope,
   views:(table.views||[]).map(v=>({...v,rows:(v.rows||[]).filter(r=>kind(r)===scope)}))
    .filter(v=>v.rows.length>0)
  })).filter(t=>t.views.length);
 }
 function tablesForTopic(topic,subject){
  return (topic.regions||[{id:"",title:"",tables:topic.tables||[]}])
   .flatMap(region=>(region.tables||[]).flatMap(t=>splitTable(t,subject).map(table=>({topic,region,table}))));
 }
 function scopeOf(entry){
  if(entry.table.geographicScope)return entry.table.geographicScope;
  const title=entry.table.title||"";
  const rows=(entry.table.views||[]).flatMap(v=>v.rows||[]);
  const counts={continent:0,country:0,other:0};
  for(const r of rows){
   if(r.group==="continent"||CONTINENTS.has(r.label))counts.continent++;
   else if(r.group==="country"||r.continent)counts.country++;
   else if(/^\d+위$/.test(r.label)&&r.values?.some(v=>v&&typeof v==="object"&&v.name))counts.country++;
   else counts.other++;
  }
  if(counts.continent>0&&counts.country===0&&counts.other===0)return "continent";
  if(counts.country>0&&counts.continent===0&&counts.other===0)return "country";
  if(/대륙별|대륙 간/.test(title)&&counts.country===0)return "continent";
  if(/국가별|주요 국가|수출입 상위 국가|생산 상위 국가/.test(title)&&counts.continent===0)return "country";
  return "other";
 }
 root.GeoLabStats=Object.freeze({CONTINENTS,SPLIT,kind,splitTable,tablesForTopic,scopeOf});
})(typeof window!=="undefined"?window:globalThis);
