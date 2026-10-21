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
assert.equal(world.features.length,179,"Global outline data");
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
for(const token of ["function projection()","geoNaturalEarth1","wr-country","wr-pin","function launchQuiz()","function submitQuiz(","function showTip(","function moveTip(","data/world-countries.geojson","role=\"tooltip\""])assert.ok(js.includes(token),"Missing world-map capability: "+token);
for(const token of ['id="panel-worldregions"','id="worldregion-root"','data-view="worldregions"','data-world-only','world-regions-data.js?v=1','world-regions.js?v=1','world-regions.css?v=1'])assert.ok(html.includes(token),"Missing world geography entry: "+token);
assert.ok(app.includes('view==="worldregions"&&state.s!=="world"'),"World-only navigation guard missing");
assert.ok(app.includes('window.GeoLabWorldRegions.render()'),"World region screen must mount");
assert.ok(css.includes('body[data-subject="korea"] [data-world-only]'),"Do not show world region menu in Korean geography");
assert.ok(css.includes("@media(max-width:520px)"),"Mobile compatibility missing");
for(const f of ["world-regions.js","world-regions-data.js","world-regions.css","data/world-countries.geojson"]){
 assert.ok(fs.existsSync(path.join(root,"site",f)),"Site build missing "+f);
 assert.ok(sw.includes("./"+f),"Offline cache missing "+f);
}
// Execute the filtering and quiz-option logic in a sandbox without a browser.
const injection=js.replace("window.GeoLabWorldRegions={render};","window.GeoLabWorldRegions={render,__test:{P,choices,setOf,areaType,initSelection,questionOptions}};");
assert.notEqual(injection,js,"Helper injection anchor changed");
const sandbox={window:{GeoLabWorldRegionsData:data},console};
vm.runInNewContext(injection,sandbox);
const mod=sandbox.window.GeoLabWorldRegions.__test;
mod.P.area="유럽";mod.P.mode="industry";mod.P.group="전체";
assert.equal(mod.choices().length,13);
mod.P.area="북아메리카";
assert.equal(mod.choices().length,14);
mod.P.mode="conflicts";mod.P.area="아시아";
assert.ok(mod.choices().length>=6,"Asia conflict sites");
mod.P.group="해양 영유권";
assert.equal(mod.choices().length,2,"Both textbook East/SE Asia island disputes");
mod.P.group="전체";mod.P.area="전체";
assert.equal(mod.choices().length,22);
const ans=mod.questionOptions(data.conflicts[0],data.conflicts);
assert.equal(ans.length,4);
assert.ok(ans.some(x=>x.id===data.conflicts[0].id));
assert.equal(new Set(ans.map(x=>x.id)).size,4);
console.log("World geography: 30 industry localities, 22 conflict cases, interactive learning and quiz verified.");
