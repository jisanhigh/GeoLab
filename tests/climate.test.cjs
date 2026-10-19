"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const root=path.join(__dirname,"..","site");
function read(name){return fs.readFileSync(path.join(root,name),"utf8")}
const sandbox={};vm.createContext(sandbox);
vm.runInContext(read("ds/codec.js"),sandbox);
vm.runInContext(read("climate-utils.js"),sandbox);
const C=sandbox.GeoLabClimate;
const unwrap=file=>sandbox.TwCodec.unwrap(JSON.parse(read(file))).regions;
const world=unwrap("tools/climate/data/climate-data.json");
const korea=unwrap("tools/climate/data/korea-climate-data.json");
assert.equal(world.length,169);
assert.equal(korea.length,246);
assert.equal(C.counts(world).reduce((a,x)=>a+x.count,0),169);
assert.equal(C.counts(world).length,14);
for(const [query,total] of Object.entries({Af:10,Am:3,Aw:27,BW:15,BS:10,Cfa:19,Cfb:21,Df:19})){
 assert.equal(world.filter(r=>C.matchStation(r,query,"world")).length,total,query);
}
for(const query of ["af","AF","aW","AW","Bw","bw","cFa","cfa","CFA"]){
 assert.equal(world.filter(r=>C.matchStation(r,query,"world")).length,0,"Case-sensitive: "+query);
}
assert.equal(C.code(world.find(r=>r.climateGroup==="Bw")),"BW");
assert.ok(world.some(r=>C.matchStation(r,"Kaduna","world")));
assert.ok(korea.some(r=>C.matchStation(r,"부산","korea")));
assert.ok(!korea.some(r=>r.climateGroup));
const html=read("index.html");
const native=read("native.js");
assert.ok(html.includes("climate-utils.js"));
assert.ok(native.includes('const selectAll=(selector,root)=>Array.from(root.querySelectorAll(selector))'));
assert.ok(native.includes('if(!isWorld)$("#ng-climate-nation",root)'));
console.log("PASS: Köppen symbols are case-sensitive; 14 world groups; 169 world and 246 Korean stations");
