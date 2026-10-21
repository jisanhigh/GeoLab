/* GeoLab advanced Korea geography: source versions described in advanced-data.js */
(function(){
"use strict";
const data=window.GeoLabAdvancedData;
const T=[["slow","슬로시티"],["innovation","혁신도시"],["enterprise","기업도시"],["rail","고속철도"],["airports","국제공항"],["fez","경제자유구역"]];
const e=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const q=(id,root)=>root.querySelector(id);
const st={category:"slow",index:0,showLabels:true,quiz:false,answered:false,correct:false,root:null,areas:null,provinces:null,projection:null,svg:null,zoom:null,layer:null,promise:null,requestId:0};
const list=()=>data[st.category];
const item=()=>list()[st.index];
const placeId=(p,n)=>p+" "+n;
const places=i=>(i.places||[]).map(([p,n])=>placeId(p,n));
const contains=(feature,i)=>places(i).includes(placeId(feature.properties.province,feature.properties.name));
const metropolis=new Set(["서울특별시","부산광역시","대구광역시","인천광역시","광주광역시","대전광역시","울산광역시","세종특별자치시"]);
const visibleSource={slow:"slow",innovation:"innovation",enterprise:"enterprise",rail:"rail",airports:"airport",fez:"fez"};
function resetCategory(cat){
 st.category=cat;st.index=0;st.quiz=false;st.answered=false;st.correct=false;refresh();
}
function makeQuiz(){st.quiz=true;st.index=Math.floor(Math.random()*list().length);st.answered=false;st.correct=false;refresh()}
function answer(index){
 if(!list()[index])return;
 if(st.quiz){if(st.answered)return;st.correct=index===st.index;st.answered=true}else st.index=index;
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
   if(st.category==="rail"||st.category==="airports"||metropolis.has(f.properties.province))return;
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
 }).style("pointer-events",f=>!rail&&!airport&&!metropolis.has(f.properties.province)&&list().some(i=>contains(f,i))?"auto":"none");
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
   const g=dots.append("g");g.append("circle").attr("cx",p[0]).attr("cy",p[1]).attr("r",4)
    .attr("fill","#fff").attr("stroke","#c76035").attr("stroke-width",1.6);
   if(st.showLabels&&!st.quiz||st.answered)g.append("text").attr("class","advanced-place-label").attr("x",p[0]+7).attr("y",p[1]-6).text(name);
  });
  return;
 }
 points().forEach(p=>{
  if(st.quiz&&cat!=="airports"&&!st.answered)return;
  const active=p.index===st.index,isHighlighted=active&&(!st.quiz||st.answered);
  const g=dots.append("g").attr("class","advanced-marker").on("click",()=>answer(p.index));
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
  '<div class="advanced-locations"><b>'+(rail?"주요 거점역 순서":"지도 표시 지역")+'</b><p>'+
  (rail?chosen.stops.map(e).join(" → "):(chosen.places||[]).map(x=>e(x.join(" "))).join(" · "))+'</p></div>';
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
 '<div class="advanced-notes"><p id="advanced-note"></p><p><a id="advanced-source" href="#" target="_blank" rel="noopener noreferrer">관련 자료 출처 ↗</a> · 경계 기준 V-World 2023 / 철도는 개략 노선</p></div>';
 r.onclick=event=>{
  const tab=event.target.closest("[data-advanced-tab]");if(tab){resetCategory(tab.dataset.advancedTab);return}
  const choice=event.target.closest("[data-advanced-choice]");if(choice){answer(Number(choice.dataset.advancedChoice));return}
  const button=event.target.closest("[data-advanced-action]");if(!button)return;
  const a=button.dataset.advancedAction;
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
  if(id!==st.requestId)return;
  if(!Array.isArray(st.areas.features)||st.areas.features.length<150||!Array.isArray(st.provinces.features)||st.provinces.features.length!==17)throw Error("행정경계 파일 형식이 올바르지 않습니다.");
  mount();
 }catch(err){if(id===st.requestId)root.innerHTML='<p class="advanced-loading">심화 지도를 열지 못했습니다: '+e(err.message)+'</p>'}
}
window.GeoLabAdvanced={render};
})();