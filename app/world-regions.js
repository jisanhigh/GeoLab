/* GeoLab | world geography locality explorer
 * Industrial clusters and conflicts are represented by approximate learning markers,
 * never by asserted industry-zone boundaries or disputed borders. */
(function(){
"use strict";
const data=window.GeoLabWorldRegionsData;
const $=(s,root)=>root.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const P={root:null,data:null,promise:null,mode:"industry",area:"유럽",group:"전체",chosen:null,showNames:true,quiz:null,done:false,lastAnswer:null,svg:null,layer:null,projection:null,zoom:null,pins:null,map:null,token:0};
const confAreas=["전체","아시아","유럽","아프리카","북아메리카"];
const groupLabels={industry:"공업 지역",conflicts:"분쟁 지역"};
const list=()=>data[P.mode];
const areaType=entry=>P.mode==="industry"?entry.continent:
  entry.continent==="동아시아"||entry.continent==="동남아시아"||entry.continent==="남아시아"||entry.continent==="서남아시아"?"아시아":entry.continent;
const setOf=()=>list().filter(x=>P.area==="전체"||areaType(x)===P.area);
const choices=()=>setOf().filter(x=>P.group==="전체"||x.group===P.group);
const initSelection=()=>{P.chosen=choices()[0]?.id||null;P.quiz=null;P.done=false;P.lastAnswer=null;};
const current=()=>list().find(x=>x.id===P.chosen)||null;
function projection(){
 const d3=window.d3;
 const specs={
 "유럽":{center:[12,56.5],scale:700},
 "북아메리카":{center:[-101,39],scale:535},
 "아시아":{center:[87,28],scale:365},
 "아프리카":{center:[18,2],scale:395}
 };
 if(P.mode==="conflicts"&&P.area==="전체"){
  const maker=d3.geoNaturalEarth1||d3.geoMercator;
  return maker().fitExtent([[18,20],[880,580]],P.data);
 }
 const conf=P.mode==="conflicts"?P.area:P.area;
 const spec=specs[conf]||specs["유럽"];
 return d3.geoMercator().center(spec.center).scale(spec.scale).translate([450,305]);
}
function paintMap(){
 if(!P.layer)return;
 const d3=window.d3,entry=current(),allowed=choices(),allowedIds=new Set(allowed.map(x=>x.id)),quiz=Boolean(P.quiz);
 const dots=P.layer.select(".wr-dots");dots.selectAll("*").remove();
 const features=list();
 features.forEach(x=>{
  if(P.area!=="전체"&&areaType(x)!==P.area)return;
  const pixel=P.projection(x.point);if(!pixel||!pixel.every(Number.isFinite))return;
  const active=quiz?x.id===P.quiz.item.id:x.id===entry?.id,enabled=allowedIds.has(x.id);
  const showLabel=!quiz&&P.showNames&&enabled;
  const group=dots.append("g").attr("class","wr-pin"+(active?" current":""))
   .attr("role",quiz?null:"button").attr("tabindex",quiz?null:0)
   .attr("aria-label",quiz?"지도 위치":x.name+" · "+(x.location||x.parties))
   .style("cursor",quiz?"default":"pointer")
   .on("pointerenter",event=>{if(!quiz&&enabled)showTip(x,event)})
   .on("pointermove",moveTip).on("pointerleave",hideTip)
   .on("focus",event=>{if(!quiz&&enabled)showTip(x,event)})
   .on("blur",hideTip)
   .on("click",()=>{if(quiz||!enabled)return;P.chosen=x.id;refreshDetail();paintMap();})
   .on("keydown",event=>{if(quiz||!enabled||!["Enter"," "].includes(event.key))return;event.preventDefault();P.chosen=x.id;refreshDetail();paintMap();});
  group.append("circle").attr("cx",pixel[0]).attr("cy",pixel[1]).attr("r",16).attr("fill","transparent").attr("pointer-events",quiz?"none":"all");
  group.append("circle").attr("cx",pixel[0]).attr("cy",pixel[1]).attr("r",active?7.6:5.2)
    .attr("fill",active?"#eb8b35":enabled?"#327d96":"#a6bcc5")
    .attr("stroke","#fff").attr("stroke-width",active?2.2:1.35)
    .attr("opacity",enabled||active?1:.45).attr("pointer-events","none");
  if(showLabel||quiz&&active&&P.done){
   group.append("text").attr("class","wr-label").attr("x",pixel[0]+10).attr("y",pixel[1]-8)
    .attr("pointer-events",quiz?"none":"all").text(x.name);
  }
 });
 const count=allowed.length;
 $("#wr-count",P.root).textContent=count+"개 지역";
}
function hideTip(){const tip=$("#wr-tip",P.root);if(tip)tip.hidden=true;}
function showTip(x,event){
 const t=$("#wr-tip",P.root);if(!t||P.quiz)return;
 t.innerHTML="<strong>"+esc(x.name)+"</strong><span>"+esc(x.location||x.parties)+"</span>";
 t.hidden=false;moveTip(event);
}
function moveTip(event){
 const t=$("#wr-tip",P.root);if(!t||t.hidden)return;
 let x=event?.clientX,y=event?.clientY;
 if(!Number.isFinite(x)||!Number.isFinite(y)){
  const rect=event?.currentTarget?.getBoundingClientRect?.();if(!rect)return;
  x=rect.left+rect.width/2;y=rect.top+rect.height/2;
 }
 const w=t.offsetWidth||190,h=t.offsetHeight||62;
 t.style.left=Math.max(8,Math.min(window.innerWidth-w-8,x+14))+"px";
 t.style.top=(y+h+20<window.innerHeight?y+14:Math.max(8,y-h-10))+"px";
}
function swapMap(){
 if(!P.root||!P.data)return;
 hideTip();
 P.projection=projection();
 const d3=window.d3,svg=d3.select($("#wr-map",P.root)),layer=svg.select("#wr-world-layer");
 layer.selectAll("*").remove();
 layer.append("g").attr("class","wr-base").selectAll("path")
 .data(P.data.features).enter().append("path").attr("class","wr-country")
 .attr("d",d3.geoPath(P.projection)).attr("aria-hidden","true");
 layer.append("g").attr("class","wr-dots");
 P.zoom=d3.zoom().scaleExtent([1,10]).on("zoom",event=>layer.attr("transform",event.transform));
 svg.on(".zoom",null).call(P.zoom).on("dblclick.zoom",null);
 layer.attr("transform",null);
 P.svg=svg;P.layer=layer;
 paintMap();
}
function questionOptions(correct,items){
 const choices=items.filter(x=>x.id!==correct.id);
 for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
 const options=[correct,...choices.slice(0,3)];
 for(let i=options.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
 return options;
}
function nextQuiz(){
 const pool=choices();if(pool.length<4)return;
 const newPool=pool.filter(x=>x.id!==P.quiz?.item?.id);
 const item=newPool[Math.floor(Math.random()*newPool.length)]||pool[0];
 P.quiz={item,options:questionOptions(item,pool)};
 P.done=false;P.lastAnswer=null;hideTip();refresh();
}
function launchQuiz(){
 if(choices().length<4)return;
 P.quiz=null;nextQuiz();
}
function submitQuiz(id){
 if(!P.quiz||P.done)return;
 P.done=true;P.lastAnswer=id;
 refreshDetail();paintMap();
}
function endQuiz(){P.quiz=null;P.done=false;P.lastAnswer=null;refresh();}
function beliefInfo(x){
 if(!x?.beliefStudy)return "";
 const study=x.beliefStudy;
 const heading=study.type==="ethnic"?"주요 민족 집단":study.type==="belief"?"관련 종교":"관련 집단의 주요 종교";
 return '<section class="wr-belief" aria-label="'+esc(heading)+'">'+
  '<h3>'+esc(heading)+'</h3>'+
  '<div class="wr-belief-grid">'+study.people.map(p=>'<div class="wr-belief-person">'+
   '<span>'+esc(p.label)+'</span><strong>'+esc(p.belief)+'</strong></div>').join("")+'</div>'+
  '<p class="wr-belief-note">'+esc(study.summary)+'</p></section>';
}
function entryInfo(x){
 if(!x)return "";
 if(P.mode==="industry")return '<div class="wr-eyebrow">'+esc(x.country)+' · '+esc(x.group)+'</div>'+
  '<h2>'+esc(x.name)+'</h2><p class="wr-place">'+esc(x.location)+'</p>'+
  '<div class="wr-fact"><b>주요 산업</b><p>'+esc(x.keywords)+'</p></div>'+
  '<div class="wr-fact"><b>입지 및 변화</b><p>'+esc(x.description)+'</p></div>';
 return '<div class="wr-eyebrow">'+esc(x.continent)+' · 대표 유형: '+esc(x.group)+'</div>'+
  '<h2>'+esc(x.name)+'</h2>'+beliefInfo(x)+'<div class="wr-fact"><b>주요 관련 국가·집단</b><p>'+esc(x.parties)+'</p></div>'+
  '<div class="wr-fact"><b>주요 쟁점</b><p>'+esc(x.keywords)+'</p></div>'+
  '<div class="wr-fact"><b>교재 중심 배경</b><p>'+esc(x.description)+'</p></div>'+
  '<p class="wr-caution">'+esc(x.note)+'</p>';
}
function refreshDetail(){
 const container=$("#wr-detail",P.root),listbox=$("#wr-list",P.root);
 if(P.quiz){
  const opts=P.quiz.options.map(x=>
   '<button type="button" data-wr-answer="'+esc(x.id)+'" '+(P.done?"disabled":"")+
   ' class="'+(P.done&&x.id===P.quiz.item.id?"correct":P.done&&P.lastAnswer===x.id?"incorrect":"")+'">'+esc(x.name)+'</button>').join("");
  container.innerHTML='<div class="wr-eyebrow">백지도 위치 확인</div>'+
   '<h2>주황색으로 표시된 지역은 어디일까요?</h2><p class="wr-quiet">선택한 대륙·유형 범위에서 출제됩니다. 지도의 명칭은 답을 고르면 확인할 수 있습니다.</p>'+
   '<div class="wr-choices">'+opts+'</div>'+
   (P.done?'<div class="wr-feedback '+(P.lastAnswer===P.quiz.item.id?"right":"wrong")+'">'+
    (P.lastAnswer===P.quiz.item.id?"정답입니다.":"정답: "+esc(P.quiz.item.name))+'</div>'+
    '<div class="wr-quizexpl">'+entryInfo(P.quiz.item)+'</div>':"")+
   '<div class="wr-quizcontrols"><button type="button" data-wr-action="exit">탐색으로 돌아가기</button><button type="button" data-wr-action="next">다음 문제</button></div>';
  listbox.innerHTML="";
 }else{
  container.innerHTML=entryInfo(current());
  listbox.innerHTML=choices().map(x=>'<button type="button" data-wr-choice="'+esc(x.id)+'" class="'+(x.id===P.chosen?"selected":"")+'">'+
   '<strong>'+esc(x.name)+'</strong><small>'+esc(x.group)+' · '+esc(x.location||x.parties)+'</small></button>').join("");
 }
 $("#wr-quiz-btn",P.root).hidden=Boolean(P.quiz);
 $("#wr-names-btn",P.root).hidden=Boolean(P.quiz);
 $("#wr-names-btn",P.root).textContent=P.showNames?"지명 숨기기":"지명 표시";
 $("#wr-info",P.root).textContent=P.mode==="industry"?
 "지도 표식은 공업 지역의 대표 도시·클러스터 위치이며 산업 범위의 정확한 경계가 아닙니다. 2027학년도 수능완성 세계지리 14단원 기준으로 정리했습니다.":
 "분쟁 유형은 학습 편의를 위해 대표적인 쟁점 하나로 표시합니다. 실제로는 영토·민족·종교·정치 문제가 함께 얽힐 수 있습니다. 지도 점은 학습용 대표 위치일 뿐 특정 영토 주장이나 현재 분쟁 상태를 의미하지 않습니다.";
}
function refresh(){
 if(!P.root||!P.data)return;
 const areaContainer=$("#wr-areas",P.root),catContainer=$("#wr-cats",P.root);
 areaContainer.innerHTML=(P.mode==="industry"?["유럽","북아메리카"]:confAreas).map(x=>
  '<button type="button" class="'+(P.area===x?"selected":"")+'" data-wr-area="'+x+'">'+x+'</button>').join("");
 const available=setOf();
 // Conflict categories have a stable curriculum order and every example appears in one primary group.
 const groups=P.mode==="conflicts"
  ?["전체",...data.conflictCategories.filter(group=>available.some(x=>x.group===group))]
  :["전체",...new Set(available.map(x=>x.group))];
 if(!groups.includes(P.group))P.group="전체";
 catContainer.innerHTML=groups.map(group=>{
  const count=group==="전체"?available.length:available.filter(x=>x.group===group).length;
  const caption=P.mode==="conflicts"?'<span class="wr-filter-count">'+count+'</span>':"";
  return '<button type="button" data-wr-group="'+esc(group)+'" class="'+(P.group===group?"selected":"")+'">'+esc(group)+caption+'</button>';
 }).join("");
 $("#wr-modeindustry",P.root).classList.toggle("selected",P.mode==="industry");
 $("#wr-modeconflicts",P.root).classList.toggle("selected",P.mode==="conflicts");
 $("#wr-section-title",P.root).textContent=P.mode==="industry"?"유럽·북아메리카 공업 지역":"세계의 주요 분쟁 지역";
 $("#wr-list-title",P.root).textContent=groupLabels[P.mode];
 $("#wr-quiz-btn",P.root).disabled=choices().length<4;
 if(!choices().some(x=>x.id===P.chosen))P.chosen=choices()[0]?.id||null;
 refreshDetail();swapMap();
}
function mount(){
 P.root.innerHTML='<div class="wr-heading"><div><small>세계지리 · 위치 중심 학습</small><h1 id="wr-section-title">유럽·북아메리카 공업 지역</h1><p>지역을 선택하면 위치와 수능 핵심 개념을 함께 볼 수 있습니다.</p></div>'+
  '<div class="wr-mode"><button type="button" id="wr-modeindustry" data-wr-mode="industry">공업 지역</button><button type="button" id="wr-modeconflicts" data-wr-mode="conflicts">분쟁 지역</button></div></div>'+
  '<div class="wr-filter"><div class="wr-areas" id="wr-areas"></div><div class="wr-cats" id="wr-cats"></div></div>'+
  '<div class="wr-controlbar"><div><button id="wr-names-btn" data-wr-action="names">지명 숨기기</button><button id="wr-quiz-btn" data-wr-action="quiz">백지도 위치 문제</button></div>'+
  '<div><button aria-label="지도 확대" data-wr-action="plus">＋</button><button aria-label="지도 축소" data-wr-action="minus">－</button><button data-wr-action="reset">지도 초기화</button></div></div>'+
  '<div class="wr-grid"><div class="wr-mapcard"><div class="wr-maphead"><strong>위치 학습 지도</strong><small id="wr-count"></small></div>'+
  '<svg id="wr-map" viewBox="0 0 900 610" aria-label="세계 공업·분쟁 지역 지도" role="img"><g id="wr-world-layer"></g></svg>'+
  '<div class="wr-mapfoot">점을 클릭해 지역 정보를 확인하세요. 지도 위치는 대표 지점입니다.</div></div>'+
  '<aside class="wr-sidebar"><div class="wr-detail" id="wr-detail"></div><div class="wr-listbox"><div class="wr-listhead"><strong id="wr-list-title">공업 지역</strong></div><div class="wr-list" id="wr-list"></div></div></aside></div>'+
  '<div class="wr-notes"><p id="wr-info"></p><p>학습 자료: '+esc(data.source)+' 지도 경계는 학습 참고용이며 국제적으로 논쟁 중인 경계를 판정하지 않습니다.</p></div>'+
  '<div class="wr-tooltip" id="wr-tip" role="tooltip" hidden></div>';
 P.root.onclick=event=>{
  const t=event.target.closest("[data-wr-mode]");if(t){
   P.mode=t.dataset.wrMode;P.area=P.mode==="industry"?"유럽":"전체";P.group="전체";initSelection();refresh();return;
  }
  const area=event.target.closest("[data-wr-area]");if(area){P.area=area.dataset.wrArea;P.group="전체";initSelection();refresh();return}
  const cat=event.target.closest("[data-wr-group]");if(cat){P.group=cat.dataset.wrGroup;initSelection();refresh();return}
  const pick=event.target.closest("[data-wr-choice]");if(pick){P.chosen=pick.dataset.wrChoice;hideTip();refreshDetail();paintMap();return}
  const answer=event.target.closest("[data-wr-answer]");if(answer){submitQuiz(answer.dataset.wrAnswer);return}
  const btn=event.target.closest("[data-wr-action]");if(!btn)return;
  switch(btn.dataset.wrAction){
   case "quiz":launchQuiz();break;case "next":nextQuiz();break;case "exit":endQuiz();break;
   case "names":P.showNames=!P.showNames;refreshDetail();paintMap();break;
   case "plus":P.svg.transition().duration(200).call(P.zoom.scaleBy,1.5);break;
   case "minus":P.svg.transition().duration(200).call(P.zoom.scaleBy,1/1.5);break;
   case "reset":P.svg.transition().duration(200).call(P.zoom.transform,window.d3.zoomIdentity);break;
  }
 };
 initSelection();refresh();
}
async function render(){
 const root=document.getElementById("worldregion-root");if(!root)return;
 P.root=root;
 if(!window.d3||!data){root.textContent="지도 라이브러리 또는 세계지리 학습 자료를 불러올 수 없습니다.";return}
 root.innerHTML='<p class="wr-loading">세계지리 지역 탐구 지도를 준비하고 있습니다.</p>';
 const token=++P.token;
 try{
  if(!P.promise)P.promise=fetch("data/world-countries.geojson?worldregions=20261021-v2",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).catch(e=>{P.promise=null;throw e});
  const map=await P.promise;
  if(token!==P.token)return;
  if(!Array.isArray(map.features)||map.features.length<160)throw Error("세계 행정경계 자료가 올바르지 않습니다.");
  P.data=map;mount();
 }catch(err){if(token===P.token)root.innerHTML='<p class="wr-loading">지역 탐구 지도를 열 수 없습니다: '+esc(err.message)+'</p>'}
}
window.GeoLabWorldRegions={render};
})();