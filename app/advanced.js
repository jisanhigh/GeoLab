/* GeoLab advanced Korea geography: source versions described in advanced-data.js */
(function(){
"use strict";
const data=window.GeoLabAdvancedData;
const T=[["slow","슬로시티"],["innovation","혁신도시"],["enterprise","기업도시"],["rail","고속철도"],["airports","국제공항"],["fez","경제자유구역"]];
const e=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const q=(id,root)=>root.querySelector(id);
const st={category:"slow",index:0,showLabels:true,quiz:false,answered:false,correct:false,root:null,areas:null,provinces:null,projection:null,svg:null,zoom:null,layer:null,promise:null,requestId:0,stationName:null};
const list=()=>data[st.category];
const item=()=>list()[st.index];
const placeId=(p,n)=>p+" "+n;
const places=i=>(i.places||[]).map(([p,n])=>placeId(p,n));
const contains=(feature,i)=>places(i).includes(placeId(feature.properties.province,feature.properties.name));
const metropolis=new Set(["서울특별시","부산광역시","대구광역시","인천광역시","광주광역시","대전광역시","울산광역시","세종특별자치시"]);
const visibleSource={slow:"slow",innovation:"innovation",enterprise:"enterprise",rail:"rail",airports:"airport",fez:"fez"};
/* Hover is a temporary preview; clicking/tapping still selects a station permanently. */
function hoverTip(){return st.root&&q("#advanced-station-tooltip",st.root)}
function showStationTooltip(name,event){
 if(st.category!=="rail"||st.quiz||!data.stationAdministrative?.[name])return;
 const tip=hoverTip();if(!tip)return;
 tip.innerHTML='<strong>'+e(name)+'역</strong><span>'+e(data.stationAdministrative[name])+'</span>';
 tip.hidden=false;
 moveStationTooltip(event);
}
function moveStationTooltip(event){
 const tip=hoverTip();if(!tip||tip.hidden)return;
 let x=event&&Number.isFinite(event.clientX)?event.clientX:undefined;
 let y=event&&Number.isFinite(event.clientY)?event.clientY:undefined;
 if(x===undefined||y===undefined){
  const node=event&&event.currentTarget,rect=node&&node.getBoundingClientRect&&node.getBoundingClientRect();
  if(!rect)return;
  x=rect.left+rect.width/2;y=rect.top+rect.height/2;
 }
 const width=tip.offsetWidth||200,height=tip.offsetHeight||65,edge=8;
 const left=Math.max(edge,Math.min(x+16,window.innerWidth-width-edge));
 const top=y+height+19<window.innerHeight?y+15:Math.max(edge,y-height-13);
 tip.style.left=left+"px";tip.style.top=top+"px";
}
function hideStationTooltip(){const tip=hoverTip();if(tip)tip.hidden=true}
/* The same transient location preview applies to airports; quiz answers stay hidden. */
function showAirportTooltip(airport,event){
 if(st.category!=="airports"||st.quiz||!airport?.administrative||event?.pointerType==="touch")return;
 const tip=hoverTip();if(!tip)return;
 tip.innerHTML='<strong>'+e(airport.name)+'</strong><span>'+e(airport.administrative)+'</span>';
 tip.hidden=false;
 moveStationTooltip(event);
}


function resetCategory(cat){
 hideStationTooltip();st.category=cat;st.index=0;st.quiz=false;st.answered=false;st.correct=false;st.stationName=null;refresh();
}
function makeQuiz(){hideStationTooltip();st.quiz=true;st.index=Math.floor(Math.random()*list().length);st.answered=false;st.correct=false;st.stationName=null;refresh()}
function answer(index){
 if(!list()[index])return;
 hideStationTooltip();
 if(st.quiz){if(st.answered)return;st.correct=index===st.index;st.answered=true}else {if(index!==st.index)st.stationName=null;st.index=index;}
 refresh();
}
function selectStation(name){
 if(st.category!=="rail"||st.quiz||!item().stops.includes(name)||!data.stationAdministrative[name])return;
 hideStationTooltip();
 st.stationName=name;
 refresh();
}
function points(){
 if(st.category==="rail")return [];
 const result=[];
 list().forEach((i,idx)=>{
  if(st.category==="airports"){const p=st.projection(i.point);if(p)result.push({p,index:idx,name:i.name});return}
  (i.places||[]).forEach(([prov,name])=>{
   const f=st.areas.features.find(f=>f.properties.province===prov&&f.properties.name===name);
   if(f){const p=st.projection(window.d3.geoCentroid(f));if(p)result.push({p,index:idx,name:i.name})}
  });
 });
 return result;
}
function mapSetup(){
 const d3=window.d3,svg=d3.select(q("#advanced-map",st.root)),group=svg.select("#advanced-layer");
 const path=d3.geoPath(st.projection);
 group.append("g").attr("class","advanced-units").selectAll("path").data(st.areas.features).enter()
  .append("path").attr("class","advanced-area").attr("d",path)
  .on("click",(event,f)=>{
   if(st.category==="rail"||st.category==="airports")return;
   const index=list().findIndex(i=>contains(f,i));if(index>=0)answer(index);
  });
 group.append("g").attr("class","advanced-provinces").selectAll("path").data(st.provinces.features).enter()
  .append("path").attr("class","advanced-province").attr("d",path).style("pointer-events","none");
 group.append("g").attr("class","advanced-lines");group.append("g").attr("class","advanced-markers");
 st.zoom=d3.zoom().scaleExtent([1,12]).on("zoom",ev=>group.attr("transform",ev.transform));
 svg.call(st.zoom).on("dblclick.zoom",null);
 st.svg=svg;st.layer=group;
}
function paint(){
 const d3=window.d3,cat=st.category,rail=cat==="rail",airport=cat==="airports",chosen=item();
 st.layer.selectAll(".advanced-area").attr("fill",f=>{
  if(metropolis.has(f.properties.province))return "#fff";
  if(rail||airport)return "#f8fafb";
  if(st.quiz)return st.answered&&contains(f,chosen)?"#f2aa55":"#f8fafb";
  if(contains(f,chosen))return "#f0a04d";
  return list().some(i=>contains(f,i))?"#cbded9":"#f8fafb";
 }).style("pointer-events",f=>!rail&&!airport&&list().some(i=>contains(f,i))?"auto":"none");
 const dots=st.layer.select(".advanced-markers"),lines=st.layer.select(".advanced-lines");
 dots.selectAll("*").remove();lines.selectAll("*").remove();
 if(rail){
  const line=d3.line().x(ll=>st.projection(ll)[0]).y(ll=>st.projection(ll)[1]);
  list().forEach((r,index)=>{
   if(st.quiz&&index!==st.index)return;
   const coords=r.stops.map(n=>data.stations[n]).filter(Boolean);
   lines.append("path").attr("class","advanced-route").attr("d",line(coords))
    .attr("stroke",index===st.index?"#cb5f32":"#8898a8")
    .attr("stroke-width",index===st.index?4.1:1.5).attr("opacity",index===st.index?1:.38)
    .style("pointer-events",st.quiz?"none":"stroke").on("click",()=>answer(index));
  });
  chosen.stops.forEach((name,j)=>{
   const ll=data.stations[name];if(!ll)return;const p=st.projection(ll);
   const active=st.stationName===name&&!st.quiz;
   const g=dots.append("g").attr("class","advanced-station"+(active?" selected":""))
    .attr("role",st.quiz?null:"button").attr("tabindex",st.quiz?null:0)
    .attr("aria-label",name+"역 · "+(data.stationAdministrative[name]||"소재지 정보 없음"))
    .style("cursor",st.quiz?"default":"pointer")
    .on("pointerenter",ev=>showStationTooltip(name,ev))
    .on("pointermove",moveStationTooltip)
    .on("pointerleave",hideStationTooltip)
    .on("focus",ev=>showStationTooltip(name,ev))
    .on("blur",hideStationTooltip)
    .on("click",ev=>{ev.stopPropagation();hideStationTooltip();selectStation(name)})
    .on("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();selectStation(name)}});

   g.append("circle").attr("class","advanced-station-hit").attr("cx",p[0]).attr("cy",p[1]).attr("r",14)
    .attr("fill","transparent").attr("pointer-events",st.quiz?"none":"all");
   g.append("circle").attr("class","advanced-station-symbol").attr("cx",p[0]).attr("cy",p[1]).attr("r",active?7:4)
    .attr("fill",active?"#f2a550":"#fff").attr("stroke",active?"#ab451a":"#c76035").attr("stroke-width",active?2.5:1.6)
    .style("pointer-events","none");
   if((st.showLabels&&!st.quiz)||st.answered)g.append("text").attr("class","advanced-place-label")
    .attr("x",p[0]+7).attr("y",p[1]-6).text(name+"역");
  });
  return;
 }
 points().forEach(p=>{
  if(st.quiz&&cat!=="airports"&&!st.answered)return;
  const active=p.index===st.index,isHighlighted=active&&(!st.quiz||st.answered);
  const airportInfo=cat==="airports"?list()[p.index]:null;
  const g=dots.append("g").attr("class","advanced-marker"+(airportInfo?" advanced-airport":""))
   .attr("role",airportInfo&&!st.quiz?"button":null)
   .attr("tabindex",airportInfo&&!st.quiz?0:null)
   .attr("aria-label",airportInfo?airportInfo.name+" · "+airportInfo.administrative:p.name)
   .on("pointerenter",ev=>{if(airportInfo)showAirportTooltip(airportInfo,ev)})
   .on("pointermove",ev=>{if(airportInfo&&ev.pointerType!=="touch")moveStationTooltip(ev)})
   .on("pointerleave",hideStationTooltip)
   .on("focus",ev=>{if(airportInfo)showAirportTooltip(airportInfo,ev)})
   .on("blur",hideStationTooltip)
   .on("keydown",ev=>{if(airportInfo&&(ev.key==="Enter"||ev.key===" ")){ev.preventDefault();hideStationTooltip();answer(p.index)}})
   .on("click",()=>{hideStationTooltip();answer(p.index)});
  g.append("circle").attr("cx",p.p[0]).attr("cy",p.p[1]).attr("r",isHighlighted?6.5:4.7)
   .attr("stroke","#fff").attr("stroke-width",1.7).attr("fill",isHighlighted?"#ea8938":"#25768d");
  g.append("circle").attr("cx",p.p[0]).attr("cy",p.p[1]).attr("r",15).attr("fill","transparent");
  if((st.showLabels&&!st.quiz)||(st.answered&&active))g.append("text")
   .attr("class","advanced-place-label").attr("x",p.p[0]+9).attr("y",p.p[1]-9).text(p.name);
 });
}
function detail(){
 const chosen=item(),quiz=st.quiz,rail=st.category==="rail";
 const d=q("#advanced-detail",st.root),name=e(chosen.name);
 if(quiz){
  const words=rail?"지도에 강조된 철도 노선 이름은 무엇일까요?":"지도에서 다음 위치를 찾아 선택하세요: "+name;
  d.innerHTML='<div class="advanced-eyebrow">심화 위치 확인</div><h2>'+words+'</h2>'+
   '<p class="advanced-subtle">지도에 표시된 지역·공항을 클릭하세요. '+(rail?"철도는 아래 노선 이름을 선택하세요.":"")+'</p>'+
   (rail?'<div class="advanced-quizchoices">'+list().map((i,n)=>'<button data-advanced-choice="'+n+'" '+(st.answered?"disabled":"")+'>'+e(i.name)+'</button>').join("")+'</div>':"")+
   (st.answered?'<div class="advanced-answer '+(st.correct?"ok":"wrong")+'">'+(st.correct?"정답입니다.":"다시 확인해 보세요.")+'<strong>'+name+'</strong><p>'+e(chosen.description||"")+'</p></div>':"")+
   '<div class="advanced-actions"><button data-advanced-action="explore">탐색으로 돌아가기</button><button data-advanced-action="next">다음 문제</button></div>';
 }else{
  d.innerHTML='<div class="advanced-eyebrow">'+e(T.find(t=>t[0]===st.category)[1])+' · '+(st.index+1)+' / '+list().length+'</div>'+
  '<h2>'+name+'</h2><p>'+e(chosen.description||"")+'</p>'+
  (rail?'<section class="advanced-station-info" aria-live="polite">'+
    (st.stationName?'<div class="advanced-eyebrow">선택한 역 · 소재 행정구역</div><h3>'+e(st.stationName)+'역</h3>'+
     '<p class="advanced-station-address">'+e(data.stationAdministrative[st.stationName]||"소재지 확인 중")+'</p>'+
     (data.stationAdministrativeNotes?.[st.stationName]?'<p class="advanced-station-caveat">'+e(data.stationAdministrativeNotes[st.stationName])+'</p>':""):
     '<p class="advanced-station-placeholder">지도에서 역 이름을 클릭하면 실제 소재 시·도와 시·군·구가 여기에 표시됩니다.</p>')+
    '</section>':"")+
  (st.category==="airports"?'<section class="advanced-station-info" aria-live="polite">'+
   '<div class="advanced-eyebrow">공항 소재 행정구역</div><h3>'+name+'</h3>'+
   '<p class="advanced-station-address">'+e(chosen.administrative||"확인 중")+'</p></section>':"")+
  '<div class="advanced-locations"><b>'+(rail?"주요 거점역 순서 · 역명 클릭 가능":st.category==="airports"?"공항 소재 시·도 및 시·군·구":"지도 표시 지역")+'</b>'+
  (rail?'<div class="advanced-station-buttons">'+chosen.stops.map(n=>
   '<button type="button" data-advanced-station="'+e(n)+'" class="'+(st.stationName===n?"selected":"")+'">'+e(n)+'역</button>').join("")+'</div>':
   '<p>'+(st.category==="airports"?e(chosen.administrative||""):(chosen.places||[]).map(x=>e(x.join(" "))).join(" · "))+'</p>')+'</div>';
 }
 q("#advanced-items",st.root).innerHTML=list().map((i,index)=>'<button data-advanced-choice="'+index+'" class="'+(index===st.index?"selected":"")+'" '+(quiz&&!rail?"disabled":"")+'><b>'+e(i.name)+'</b><small>'+
  (rail?i.stops.length+"개 주요 거점역":e(i.description||"").slice(0,56))+'</small></button>').join("");
 q("#advanced-count",st.root).textContent=list().length+"개 항목";
 const notes={
 slow:"지산고 학습지의 15개 지역 기준입니다. 최신 국제슬로시티 인증 목록과 다를 수 있습니다.",
 innovation:"지산고 학습지의 10개 혁신도시와 대표 이전기관입니다. 복수 시·군에 걸친 사례를 포함합니다.",
 enterprise:"지산고 학습지의 4개 기업도시 사업을 표시합니다. 영암·해남은 두 지역에 걸친 사업입니다.",
 rail:"실제 선로의 굴곡이나 열차별 전 정차역이 아닙니다. 주요 거점역을 연결한 학습용 개략 노선입니다.",
 airports:"지산고 학습지의 국제공항 8곳을 근사 좌표에 표시합니다. 운항·운영 여부를 뜻하지 않습니다.",
 fez:"2026년 확인된 경제자유구역 9곳. 표시된 시·군은 소재 지역으로 법적 지정 구역의 정확한 경계가 아닙니다."
 };
 q("#advanced-note",st.root).textContent=notes[st.category];
 q("#advanced-source",st.root).href=data.source[{slow:"slow",innovation:"innovation",enterprise:"enterprise",rail:"rail",airports:"airport",fez:"fez"}[st.category]];
 q("#advanced-labelbtn",st.root).textContent=st.showLabels?"지역명 숨기기":"지역명 표시";
 q("#advanced-labelbtn",st.root).disabled=quiz;
 q("#advanced-quizbtn",st.root).hidden=quiz;
 q("#advanced-quizbtn",st.root).textContent=rail?"철도 노선 판별":"백지도 위치 맞히기";
 q("#advanced-items",st.root).setAttribute("aria-label",rail?"고속철도 노선 목록":"지역 학습 목록");
 st.root.querySelectorAll("[data-advanced-station]").forEach(button=>{
  const station=button.dataset.advancedStation;
  button.addEventListener("pointerenter",ev=>showStationTooltip(station,ev));
  button.addEventListener("pointermove",moveStationTooltip);
  button.addEventListener("pointerleave",hideStationTooltip);
  button.addEventListener("focus",ev=>showStationTooltip(station,ev));
  button.addEventListener("blur",hideStationTooltip);
 });
 if(st.category==="airports"&&!st.quiz){
  st.root.querySelectorAll("#advanced-items [data-advanced-choice]").forEach(button=>{
   const airport=list()[Number(button.dataset.advancedChoice)];
   if(!airport)return;
   button.addEventListener("pointerenter",ev=>showAirportTooltip(airport,ev));
   button.addEventListener("pointermove",ev=>{if(ev.pointerType!=="touch")moveStationTooltip(ev)});
   button.addEventListener("pointerleave",hideStationTooltip);
   button.addEventListener("focus",ev=>showAirportTooltip(airport,ev));
   button.addEventListener("blur",hideStationTooltip);
  });
 }

}
function refresh(){
 if(!st.layer)return;
 st.root.querySelectorAll("[data-advanced-tab]").forEach(x=>{
  const on=x.dataset.advancedTab===st.category;x.classList.toggle("selected",on);x.setAttribute("aria-pressed",String(on));
 });
 paint();detail();
}
function mount(){
 const r=st.root;
 r.innerHTML='<div class="advanced-tabs">'+T.map(([id,title])=>'<button data-advanced-tab="'+id+'">'+title+'</button>').join("")+'</div>'+
 '<div class="advanced-controls"><div><button id="advanced-labelbtn" data-advanced-action="labels">지역명 숨기기</button><button id="advanced-quizbtn" data-advanced-action="quiz">백지도 위치 맞히기</button></div>'+
 '<div><button data-advanced-action="plus" aria-label="확대">＋</button><button data-advanced-action="minus" aria-label="축소">－</button><button data-advanced-action="reset">초기화</button></div></div>'+
 '<div class="advanced-grid"><section class="advanced-mapbox"><header><b>우리나라 지역 심화 지도</b><small>도 경계·시군 경계 표시</small></header>'+
 '<svg id="advanced-map" viewBox="0 0 840 875" role="img" aria-label="대한민국 심화 지역 학습 지도"><g id="advanced-layer"></g></svg>'+
 '<footer>지도에서 지역과 노선을 선택하세요. 마우스와 터치로 확대·이동할 수 있습니다.</footer></section>'+
 '<aside class="advanced-sidebar"><div id="advanced-detail"></div><div class="advanced-list"><div class="advanced-listhead"><strong>학습 목록</strong><span id="advanced-count"></span></div><div id="advanced-items"></div></div></aside></div>'+
 '<div class="advanced-notes"><p id="advanced-note"></p><p><a id="advanced-source" href="#" target="_blank" rel="noopener noreferrer">관련 자료 출처 ↗</a> · 경계 기준 V-World 2023 / 철도는 개략 노선</p></div>'+
 '<div id="advanced-station-tooltip" class="advanced-station-tooltip" role="tooltip" hidden></div>';
 r.onclick=event=>{
  const tab=event.target.closest("[data-advanced-tab]");if(tab){resetCategory(tab.dataset.advancedTab);return}
  const station=event.target.closest("[data-advanced-station]");if(station){selectStation(station.dataset.advancedStation);return}
  const choice=event.target.closest("[data-advanced-choice]");if(choice){answer(Number(choice.dataset.advancedChoice));return}
  const button=event.target.closest("[data-advanced-action]");if(!button)return;
  const a=button.dataset.advancedAction;
  hideStationTooltip();
  if(a==="quiz")makeQuiz();
  if(a==="next")makeQuiz();
  if(a==="explore"){st.quiz=false;st.answered=false;refresh()}
  if(a==="labels"){st.showLabels=!st.showLabels;refresh()}
  if(a==="reset")st.svg.transition().duration(220).call(st.zoom.transform,window.d3.zoomIdentity);
  if(a==="plus")st.svg.transition().duration(220).call(st.zoom.scaleBy,1.5);
  if(a==="minus")st.svg.transition().duration(220).call(st.zoom.scaleBy,1/1.5);
 };
 st.projection=window.d3.geoMercator().fitExtent([[24,15],[816,845]],st.provinces);
 mapSetup();refresh();
}
async function render(){
 const root=document.getElementById("advanced-root");if(!root)return;
 st.root=root;
 if(!window.d3||!data){root.textContent="심화 지도에 필요한 자료가 없습니다.";return}
 const id=++st.requestId;
 root.innerHTML='<p class="advanced-loading">심화 학습 지도를 불러오는 중입니다.</p>';
 try{
  if(!st.promise)st.promise=Promise.all(["data/korea-sigun.geojson","data/korea-provinces.geojson"].map(p=>
   fetch(p+"?advanced=20261021-v1",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})))
   .catch(err=>{st.promise=null;throw err});
  [st.areas,st.provinces]=await st.promise;
  if(window.GeoLabRegions&&window.GeoLabRegions.normalizeData)st.areas=window.GeoLabRegions.normalizeData(st.areas);
  if(id!==st.requestId)return;
  if(!Array.isArray(st.areas.features)||st.areas.features.length<150||!Array.isArray(st.provinces.features)||st.provinces.features.length!==17)throw Error("행정경계 파일 형식이 올바르지 않습니다.");
  mount();
 }catch(err){if(id===st.requestId)root.innerHTML='<p class="advanced-loading">심화 지도를 열지 못했습니다: '+e(err.message)+'</p>'}
}
window.GeoLabAdvanced={render};
})();