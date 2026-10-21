"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),vm=require("node:vm"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const context={window:{}};
vm.runInNewContext(read("app/world-regions-data.js"),context);
const data=context.window.GeoLabWorldRegionsData;
const world=JSON.parse(read("app/data/world-countries.geojson"));
assert.equal(data.industry.length,30,"Industry reference sites, including Suneung Teukgang examples");
assert.equal(data.industry.filter(x=>x.continent==="유럽").length,16);
assert.equal(data.industry.filter(x=>x.continent==="북아메리카").length,14);
assert.equal(data.conflicts.length,22,"Conflict textbook case count");
const expectedConflictCounts={"영토·영유권":4,"분리·독립":9,"민족·종교":6,"전쟁·내전":3};
assert.equal(JSON.stringify(data.conflictCategories),JSON.stringify(Object.keys(expectedConflictCounts)),"Conflict filters must stay at four clear primary groups");
assert.equal(new Set(data.conflicts.map(x=>x.group)).size,4,"Do not recreate overlapping conflict filter labels");

const beliefs=Object.fromEntries(data.conflicts.filter(x=>x.beliefStudy).map(x=>[x.id,x.beliefStudy]));
assert.equal(Object.keys(beliefs).length,12,"Check EBS religious and ethnic study cases");
for(const id of ["cf-srilanka","cf-rakhine","cf-mindanao","cf-nigeria","cf-rwanda","cf-burundi"])
 assert.ok(beliefs[id],"All six ethnicity-and-religion filter cases must contain study information");
function beliefValues(id){return beliefs[id].people.map(p=>p.belief)}
assert.deepEqual(beliefValues("cf-srilanka"),["불교","힌두교"]);
assert.deepEqual(beliefValues("cf-rakhine"),["불교","이슬람교"]);
assert.deepEqual(beliefValues("cf-mindanao"),["크리스트교","이슬람교"]);
assert.deepEqual(beliefValues("cf-nigeria"),["이슬람교","크리스트교"]);
assert.deepEqual(beliefValues("cf-rwanda"),["후투족","투치족"]);
assert.deepEqual(beliefValues("cf-burundi"),["후투족","투치족"]);
assert.equal(beliefs["cf-rwanda"].type,"ethnic","Never mislabel Rwanda as a religious conflict");
assert.equal(beliefs["cf-burundi"].type,"ethnic","Never mislabel Burundi as a religious conflict");
for(const id of ["cf-kashmir","cf-northernireland","cf-sudan","cf-tibet","cf-xinjiang","cf-israel"])assert.ok(beliefs[id],"Cross-category conflict religious context is missing: "+id);
assert.deepEqual(beliefValues("cf-northernireland"),["개신교(크리스트교)","가톨릭교(크리스트교)"]);
assert.ok(beliefs["cf-israel"].summary.includes("영토"),"Religious background must not replace territorial context");
for(const entry of Object.values(beliefs)){
 assert.ok(["religion","ethnic","belief"].includes(entry.type),"Unexpected belief context type");
 assert.ok(entry.people.length>=1&&entry.people.every(p=>p.label&&p.belief),"Belief entry must include group and religious name");
 assert.ok(entry.summary.length>20,"Missing qualification of the primary conflict");
}

