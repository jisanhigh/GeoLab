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

const stationKeys=Object.keys(d.stations);
assert.equal(stationKeys.length,59,"All study stations must remain available");
assert.equal(Object.keys(d.stationAdministrative||{}).length,stationKeys.length,"No station should lack an administrative district");
for(const station of stationKeys){
 const official=d.stationAdministrative[station];
 assert.ok(official&&typeof official==="string","Missing station district: "+station);
 assert.ok(/(시|도) /.test(official)&&/(시|군|구)$/.test(official),"Incomplete city/county/district for "+station+": "+official);
}
for(const [station,locality] of Object.entries({
 "천안아산":"충청남도 아산시","김천구미":"경상북도 김천시",
 "부발":"경기도 이천시","감곡장호원":"충청북도 음성군",
 "울산":"울산광역시 울주군","서울":"서울특별시 용산구",
 "오송":"충청북도 청주시 흥덕구","진부":"강원특별자치도 평창군",
 "포항":"경상북도 포항시 북구"
}))assert.equal(d.stationAdministrative[station],locality,station+" has the wrong district");
// Coordinates represent the district on the shared 2023 base map. Exact address may
// differ at a boundary, so the mapped municipality is checked separately below.
function withinRing([x,y],ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [xi,yi]=ring[i], [xj,yj]=ring[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}
function insideRegion(coord,shape){
 return shape.geometry.coordinates.some(poly=>withinRing(coord,poly[0])&&!poly.slice(1).some(h=>withinRing(coord,h)));
}
const foundStations=stationKeys.map(name=>{
 const matches=geo.features.filter(f=>insideRegion(d.stations[name],f));
 assert.equal(matches.length,1,"Station coordinates must resolve to exactly one mapped area: "+name);
 return [name,matches[0].properties.province+" "+matches[0].properties.name];
});
const mapped=new Map(foundStations);
assert.equal(mapped.get("부발"),"경기도 이천시","Bubal marker must not appear in Yeoju");
assert.equal(mapped.get("감곡장호원"),"충청북도 음성군","Gamgok-Janghowon marker must not appear in Icheon");

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
assert.ok(js.includes('selectStation(name)'),"Selecting a train station must update the detail view");
assert.ok(js.includes('data-advanced-station'),"Students must also be able to select stations from the sidebar");
assert.ok(js.includes('advanced-station-hit'),"Station markers must have enlarged touch targets");
assert.ok(js.includes('data.stationAdministrative[st.stationName]'),"Detail panel must display the station municipality");
assert.ok(js.includes('showStationTooltip(name,ev)'),"Map stations must show districts immediately on pointer enter or focus");
assert.ok(js.includes('.on("pointermove",moveStationTooltip)'),"Hover label must follow pointer");
assert.ok(js.includes('.on("pointerleave",hideStationTooltip)'),"Hover label must disappear when cursor leaves");
assert.ok(js.includes('button.addEventListener("pointerenter"'),"The station-list buttons should show the same tooltip");
assert.ok(js.includes('button.addEventListener("focus"'),"Keyboard focus should also reveal the district");
assert.ok(js.includes('st.category!=="rail"||st.quiz'),"Rail hover must not reveal hints in quiz mode");
assert.ok(js.includes('data.stationAdministrative[name]'),"Hover must use the same verified district source");
assert.ok(js.includes('role="tooltip" hidden'),"Tooltip must be a temporary overlay, hidden initially");
assert.ok(css.includes(".advanced-station-tooltip[hidden]"),"Hidden tooltip must never block input");
assert.ok(css.includes(".advanced-station .advanced-place-label{pointer-events:all"),"Station names should be hoverable, not just their markers");
assert.ok(css.includes(".advanced-station-info")&&css.includes(".advanced-station-buttons"),"Station detail and list must be styled");
assert.ok(css.includes(".advanced-route")&&css.includes(".advanced-province"));
for(const tag of ['id="panel-advanced"','id="advanced-root"','data-view="advanced"','advanced-data.js?v=2','advanced.js?v=4','advanced.css?v=3'])assert.ok(html.includes(tag),"Advanced nav missing: "+tag);
for(const file of ["advanced.js","advanced-data.js","advanced.css"])assert.ok(fs.existsSync(path.join(root,"site",file)),"Missing site file "+file);
console.log("Advanced themes verified: 15 slow, 10 innovation, 4 enterprise, 8 airports, 9 FEZ, 7 rail lines; "+placeCount+" rail waypoints.");
