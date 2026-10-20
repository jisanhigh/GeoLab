const fs=require("node:fs");
const assert=require("node:assert/strict");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const text=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const data=JSON.parse(text("app/data/korea-sigun.geojson"));
const features=data.features;
assert.equal(data.type,"FeatureCollection");
assert.equal(data.metadata.boundaryYear,2023,"Boundary vintage must be stated accurately");
assert.equal(features.length,161,"The eight metropolitan areas should remain white single regions");
assert.equal(features.filter(f=>f.properties.kind==="city").length,77);
assert.equal(features.filter(f=>f.properties.kind==="county").length,76);
assert.equal(features.filter(f=>f.properties.kind==="metro").length,8);
const learnable=features.filter(f=>f.properties.kind!=="metro");
assert.equal(learnable.length,153,"Only 9 provinces' city/county locations should be taught");
assert.equal(new Set(learnable.map(f=>f.properties.province)).size,9);
assert.equal(new Set(features.map(f=>f.properties.province)).size,17);
const metroNames=["서울특별시","부산광역시","대구광역시","인천광역시","광주광역시","대전광역시","울산광역시","세종특별자치시"];
for(const name of metroNames){
 const group=features.filter(f=>f.properties.province===name);
 assert.equal(group.length,1,name+" must include all subordinate counties in its white area");
 assert.equal(group[0].properties.kind,"metro");
 assert.equal(group[0].properties.name,name);
}
for(const locality of ["부산광역시 기장군","인천광역시 강화군","인천광역시 옹진군","대구광역시 군위군","대구광역시 달성군","울산광역시 울주군"])
 assert.ok(!features.some(f=>f.properties.province+" "+f.properties.name===locality),locality+" must not appear as quiz question");
const provinceData=JSON.parse(text("app/data/korea-provinces.geojson"));
assert.equal(provinceData.features.length,17,"All provincial boundaries must remain visible in every mode");
assert.deepEqual(new Set(provinceData.features.map(f=>f.properties.name)),new Set(features.map(f=>f.properties.province)));
const byName=new Map();
for(const f of features){
 const p=f.properties,key=p.province+" "+p.name;
 assert.ok(!byName.has(key),"Duplicate: "+key);byName.set(key,p.kind);
 assert.ok(["city","county","metro"].includes(p.kind),key+" has an invalid type");
 assert.ok(!p.name.endsWith("구")&&!/\s.+구$/.test(p.name),"Gu cannot be a learning unit: "+key);
 assert.equal(f.type,"Feature");
 assert.equal(f.geometry.type,"MultiPolygon");
 assert.ok(f.geometry.coordinates.length>0,key+" has no boundary");
 const signed=ring=>ring.slice(0,-1).reduce((sum,p,i)=>sum+p[0]*ring[i+1][1]-ring[i+1][0]*p[1],0)/2;
 for(const polygon of f.geometry.coordinates){
   assert.ok(signed(polygon[0]) < -1e-11,key+" exterior D3 winding is not clockwise");
   for(const hole of polygon.slice(1))assert.ok(signed(hole) > 1e-11,key+" hole winding is not counterclockwise");
 }
 for(const polygon of f.geometry.coordinates)for(const ring of polygon){
   assert.ok(ring.length>=4,key+" invalid ring");
   assert.deepEqual(ring[0],ring[ring.length-1],key+" unclosed ring");
   for(const [lon,lat] of ring)assert.ok(lon>=123&&lon<=132&&lat>=32&&lat<=40,key+" bad coordinates");
 }
}
for(const [region,kind] of [
 ["경기도 수원시","city"],["강원특별자치도 평창군","county"],
 ["경상남도 창원시","city"],["경상북도 포항시","city"],
 

 ["강원특별자치도 고성군","county"],["경상남도 고성군","county"],
 ["세종특별자치시 세종특별자치시","metro"],["전북특별자치도 전주시","city"]
])assert.equal(byName.get(region),kind,"Misclassified: "+region);
const page=text("site/index.html");
for(const snippet of ['id="panel-regions"','data-view="regions"','./regions.js?v=4','./regions.css?v=2'])assert.ok(page.includes(snippet),"Missing interface: "+snippet);
assert.ok(fs.existsSync(path.join(root,"site/data/korea-sigun.geojson")),"Site build did not copy boundary data");
assert.ok(fs.existsSync(path.join(root,"site/data/korea-provinces.geojson")),"Site build did not copy provincial borders");
const regionScript=text("app/regions.js");
new Function(regionScript);
assert.ok(regionScript.includes('rg-province-border'),"Province border layer must be rendered");
assert.ok(regionScript.includes('layer.append("g").attr("class","rg-province-layer")'),"Province borders must overlay units");
assert.ok(regionScript.includes('if(!isStudy(f))return "#ffffff"'),"Metro fill must remain pure white");
assert.ok(regionScript.includes('const isStudy=f=>f.properties.kind==="city"||f.properties.kind==="county"'),"Quiz and explorer must exclude all metros");

assert.ok(regionScript.includes('cache:"no-store"'),"Boundary fetch must bypass stale browser cache");
const vm=require("node:vm");
const sandbox={window:{},console};
vm.runInNewContext(regionScript,sandbox);
const normalize=sandbox.window.GeoLabRegions.normalizeData;
assert.equal(typeof normalize,"function");
const fromCurrent=normalize(data);
assert.equal(fromCurrent.features.length,161);
assert.equal(fromCurrent.features.filter(f=>f.properties.kind==="county").length,76);
assert.equal(fromCurrent.features.filter(f=>f.properties.kind==="metro").length,8);
// An earlier deployment held separate metro counties; simulate that cached format.
const legacy=structuredClone(data);
const busan=legacy.features.find(f=>f.properties.name==="부산광역시");
const half=Math.max(1,Math.floor(busan.geometry.coordinates.length/2));
const remainder=busan.geometry.coordinates.splice(half);
legacy.features.push({type:"Feature",properties:{name:"기장군",province:"부산광역시",kind:"county"},geometry:{type:"MultiPolygon",coordinates:remainder}});
assert.equal(legacy.features.length,162);
const converted=normalize(legacy);
assert.equal(converted.features.length,161);
assert.equal(converted.features.filter(f=>f.properties.kind==="county").length,76);
assert.equal(converted.features.filter(f=>f.properties.kind==="metro").length,8);
assert.ok(!converted.features.some(f=>f.properties.name==="기장군"));

const regionCSS=text("app/regions.css");
assert.ok(/\.rg-region\{stroke:/.test(regionCSS),"Thin city/county borders must be visible");
assert.ok(/\.rg-province-border\{fill:none;stroke:/.test(regionCSS),"Thick provincial borders must be visible");
assert.ok(/\.rg-region\.rg-metro\{stroke:none/.test(regionCSS),"White metro areas must not show internal county borders");

const helper=regionScript.split("\n").find(line=>line.startsWith("const $="))?.slice("const $=".length,-1);
assert.ok(helper,"Region selector helper missing");
const select=require("node:vm").runInNewContext(helper);
const marker={};
const fakeRoot={querySelector(selector){assert.equal(selector,"#rg-svg");return marker;}};
assert.equal(select("#rg-svg",fakeRoot),marker,"Selector argument order must match all call sites");
console.log("Regions verified:",learnable.length,"learnable units, 8 excluded metro areas, 17 outlines.");