for(const [group,count] of Object.entries(expectedConflictCounts)){
 assert.equal(data.conflicts.filter(x=>x.group===group).length,count,group+" classification changed unexpectedly");
}
assert.ok(data.conflictClassificationNote.includes("대표적인 쟁점"),"Explain that overlapping real-world causes are simplified only for the filter");
assert.equal(data.conflicts.filter(x=>x.id==="cf-kashmir")[0].group,"영토·영유권");
assert.equal(data.conflicts.filter(x=>x.id==="cf-srilanka")[0].group,"민족·종교");
assert.equal(data.conflicts.filter(x=>x.id==="cf-scotland")[0].group,"분리·독립");
assert.equal(data.conflicts.filter(x=>x.id==="cf-syria")[0].group,"전쟁·내전");
assert.equal(world.features.length,179,"Global outline data");
function signedRing(ring){let s=0;for(let i=0;i<ring.length-1;i++)s+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1];return s}
for(const f of world.features){
 const polygons=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;
 for(const polygon of polygons){
  assert.ok(signedRing(polygon[0])<0,"D3 exterior winding must be clockwise: "+f.properties.name);
  for(const hole of polygon.slice(1))assert.ok(signedRing(hole)>0,"D3 holes must be counterclockwise: "+f.properties.name);
 }
}
assert.ok(data.source.includes("수능완성")&&data.source.includes("수능특강")&&data.source.includes("원본 전체 대조는 별도"),"Transparent EBS reference scope");
const ids=new Set();
for(const [kind,entries] of Object.entries({industry:data.industry,conflicts:data.conflicts})){
 for(const x of entries){
  assert.ok(x.id&&x.name&&x.continent&&x.group&&x.description,"Incomplete "+kind+" entry");
  assert.equal(x.point.length,2,x.name);
  assert.ok(Number.isFinite(x.point[0])&&x.point[0]>=-180&&x.point[0]<=180,x.name+" invalid longitude");
  assert.ok(Number.isFinite(x.point[1])&&x.point[1]>=-90&&x.point[1]<=90,x.name+" invalid latitude");
  assert.ok(!ids.has(x.id),"Duplicate region "+x.id);ids.add(x.id);
  if(kind==="industry")assert.ok(x.location&&x.keywords&&x.country,"Industry learning fields "+x.name);
  else assert.ok(x.parties&&x.keywords&&x.note,"Conflict learning fields "+x.name);
 }
}
for(const name of ["실리콘 글렌","제3 이탈리아","빌바오","랭커셔","요크셔","루르 공업 지역","자르","로렌","카디프","미들즈브러","됭케르크","로테르담","케임브리지 사이언스 파크","소피아 앙티폴리스","시스타 사이언스 시티","오울루 테크노폴리스","실리콘 밸리","디트로이트","뉴잉글랜드 공업 지역","휴스턴","티후아나"]){
 assert.ok(data.industry.some(x=>x.name===name),"EBS industry locality missing: "+name);
}
for(const name of ["우크라이나","쿠르디스탄","카슈미르","미얀마 라카인주","필리핀 민다나오섬","난사 군도(스프래틀리)","센카쿠 열도(댜오위다오)","시짱(티베트)","시리아","스코틀랜드","카탈루냐","퀘벡","수단·남수단","르완다"]){
 assert.ok(data.conflicts.some(x=>x.name===name),"EBS conflict locality missing: "+name);
}
assert.ok(data.conflicts.find(x=>x.name==="스리랑카").description.includes("2009년 종료"),"Historical conflicts must not be labeled ongoing");
assert.ok(data.conflicts.find(x=>x.name==="난사 군도(스프래틀리)").description.includes("특정 주장을 승인하지"),"Disputed islands must be neutral");
const js=read("app/world-regions.js"),css=read("app/world-regions.css"),html=read("site/index.html"),app=read("app/app.js"),sw=read("app/sw.js");
new Function(js);
assert.ok(js.includes("window.GeoLabWorldRegions={render}"));
assert.ok(js.includes('function beliefInfo(x)'),"Details need religious or ethnic comparison component");
assert.ok(js.includes("beliefInfo(x)+'<div"),"Every relevant conflict detail must include study cards");
assert.ok(js.includes('study.type==="ethnic"'),"Ethnic and religious cases must render distinct labels");
assert.ok(css.includes(".wr-belief-grid")&&css.includes(".wr-belief-note"),"Religious study cards must work in a responsive view");
assert.ok(html.includes('© 안쌤'),"GeoLab main UI should use the requested copyright");
assert.ok(!html.includes("원본 자료: twotimess"),"Remove outdated main UI copyright attribution");

