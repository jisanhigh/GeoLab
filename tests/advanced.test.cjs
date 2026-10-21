"use strict";
const fs=require("fs"),assert=require("node:assert/strict"),vm=require("node:vm"),path=require("path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const ctx={window:{}};vm.runInNewContext(read("app/advanced-data.js"),ctx);
const d=ctx.window.GeoLabAdvancedData;
const geo=JSON.parse(read("app/data/korea-sigun.geojson"));
const outlines=JSON.parse(read("app/data/korea-provinces.geojson"));
const known=new Set(geo.features.map(f=>f.properties.province+" "+f.properties.name));
assert.equal(outlines.features.length,17);
for(const [group,count] of Object.entries({slow:15,innovation:10,enterprise:4,airports:8,fez:9,rail:7})){
 assert.equal(d[group].length,count,group+" count must match curriculum/source");
 for(const item of d[group]){
  assert.ok(item.name&&item.description,group+" missing title or context");
  if(group!=="rail"){
   assert.ok(item.places?.length,group+" no location for "+item.name);
   for(const p of item.places)assert.ok(known.has(p.join(" ")),group+" unmatched location "+p.join(" "));
  }
 }
}
const placeCount=d.rail.reduce((n,route)=>n+route.stops.length,0);
assert.ok(placeCount>55);
for(const route of d.rail){
 assert.ok(route.stops.length>=7,route.name);
 for(const name of route.stops){
  const xy=d.stations[name];assert.ok(xy,name+" station missing");
  assert.ok(xy.length===2&&xy[0]>124&&xy[0]<132&&xy[1]>33&&xy[1]<39,name+" bad station location");
 }
}
assert.equal(new Set(d.rail.map(x=>x.name)).size,7);
assert.equal(new Set(d.slow.map(x=>x.name)).size,15);
assert.ok(d.enterprise.find(x=>x.name.includes("영암·해남"))?.places.length===2);
assert.ok(d.fez.find(x=>x.name==="부산진해경제자유구역")?.places.length===2);
assert.ok(d.innovation.find(x=>x.name==="충북 진천·음성")?.places.length===2);
for(const a of d.airports){
 assert.ok(a.point?.length===2);
 assert.ok(a.point[0]>124&&a.point[0]<132&&a.point[1]>33&&a.point[1]<39,a.name+" coordinates");
}
const js=read("app/advanced.js"),css=read("app/advanced.css"),html=read("site/index.html");
new Function(js);
assert.ok(js.includes('window.GeoLabAdvanced={render}'),"Advanced module must export a real render function");
assert.ok(js.includes('window.GeoLabRegions.normalizeData(st.areas)'),"Legacy map compatibility");
assert.ok(js.includes('advanced-province'),"Province boundaries should be drawn");
assert.ok(js.includes('advanced-route'),"Rail routes should be drawable");
assert.ok(css.includes(".advanced-route")&&css.includes(".advanced-province"));
for(const tag of ['id="panel-advanced"','id="advanced-root"','data-view="advanced"','advanced-data.js?v=1','advanced.js?v=2','advanced.css?v=1'])assert.ok(html.includes(tag),"Advanced nav missing: "+tag);
for(const file of ["advanced.js","advanced-data.js","advanced.css"])assert.ok(fs.existsSync(path.join(root,"site",file)),"Missing site file "+file);
console.log("Advanced themes verified: 15 slow, 10 innovation, 4 enterprise, 8 airports, 9 FEZ, 7 rail lines; "+placeCount+" rail waypoints.");
