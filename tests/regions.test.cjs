const fs=require("node:fs");
const assert=require("node:assert/strict");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const text=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const data=JSON.parse(text("app/data/korea-sigun.geojson"));
const features=data.features;
assert.equal(data.type,"FeatureCollection");
assert.equal(data.metadata.boundaryYear,2023,"Boundary vintage must be stated accurately");
assert.equal(features.length,167,"No city/county lost or duplicated");
assert.equal(features.filter(f=>f.properties.kind==="city").length,85);
assert.equal(features.filter(f=>f.properties.kind==="county").length,82);
assert.equal(new Set(features.map(f=>f.properties.province)).size,17);
const byName=new Map();
for(const f of features){
 const p=f.properties,key=p.province+" "+p.name;
 assert.ok(!byName.has(key),"Duplicate: "+key);byName.set(key,p.kind);
 assert.ok(["city","county"].includes(p.kind),key+" has an invalid type");
 assert.ok(!p.name.endsWith("구")&&!/\s.+구$/.test(p.name),"Gu cannot be a learning unit: "+key);
 assert.equal(f.type,"Feature");
 assert.equal(f.geometry.type,"MultiPolygon");
 assert.ok(f.geometry.coordinates.length>0,key+" has no boundary");
 for(const polygon of f.geometry.coordinates)for(const ring of polygon){
   assert.ok(ring.length>=4,key+" invalid ring");
   assert.deepEqual(ring[0],ring[ring.length-1],key+" unclosed ring");
   for(const [lon,lat] of ring)assert.ok(lon>=123&&lon<=132&&lat>=32&&lat<=40,key+" bad coordinates");
 }
}
for(const [region,kind] of [
 ["경기도 수원시","city"],["강원특별자치도 평창군","county"],
 ["경상남도 창원시","city"],["경상북도 포항시","city"],
 ["대구광역시 군위군","county"],["대구광역시 달성군","county"],
 ["부산광역시 기장군","county"],["인천광역시 강화군","county"],
 ["강원특별자치도 고성군","county"],["경상남도 고성군","county"],
 ["세종특별자치시 세종특별자치시","city"],["전북특별자치도 전주시","city"]
])assert.equal(byName.get(region),kind,"Misclassified: "+region);
const page=text("site/index.html");
for(const snippet of ['id="panel-regions"','data-view="regions"','./regions.js?v=1','./regions.css?v=1'])assert.ok(page.includes(snippet),"Missing interface: "+snippet);
assert.ok(fs.existsSync(path.join(root,"site/data/korea-sigun.geojson")),"Site build did not copy boundary data");
new Function(text("app/regions.js"));
console.log("Regions verified:",features.length,"learning units, 17 provinces, no gu, valid polygons.");