assert.ok(js.includes('"유럽":{center:[12,56.5],scale:700}'),"European projection must include northern Finland and southern France");
for(const token of ["function projection()","geoNaturalEarth1","wr-country","wr-pin","function launchQuiz()","function submitQuiz(","function showTip(","function moveTip(","data/world-countries.geojson","role=\"tooltip\""])assert.ok(js.includes(token),"Missing world-map capability: "+token);
for(const token of ['id="panel-worldregions"','id="worldregion-root"','data-view="worldregions"','data-world-only','world-regions-data.js?v=4','world-regions.js?v=4','world-regions.css?v=3'])assert.ok(html.includes(token),"Missing world geography entry: "+token);
assert.ok(app.includes('view==="worldregions"&&state.s!=="world"'),"World-only navigation guard missing");
assert.ok(app.includes('window.GeoLabWorldRegions.render()'),"World region screen must mount");
assert.ok(css.includes('body[data-subject="korea"] [data-world-only]'),"Do not show world region menu in Korean geography");
assert.ok(css.includes("@media(max-width:520px)"),"Mobile compatibility missing");
for(const f of ["world-regions.js","world-regions-data.js","world-regions.css","data/world-countries.geojson"]){
 assert.ok(fs.existsSync(path.join(root,"site",f)),"Site build missing "+f);
 assert.ok(sw.includes("./"+f),"Offline cache missing "+f);
}
// Execute the filtering and quiz-option logic in a sandbox without a browser.
const injection=js.replace("window.GeoLabWorldRegions={render};","window.GeoLabWorldRegions={render,__test:{P,choices,setOf,areaType,initSelection,questionOptions,beliefInfo,entryInfo}};");
assert.notEqual(injection,js,"Helper injection anchor changed");
const sandbox={window:{GeoLabWorldRegionsData:data},console};
vm.runInNewContext(injection,sandbox);
const mod=sandbox.window.GeoLabWorldRegions.__test;
const sriLanka=mod.entryInfo(data.conflicts.find(x=>x.id==="cf-srilanka"));
assert.ok(sriLanka.includes("불교")&&sriLanka.includes("힌두교"),"Sri Lankan study names must appear in the detail");
const rwanda=mod.entryInfo(data.conflicts.find(x=>x.id==="cf-rwanda"));
assert.ok(rwanda.includes("주요 민족 집단")&&rwanda.includes("후투족")&&rwanda.includes("투치족"),"Rwanda is ethnicity rather than a contest between religions");
const noBelief=mod.entryInfo(data.conflicts.find(x=>x.id==="cf-ukraine"));
assert.ok(!noBelief.includes("wr-belief"),"Don't invent religious rivalries in unrelated conflicts");
const quizExplanation=mod.entryInfo(data.conflicts.find(x=>x.id==="cf-rakhine"));
assert.ok(quizExplanation.includes("로힝야족")&&quizExplanation.includes("이슬람교"),"Correct quiz feedback should include faith names");

mod.P.area="유럽";mod.P.mode="industry";mod.P.group="전체";
assert.equal(mod.choices().length,16);
mod.P.area="북아메리카";
assert.equal(mod.choices().length,14);
mod.P.mode="conflicts";mod.P.area="아시아";
assert.ok(mod.choices().length>=6,"Asia conflict sites");
mod.P.group="영토·영유권";
assert.equal(mod.choices().length,3,"Asian land and maritime territory dispute localities");
mod.P.group="분리·독립";
assert.ok(mod.choices().length>=2,"Self-determination localities should remain accessible");
assert.ok(js.includes("data.conflictCategories.filter"),"Use one stable short conflict category list");
assert.ok(js.includes("wr-filter-count"),"Show categories with small case counts");
assert.ok(js.includes("대표 유형:"),"In detailed conflict cards classify by primary issue, not a full explanation");
mod.P.group="전체";mod.P.area="전체";
assert.equal(mod.choices().length,22);
const ans=mod.questionOptions(data.conflicts[0],data.conflicts);
assert.equal(ans.length,4);
assert.ok(ans.some(x=>x.id===data.conflicts[0].id));
assert.equal(new Set(ans.map(x=>x.id)).size,4);
console.log("World geography: 30 industry localities, 22 conflict cases, interactive learning and quiz verified.");
