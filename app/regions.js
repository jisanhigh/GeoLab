(function(){
"use strict";
const file="data/korea-sigun.geojson";
const $=(root,sel)=>root.querySelector(sel);
const E=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const identity=f=>f.properties.province+" "+f.properties.name;
const metro=new Set(["서울특별시","부산광역시","대구광역시","인천광역시","광주광역시","대전광역시","울산광역시","세종특별자치시"]);
const notes={
 "강원특별자치도 평창군":"태백산맥의 고원 지형, 대관령, 고랭지 농업 및 겨울 관광",
 "강원특별자치도 강릉시":"동해안의 해안 지형, 영동 지역과 대관령 동쪽 사면",
 "강원특별자치도 태백시":"태백산지, 과거 무연탄 산업과 광업도시의 변화",
 "강원특별자치도 정선군":"산지 지형, 석회암 지형과 과거 탄광 산업",
 "강원특별자치도 철원군":"용암대지, 한탄강과 접경 지역",
 "충청북도 단양군":"남한강 유역, 석회암 지형과 시멘트 공업",
 "충청남도 서산시":"서해안 간척지, 대산 석유화학 산업단지",
 "충청남도 당진시":"서해안의 항만과 제철 산업",
 "경기도 평택시":"평택항, 서해안 산업 및 교통의 중심지",
 "경기도 양평군":"남한강과 북한강 유역이 만나는 내륙 지역",
 "경상북도 구미시":"낙동강 중상류에 자리한 전자 산업 중심 도시",
 "경상북도 포항시":"영일만의 항만과 철강 산업",
 "경상북도 울릉군":"울릉도·독도, 화산 지형과 해양성 기후의 특징",
 "경상남도 창원시":"기계·방위 산업 및 제조업이 발달한 계획도시",
 "경상남도 거제시":"남해안의 섬과 조선 산업",
 "부산광역시 기장군":"부산 동부 해안, 원자력 발전소가 입지한 지역",
 "전라남도 여수시":"남해안의 항만과 석유화학 산업",
 "전라남도 순천시":"순천만의 갯벌과 연안 습지",
 "전라남도 보성군":"남해안의 구릉지, 차 재배",
 "제주특별자치도 제주시":"한라산 북쪽, 제주의 중심 시가지와 공항",
 "제주특별자치도 서귀포시":"한라산 남쪽, 감귤 재배와 관광",
 "전북특별자치도 군산시":"금강 하구와 서해안의 항만·산업",
 "전북특별자치도 김제시":"호남평야의 곡창 지대와 벼농사",
 "인천광역시 강화군":"강화도 일대의 도서 지역과 접경 지역"
};
const state={data:null,promise:null,mode:"all",province:"all",query:"",chosen:null,session:[],step:0,answered:false,score:0,selectedAnswer:null,zoom:null,svg:null,layer:null,paths:null,root:null,ready:false};
const kind=f=>f.properties.kind==="city"?"시":"군";
const isShown=f=>(state.province==="all"||f.properties.province===state.province)&&(!state.query||identity(f).replace(/\s/g,"").includes(state.query.replace(/\s/g,"")));
function pool(){return state.data.features.filter(f=>state.province==="all"||f.properties.province===state.province)}
function shuffle(items){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function startQuiz(){state.session=shuffle(pool()).slice(0,20);state.step=0;state.score=0;state.answered=false;state.selectedAnswer=null;state.chosen=null;draw()}
function nextQuiz(){if(!state.answered)return;if(state.step+1>=state.session.length){startQuiz();return}state.step++;state.answered=false;state.selectedAnswer=null;draw()}
function saveAnswer(f,ok){
 try{
  const key="geolab-region-score-v1";
  const records=JSON.parse(localStorage.getItem(key)||"{}");
  const id=identity(f),entry=records[id]||{attempts:0,correct:0};
  entry.attempts++;if(ok)entry.correct++;records[id]=entry;
  localStorage.setItem(key,JSON.stringify(records));
 }catch(_){}
}
function renderPanel(){
 const r=state.root,p=state.data.features,provinces=[...new Set(p.map(f=>f.properties.province))].sort((a,b)=>a.localeCompare(b,"ko"));
 r.innerHTML='<div class="rg-toolbar"><div class="rg-tabs" role="group" aria-label="지역 학습 방식">'+
 ['all','city','county','quiz'].map((m,i)=>'<button type="button" data-rg-mode="'+m+'">'+['전체 보기','시만 보기','군만 보기','시·군 판별 퀴즈'][i]+'</button>').join("")+
 '</div><div class="rg-filters"><label>시·도 선택<select id="rg-province">'+
 '<option value="all">전국</option>'+provinces.map(v=>'<option value="'+E(v)+'">'+E(v)+'</option>').join("")+'</select></label>'+
 '<label>지역 찾기<input id="rg-search" type="search" placeholder="시·군 이름 검색" autocomplete="off"></label></div></div>'+
 '<div class="rg-layout"><div class="rg-map"><div class="rg-maphead"><strong>대한민국 시·군 지도</strong><div><button class="rg-mini" id="rg-zoomin" type="button" aria-label="지도 확대">＋</button><button class="rg-mini" id="rg-zoomout" type="button" aria-label="지도 축소">－</button><button class="rg-mini" id="rg-zoomreset" type="button">초기화</button></div></div>'+
 '<svg id="rg-svg" viewBox="0 0 840 875" role="img" aria-label="시와 군의 위치를 클릭해 확인하는 대한민국 백지도"><g id="rg-zoomlayer"></g></svg>'+
 '<div class="rg-legend"><span><i class="rg-key city"></i> 시(도시)</span><span><i class="rg-key county"></i> 군</span><span id="rg-counts"></span></div></div>'+
 '<aside class="rg-side"><div id="rg-detail"></div><div class="rg-results"><strong>지역 목록</strong><small id="rg-resultcount"></small><div id="rg-list"></div></div></aside></div>'+
 '<p class="rg-source">행정경계 원자료: 국가공간정보포털(V-World, 2023년), 가공: KnellBalm/kr-admin-geojson. 2026년과 경계 차이가 있을 수 있습니다. 구 단위는 합쳐서 표시하며 특별·광역·특별자치시는 도시 전체를 시 유형으로 묶어 보여줍니다.</p>';
 $("#rg-province",r).value=state.province;
 $("#rg-search",r).value=state.query;
 r.addEventListener("click",event=>{
  const mode=event.target.closest("[data-rg-mode]");
  if(mode){state.mode=mode.dataset.rgMode;state.chosen=null;if(state.mode==="quiz"){state.query="";$("#rg-search",r).value="";startQuiz()}else draw();return}
  if(event.target.closest("#rg-zoomin")){state.svg.transition().duration(220).call(state.zoom.scaleBy,1.6);return}
  if(event.target.closest("#rg-zoomout")){state.svg.transition().duration(220).call(state.zoom.scaleBy,1/1.6);return}
  if(event.target.closest("#rg-zoomreset")){state.svg.transition().duration(220).call(state.zoom.transform,window.d3.zoomIdentity);return}
  const choice=event.target.closest("[data-rg-answer]");
  if(choice&&state.mode==="quiz"&&!state.answered){
   const f=state.session[state.step];if(!f)return;
   state.answered=true;state.selectedAnswer=choice.dataset.rgAnswer;
   const ok=state.selectedAnswer===f.properties.kind;
   if(ok)state.score++;saveAnswer(f,ok);draw();return;
  }
  if(event.target.closest("#rg-next")){nextQuiz();return}
  const item=event.target.closest("[data-rg-item]");
  if(item&&state.mode!=="quiz"){
   const i=Number(item.dataset.rgItem);const f=state.data.features[i];
   if(f){state.chosen=f;draw()}return;
  }
 });
 $("#rg-province",r).addEventListener("change",e=>{state.province=e.target.value;state.chosen=null;if(state.mode==="quiz")startQuiz();else draw()});
 $("#rg-search",r).addEventListener("input",e=>{state.query=e.target.value.trim();state.chosen=null; if(state.mode==="quiz"){state.mode="all"}draw()});
 mapInit();
 draw();
}
function mapInit(){
 const d3=window.d3,features=state.data.features,svg=d3.select($("#rg-svg",state.root));
 const projection=d3.geoMercator().fitExtent([[22,15],[818,845]],state.data),path=d3.geoPath(projection);
 const layer=svg.select("#rg-zoomlayer");
 const shapes=layer.selectAll("path").data(features).enter().append("path").attr("class","rg-region").attr("d",path).attr("data-rg-feature",(d,i)=>i)
  .attr("tabindex",0).attr("role","button").on("click",(event,f)=>{
   if(state.mode==="quiz"||!isShown(f))return;
   state.chosen=f;draw();
  }).on("keydown",(event,f)=>{
   if(state.mode==="quiz"||!isShown(f)||!["Enter"," "].includes(event.key))return;
   event.preventDefault();state.chosen=f;draw();
  });
 state.zoom=d3.zoom().scaleExtent([1,15]).on("zoom",event=>layer.attr("transform",event.transform));
 svg.call(state.zoom).on("dblclick.zoom",null);
 state.svg=svg;state.layer=layer;state.paths=shapes;
}
function draw(){
 if(!state.root||!state.data)return;
 const r=state.root,quiz=state.mode==="quiz",question=quiz?state.session[state.step]:null;
 r.querySelectorAll("[data-rg-mode]").forEach(b=>{const on=b.dataset.rgMode===state.mode;b.classList.toggle("active",on);b.setAttribute("aria-pressed",on?"true":"false")});
 $("#rg-search",r).disabled=quiz;
 const match=state.data.features.filter(isShown),visible=match.filter(f=>state.mode==="all"||quiz||f.properties.kind===state.mode);
 $("#rg-counts",r).textContent=visible.length+"개 지역";
 state.paths.attr("fill",f=>{
   if(quiz)return f===question?"#f3a340":"#e5ebef";
   if(!isShown(f))return "#f0f3f5";
   if(state.mode!=="all"&&f.properties.kind!==state.mode)return "#e7ebef";
   if(f===state.chosen)return "#ee9b47";
   return f.properties.kind==="city"?"#3e88ab":"#96bd9c";
 }).attr("opacity",f=>quiz?(f===question?1:.72):!isShown(f)?.45:1)
 .attr("aria-label",f=>quiz?"백지도 지역":identity(f)+" "+kind(f))
 .attr("aria-disabled",quiz?"true":"false")
 .classed("selected",f=>!quiz&&f===state.chosen)
 .style("pointer-events",f=>quiz||!isShown(f)?"none":"auto");
 const d=$("#rg-detail",r);
 if(quiz){
   if(!question){d.innerHTML='<div class="rg-detailcard">선택한 시·도에 지역이 없습니다.</div>';return}
   const over=state.answered&&state.step===state.session.length-1;
   d.innerHTML='<div class="rg-detailcard"><div class="rg-kicker">백지도 판별 퀴즈 · '+(state.step+1)+' / '+state.session.length+'</div>'+
   '<h2>색칠된 지역은 시일까요, 군일까요?</h2><p class="rg-muted">지역 이름을 보기 전에 위치와 형태를 확인하세요.</p>'+
   '<div class="rg-answers"><button data-rg-answer="city" '+(state.answered?"disabled":"")+'>시</button><button data-rg-answer="county" '+(state.answered?"disabled":"")+'>군</button></div>'+
   (state.answered?'<div class="rg-feedback '+(state.selectedAnswer===question.properties.kind?"yes":"no")+'">'+
    (state.selectedAnswer===question.properties.kind?"정답입니다.":"오답입니다.")+' <b>'+E(identity(question))+' · '+kind(question)+'</b>'+
    (notes[identity(question)]?'<p>'+E(notes[identity(question)])+'</p>':"")+'</div>':"")+
   '<div class="rg-quizfoot"><span>정답 '+state.score+'개 / '+(state.step+(state.answered?1:0))+'문항</span>'+
   '<button class="rg-primary" type="button" id="rg-next" '+(state.answered?"":"disabled")+'>'+(over?"다시 풀기":"다음 문제")+'</button></div></div>';
   $("#rg-list",r).innerHTML='<p class="rg-muted">퀴즈 중에는 정답 지역명이 노출되지 않습니다.</p>';
   $("#rg-resultcount",r).textContent="";return;
 }
 if(state.chosen){
  const f=state.chosen,n=identity(f),info=notes[n];
  d.innerHTML='<div class="rg-detailcard"><span class="rg-kicker">선택한 지역</span><h2>'+E(f.properties.name)+'</h2>'+
   '<div class="rg-type">'+kind(f)+' <small>'+E(f.properties.province)+'</small></div>'+
   (info?'<h3>한국지리 핵심 특징</h3><p>'+E(info)+'</p>':'<p class="rg-muted">지도에서 위치와 주변 시·군을 살펴보세요. 이 지역의 상세 학습 자료는 추후 추가할 수 있습니다.</p>')+
   (metro.has(f.properties.name)?'<p class="rg-muted">특별시·광역시·특별자치시는 이 학습 지도에서 하나의 도시로 묶어 표시합니다.</p>':"")+'</div>';
 }else{
  d.innerHTML='<div class="rg-detailcard"><span class="rg-kicker">지역 위치 학습</span><h2>'+({"all":"시와 군을 구분해 보세요","city":"시만 강조한 지도","county":"군만 강조한 지도"}[state.mode])+'</h2>'+
  '<p>색칠된 지역을 클릭하면 이름과 소속 시·도, 주요 지리 특징이 표시됩니다.</p><p class="rg-muted">마우스 휠·두 손가락으로 확대할 수 있습니다. 시와 군을 각각 선택해 분포를 비교해 보세요.</p></div>';
 }
 $("#rg-resultcount",r).textContent=visible.length+"개";
 $("#rg-list",r).innerHTML=visible.slice(0,110).map(f=>'<button type="button" data-rg-item="'+state.data.features.indexOf(f)+'" class="'+(f===state.chosen?"on":"")+'">'+E(f.properties.name)+'<span>'+E(f.properties.province)+' · '+kind(f)+'</span></button>').join("")+
 (visible.length>110?'<small>110개까지 표시됩니다. 시·도를 선택하거나 이름을 검색하세요.</small>':"")+
 (visible.length===0?'<p class="rg-muted">검색 결과가 없습니다.</p>':"");
}
async function render(){
 if(!state.root)state.root=document.getElementById("region-root");
 if(!state.root)return;
 if(!window.d3){state.root.textContent="지도를 표시하는 데 필요한 라이브러리를 찾을 수 없습니다.";return}
 state.root.innerHTML='<p class="rg-loading">지역 지도 데이터를 불러오는 중입니다.</p>';
 try{
  if(!state.promise)state.promise=fetch(file).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()});
  state.data=await state.promise;
  const features=state.data.features;
  if(!Array.isArray(features)||features.length<150||features.some(f=>!["city","county"].includes(f.properties.kind)))throw Error("시·군 경계 자료가 올바르지 않습니다.");
  state.chosen=null;
  state.ready=true;renderPanel();
 }catch(e){state.root.innerHTML='<p class="rg-loading">지역 지도를 불러올 수 없습니다: '+E(e.message)+'</p>'}
}
window.GeoLabRegions={render};
})();