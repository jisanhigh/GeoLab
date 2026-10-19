(function(){
"use strict";
const $=(selector,root)=>root.querySelector(selector);
const $$=(root,selector)=>Array.from(root.querySelectorAll(selector));
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s||"").normalize("NFKC").toLocaleLowerCase("ko-KR").trim();
const fmt=(n,d)=>n==null||n===""||!Number.isFinite(Number(n))?"—":Number(n).toLocaleString("ko-KR",{maximumFractionDigits:d==null?1:d});
const colors=["#356c99","#db7952","#2d9180","#986bac"];
const months=Array.from({length:12},(_,i)=>(i+1)+"월");
const cached={}, store={climate:{},stats:{},exam:{}};
let current={};
function raw(path){if(!cached[path])cached[path]=fetch(path).then(r=>{if(!r.ok)throw Error(path+" "+r.status);return r.json()}).then(d=>window.TwCodec?window.TwCodec.unwrap(d):d);return cached[path]}
function section(id){return document.getElementById("native-"+id)}
function safe(text){return String(text||"").replace(/<[^>]+>/g,"")}
function option(value,label,selected){return '<option value="'+esc(value)+'"'+(selected?" selected":"")+">"+esc(label)+"</option>"}
function showError(root,e){root.innerHTML='<div class="ng-empty">자료를 불러오지 못했습니다. '+esc(e.message||e)+'</div>'}
function csvDownload(filename,rows){
 const str="\ufeff"+rows.map(r=>r.map(v=>'"'+String(v==null?"":v).replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const link=document.createElement("a");const u=URL.createObjectURL(new Blob([str],{type:"text/csv;charset=utf-8"}));
 link.href=u;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(u),3000)
}
const pathFromFocus=focus=>{if(!focus||!focus.path)return null;try{return new URL(focus.path,location.href)}catch{return null}};

async function renderClimate(subject,focus){
 const root=section("climate");root.innerHTML='<p class="ng-empty">기후 지도와 관측 자료를 준비하는 중입니다.</p>';
 try{
  const path=subject==="world"?"tools/climate/data/climate-data.json":"tools/climate/data/korea-climate-data.json";
  const data=await raw(path),regions=data.regions||[];
  if(!regions.length)throw Error("관측 자료가 없습니다.");
  let st=store.climate[subject];
  if(!st){st={selected:regions.slice(0,2).map(x=>x.id),query:"",region:"all"};store.climate[subject]=st}
  const u=pathFromFocus(focus),requested=u?.searchParams.get("regions");
  if(requested&&regions.some(x=>x.id===requested)&&st.focus!==requested){st.selected=[requested];st.focus=requested}
  const groups=[...new Set(regions.map(r=>subject==="world"?r.continent:r.zone).filter(Boolean))];
  root.innerHTML='<div class="ng-controlbar"><div class="ng-maininputs"><label>지역·관측 지점 검색<input class="ng-input" id="ng-climate-search" type="search" placeholder="지점 이름, 국가, 기후형" value="'+esc(st.query)+'"></label><label>지역 선택<select class="ng-input" id="ng-climate-zone">'+option("all","전체 지역",st.region==="all")+groups.map(g=>option(g,g,st.region===g)).join("")+'</select></label></div><button class="ng-btn" id="ng-climate-csv">비교 자료 CSV</button></div>'+
  '<div class="ng-climate-grid"><div class="ng-map-card"><div class="ng-maphead"><strong>'+(subject==="world"?"세계 기후 관측 지도":"한반도 기후 관측 지도")+'</strong><span>지점 선택 · 지도 확대 가능</span><button class="ng-btn ghost" id="ng-zoomreset">지도 초기화</button></div><div class="ng-map-holder" id="ng-map-holder"></div><div class="ng-map-foot">기온·강수 평년값 1991–2020 · 원자료: twotimess</div></div><div class="ng-stations"><div class="ng-station-top"><strong>관측 지점</strong><small>최대 4곳 비교</small></div><div id="ng-station-list" class="ng-station-list"></div></div></div>'+
  '<div class="ng-selected" id="ng-selected"></div><div id="ng-climate-graphs"></div>';
  const drawList=()=>{
    const words=norm(st.query).split(/\s+/).filter(Boolean);
    const visible=regions.filter(r=>(st.region==="all"||(subject==="world"?r.continent:r.zone)===st.region)&&words.every(w=>norm([r.name,r.englishName,r.country,r.continent,r.nation,r.zone,r.climateCode,...(r.aliases||[])].join(" ")).includes(w)));
    $("#ng-station-list",root).innerHTML=visible.map(r=>'<button type="button" data-climate="'+esc(r.id)+'" class="ng-station'+(st.selected.includes(r.id)?" on":"")+'"><span>'+esc(r.name)+'<small>'+esc([subject==="world"?r.country:r.zone,subject==="world"?r.climateCode:r.nation].filter(Boolean).join(" · "))+'</small></span><b>'+(st.selected.includes(r.id)?"✓":"＋")+'</b></button>').join("")||'<p class="ng-empty">일치하는 지점이 없습니다.</p>';
    $(".ng-station-top small",root).textContent=fmt(visible.length,0)+"곳 / 최대 4곳";
  };
  const redraw=()=>{
    drawList();drawClimateGraphs(root,st,regions);
    if(st.mapMarkers)st.mapMarkers.attr("fill",r=>st.selected.includes(r.id)?"#dd7853":"#2f7694").attr("r",r=>st.selected.includes(r.id)?7.2:4.5).attr("stroke-width",r=>st.selected.includes(r.id)?2.5:1.4);
  };
  root.onclick=e=>{
    const station=e.target.closest("[data-climate]");
    if(station){const id=station.dataset.climate;const idx=st.selected.indexOf(id);if(idx>=0)st.selected.splice(idx,1);else if(st.selected.length<4)st.selected.push(id);else{alert("관측 지점은 최대 4곳까지 비교할 수 있습니다.");return}redraw();return}
    const remove=e.target.closest("[data-remove]");if(remove){st.selected=st.selected.filter(id=>id!==remove.dataset.remove);redraw();return}
    if(e.target.closest("#ng-zoomreset")&&st.zoom&&st.svg){st.svg.transition().duration(350).call(st.zoom.transform,window.d3.zoomIdentity)}
    if(e.target.closest("#ng-climate-csv")){const rs=regions.filter(r=>st.selected.includes(r.id));csvDownload((subject==="world"?"세계":"한국")+"_기후비교.csv",[["지점","항목",...months],...rs.flatMap(r=>[[r.name,"기온(℃)",...r.monthlyTemperatureC],[r.name,"강수(mm)",...r.monthlyPrecipitationMm]])])}
  };
  $("#ng-climate-search",root).addEventListener("input",e=>{st.query=e.target.value;drawList()});
  $("#ng-climate-zone",root).addEventListener("change",e=>{st.region=e.target.value;drawList()});
  redraw();
  try{await mapClimate(root,subject,st,regions,redraw)}catch(error){$("#ng-map-holder",root).innerHTML='<p class="ng-empty">지도 표시 오류: '+esc(error.message)+'</p>'}
 }catch(e){showError(root,e)}
}
function drawClimateGraphs(root,st,regions){
 const chosen=st.selected.map(id=>regions.find(r=>r.id===id)).filter(Boolean);
 $("#ng-selected",root).innerHTML=chosen.length?chosen.map((r,i)=>'<span class="ng-chip" style="--chip:'+colors[i]+'"><span class="ng-dot"></span>'+esc(r.name)+' <button type="button" data-remove="'+esc(r.id)+'" aria-label="'+esc(r.name)+' 비교에서 제외">×</button></span>').join(""):'<p class="ng-empty">지도나 목록에서 비교할 지역을 선택하세요.</p>';
 const out=$("#ng-climate-graphs",root);if(!chosen.length){out.innerHTML="";return}
 out.innerHTML='<div class="ng-chart-grid"><div class="ng-chartcard"><h3>월평균 기온 <small>℃</small></h3><div id="ng-temperature"></div></div><div class="ng-chartcard"><h3>월강수량 <small>mm</small></h3><div id="ng-precipitation"></div></div></div><div class="ng-chartcard"><h3>기후 자료 비교</h3><div class="ng-scroll"><table class="ng-table" id="ng-climate-table"></table></div></div>';
 if(window.d3){climateChart($("#ng-temperature",root),chosen,"temp");climateChart($("#ng-precipitation",root),chosen,"rain")}
 $("#ng-climate-table",root).innerHTML='<thead><tr><th>지점</th><th>항목</th>'+months.map(m=>"<th>"+m+"</th>").join("")+'</tr></thead><tbody>'+chosen.map((r,i)=>'<tr><th rowspan="2" style="border-left:3px solid '+colors[i]+'">'+esc(r.name)+'</th><td>기온(℃)</td>'+r.monthlyTemperatureC.map(x=>"<td>"+fmt(x)+"</td>").join("")+'</tr><tr><td>강수(mm)</td>'+r.monthlyPrecipitationMm.map(x=>"<td>"+fmt(x)+"</td>").join("")+'</tr>').join("")+'</tbody>';
}
function climateChart(holder,chosen,kind){
 const d3=window.d3, W=630,H=258,p={top:14,right:18,bottom:40,left:47};
 const svg=d3.select(holder).append("svg").attr("viewBox","0 0 "+W+" "+H).attr("role","img").attr("aria-label",kind==="temp"?"월평균 기온 비교":"월강수량 비교");
 const values=chosen.flatMap(r=>kind==="temp"?r.monthlyTemperatureC:r.monthlyPrecipitationMm).filter(Number.isFinite);
 const x=d3.scaleLinear().domain([0,11]).range([p.left,W-p.right]);
 const ymin=kind==="temp"?Math.floor(Math.min(-5,...values)/5)*5:0;
 const ymax=kind==="temp"?Math.ceil(Math.max(5,...values)/5)*5:Math.max(10,Math.ceil(Math.max(...values)*1.14/50)*50);
 const y=d3.scaleLinear().domain([ymin,ymax]).range([H-p.bottom,p.top]);
 svg.append("g").attr("transform","translate(0,"+(H-p.bottom)+")").call(d3.axisBottom(x).ticks(12).tickFormat(v=>(+v+1)+"월")).selectAll("text").style("font-size","10px");
 svg.append("g").attr("transform","translate("+p.left+",0)").call(d3.axisLeft(y).ticks(5)).selectAll("text").style("font-size","10px");
 svg.append("g").attr("stroke","#e3ebef").attr("opacity",.7).selectAll("line").data(y.ticks(5)).join("line").attr("x1",p.left).attr("x2",W-p.right).attr("y1",y).attr("y2",y);
 chosen.forEach((r,i)=>{
  const vals=kind==="temp"?r.monthlyTemperatureC:r.monthlyPrecipitationMm;
  if(kind==="temp"){
   svg.append("path").datum(vals).attr("fill","none").attr("stroke",colors[i]).attr("stroke-width",2.8).attr("d",d3.line().defined(Number.isFinite).x((v,j)=>x(j)).y(y));
   svg.selectAll(".ng-point-"+i).data(vals).enter().append("circle").attr("cx",(v,j)=>x(j)).attr("cy",y).attr("r",3.1).attr("fill",colors[i]).append("title").text((v,j)=>r.name+" "+(j+1)+"월: "+v+"℃");
  }else{
   const w=38/Math.max(1,chosen.length);
   svg.selectAll(".ng-bar-"+i).data(vals).enter().append("rect").attr("x",(v,j)=>x(j)-19+i*w).attr("y",v=>y(Math.max(0,v))).attr("width",Math.max(2,w-1)).attr("height",v=>Math.max(0,y(0)-y(v))).attr("fill",colors[i]).attr("opacity",.82).append("title").text((v,j)=>r.name+" "+(j+1)+"월: "+v+"mm")
  }
 });
}
async function mapClimate(root,subject,st,regions,redraw){
 const d3=window.d3,topojson=window.topojson;
 if(!d3)throw Error("지도 도구가 로드되지 않았습니다.");
 const box=$("#ng-map-holder",root);box.innerHTML="";
 const width=860,height=subject==="world"?500:550;
 const svg=d3.select(box).append("svg").attr("viewBox","0 0 "+width+" "+height).attr("role","img").attr("aria-label",subject==="world"?"관측 지점 표시 세계 지도":"한반도 관측 지도");
 const bg=svg.append("rect").attr("width",width).attr("height",height).attr("fill","#eaf2f6");
 let land,proj,border=null;
 if(subject==="world"){
   const topo=await raw("tools/climate/data/world-countries-50m.json");
   if(!topojson)throw Error("국가 경계 해석 도구가 없습니다.");
   land=topojson.feature(topo,topo.objects.countries);
   border=topojson.mesh(topo,topo.objects.countries,(a,b)=>a!==b);
   proj=d3.geoNaturalEarth1().fitExtent([[18,24],[width-18,height-28]],{type:"Sphere"});
 }else{
   land=window.KOREA_PENINSULA_GEOJSON;
   if(!land)throw Error("한반도 경계 자료가 없습니다.");
   proj=d3.geoMercator().fitExtent([[90,18],[width-90,height-18]],land);
 }
 const path=d3.geoPath(proj),zoomgroup=svg.append("g");
 if(subject==="world")zoomgroup.append("path").datum({type:"Sphere"}).attr("d",path).attr("fill","#e3eef4").attr("stroke","#a9c2d1");
 zoomgroup.append("path").datum(land).attr("d",path).attr("fill","#f8faf6").attr("stroke","#9cb0ad").attr("stroke-width",.8);
 if(border)zoomgroup.append("path").datum(border).attr("d",path).attr("fill","none").attr("stroke","#bbcaca").attr("stroke-width",.6);
 const markers=zoomgroup.selectAll("circle.ng-marker").data(regions.filter(r=>r.coordinates&&Number.isFinite(r.coordinates.longitude)&&Number.isFinite(r.coordinates.latitude)))
  .join("circle").attr("class","ng-marker").attr("cx",r=>proj([r.coordinates.longitude,r.coordinates.latitude])[0]).attr("cy",r=>proj([r.coordinates.longitude,r.coordinates.latitude])[1])
  .attr("r",r=>st.selected.includes(r.id)?7.2:4.5).attr("fill",r=>st.selected.includes(r.id)?"#dd7853":"#2f7694")
  .attr("stroke","#fff").attr("stroke-width",1.4).style("cursor","pointer").on("click",(event,r)=>{
    event.stopPropagation();if(st.selected.includes(r.id))st.selected=st.selected.filter(x=>x!==r.id);else if(st.selected.length<4)st.selected.push(r.id);else{alert("최대 4곳까지 선택할 수 있습니다.");return}redraw()
  });
 markers.append("title").text(r=>r.name+" · "+(r.climateCode||r.zone||""));
 const zoom=d3.zoom().scaleExtent([1,8]).on("zoom",e=>zoomgroup.attr("transform",e.transform));
 svg.call(zoom).on("dblclick.zoom",null);
 st.mapMarkers=markers;st.svg=svg;st.zoom=zoom;
}
function statsTables(sub){return (sub.topics||[]).flatMap(t=>(t.regions||[{title:"",id:"",tables:t.tables||[]}]).flatMap(g=>(g.tables||[]).map(tb=>({topic:t,region:g,table:tb}))))}
async function renderStats(subject,focus){
 const root=section("stats");root.innerHTML='<p class="ng-empty">통계 자료를 불러오는 중입니다.</p>';
 try{
 const data=await raw("tools/stats/data/stats.json");const sub=data.subjects[subject],all=statsTables(sub);if(!all.length)throw Error("통계표가 없습니다");
 let st=store.stats[subject];if(!st)st=store.stats[subject]={topic:sub.topics[0].id,table:null,view:0,subview:-1,col:0,descending:true,query:""};
 const u=pathFromFocus(focus);if(u&&u.pathname.includes("stats")){st.topic=u.searchParams.get("topic")||st.topic;let tableId=decodeURIComponent(u.hash.slice(1));if(tableId){let found=all.find(x=>x.table.id===tableId&&x.topic.id===st.topic);if(found)st.table=found.table.id}}
 root.innerHTML='<div class="ng-controlbar"><label>통계표 검색<input class="ng-input" id="ng-stats-search" placeholder="예: 인구, 경지 면적, 산업" value="'+esc(st.query)+'"></label><button class="ng-btn" id="ng-stats-csv">CSV 저장</button></div><div class="ng-topic-tabs" id="ng-topic-tabs"></div><div class="ng-stats-layout"><div class="ng-stats-sidebar" id="ng-stats-list"></div><div class="ng-stats-main" id="ng-stats-main"></div></div>';
 const current=()=>all.find(x=>x.topic.id===st.topic&&x.table.id===st.table)||all.find(x=>x.topic.id===st.topic)||all[0];
 const currView=()=>{const tb=current().table;const v=tb.views?.[Math.min(st.view,tb.views.length-1)];return st.subview>=0&&v?.subviews?.[st.subview]||v};
 const draw=()=>{
  $("#ng-topic-tabs",root).innerHTML=sub.topics.filter(t=>!t.climate).map(t=>'<button type="button" data-topic="'+esc(t.id)+'" class="'+(st.topic===t.id?"on":"")+'">'+esc(t.title)+'</button>').join("");
  const allInTopic=all.filter(x=>x.topic.id===st.topic&&norm(x.table.title+" "+x.region.title).includes(norm(st.query)));
  $("#ng-stats-list",root).innerHTML=allInTopic.map(x=>'<button type="button" class="ng-stat-item'+(current().table===x.table?" on":"")+'" data-table="'+esc(x.table.id)+'">'+esc(x.table.title)+(x.region.title?'<small>'+esc(x.region.title)+'</small>':"")+'</button>').join("")||'<p class="ng-empty">표가 없습니다.</p>';
  renderStatsTable(root,st,current(),currView());
 };
 root.onclick=e=>{
  let t=e.target.closest("[data-topic]");if(t){st.topic=t.dataset.topic;st.table=null;st.view=0;st.subview=-1;st.col=0;draw();return}
  t=e.target.closest("[data-table]");if(t){st.table=t.dataset.table;st.view=0;st.subview=-1;st.col=0;draw();return}
  t=e.target.closest("[data-stat-view]");if(t){st.view=Number(t.dataset.statView);st.subview=-1;st.col=0;draw();return}
  t=e.target.closest("[data-stat-subview]");if(t){st.subview=Number(t.dataset.statSubview);st.col=0;draw();return}
  t=e.target.closest("[data-stat-column]");if(t){const k=Number(t.dataset.statColumn);if(st.col===k)st.descending=!st.descending;else{st.col=k;st.descending=true}draw();return}
  if(e.target.closest("#ng-stats-csv")){let v=currView();csvDownload("GeoLab_"+current().table.title+".csv",[[v.rowLabel||"지역",...(v.columns||[]).map(c=>c.label+" ("+(c.unit||"")+")")],...(v.rows||[]).map(r=>[r.label,...r.values])])}
 };
 $("#ng-stats-search",root).addEventListener("input",e=>{st.query=e.target.value;draw()});
 if(!all.some(x=>x.topic.id===st.topic))st.topic=all[0].topic.id;
 draw();
 }catch(e){showError(root,e)}
}
function renderStatsTable(root,st,entry,view){
 const tb=entry.table;const vindex=Math.min(st.view,(tb.views||[]).length-1);const source=tb.views?.[vindex];
 if(!view){$("#ng-stats-main",root).innerHTML='<p class="ng-empty">이 표의 자료가 없습니다.</p>';return}
 const columns=view.columns||[],rows=view.rows||[];
 const title='<div class="ng-stat-title"><h2>'+esc(tb.title)+'</h2><span>'+esc(entry.topic.title)+(entry.region.title?" / "+esc(entry.region.title):"")+'</span></div>';
 const tabs='<div class="ng-view-tabs">'+(tb.views||[]).map((v,i)=>'<button data-stat-view="'+i+'" class="'+(i===vindex?"on":"")+'">'+esc(v.label||v.id)+'</button>').join("")+'</div>';
 const subs=source?.subviews?.length?'<div class="ng-view-tabs compact"><button data-stat-subview="-1" class="'+(st.subview<0?"on":"")+'">전체</button>'+source.subviews.map((v,i)=>'<button data-stat-subview="'+i+'" class="'+(st.subview===i?"on":"")+'">'+esc(v.label||v.id)+'</button>').join("")+'</div>':"";
 const safeIndex=Math.min(st.col,columns.length-1);
 const rankable=[...rows].filter(r=>r.values?.length);
 rankable.sort((a,b)=>{let aa=a.values?.[safeIndex],bb=b.values?.[safeIndex];return st.descending?(Number(bb)||0)-(Number(aa)||0):(Number(aa)||0)-(Number(bb)||0)});
 const th=columns.map((c,i)=>'<th><button data-stat-column="'+i+'">'+esc(c.label)+(c.unit?' <small>('+esc(c.unit)+')</small>':'')+(st.col===i?(st.descending?" ↓":" ↑"):"")+'</button></th>').join("");
 const table='<div class="ng-scroll"><table class="ng-table"><thead><tr><th>'+esc(view.rowLabel||"지역")+'</th>'+th+'</tr></thead><tbody>'+rankable.map(r=>'<tr><th>'+esc(r.label)+'</th>'+columns.map((c,i)=>'<td>'+fmt(r.values[i],c.digits==null?2:c.digits)+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
 const sources=(view.sources||[]).map(x=>esc(x.name||"")).filter(Boolean);
 $("#ng-stats-main",root).innerHTML=title+tabs+subs+'<div class="ng-stat-panel"><div class="ng-stat-chart-controls"><label>비교할 지표<select class="ng-input" id="ng-stat-metric">'+columns.map((c,i)=>option(i,c.label,i===st.col)).join("")+'</select></label><span>숫자를 눌러 정렬 방향을 바꿀 수 있습니다.</span></div><div id="ng-stat-chart"></div></div>'+table+(view.year||view.note||sources.length?'<p class="ng-source">'+esc([view.year,view.note,sources.join(", ")].filter(Boolean).join(" · "))+'</p>':"");
 const sel=$("#ng-stat-metric",root);if(sel)sel.onchange=e=>{st.col=Number(e.target.value);st.descending=true;renderStatsTable(root,st,entry,view)};
 if(window.d3&&columns.length)drawStatsChart($("#ng-stat-chart",root),rankable,st.col);
}
function drawStatsChart(holder,rows,col){
 const d3=window.d3;
 const entries=rows.filter(r=>Number.isFinite(Number(r.values?.[col]))).slice(0,16);
 if(!entries.length){holder.textContent="그래프에 표시할 수치가 없습니다.";return}
 const W=750,H=entries.length*27+38,left=110,right=42;
 const vals=entries.map(x=>Number(x.values[col]));
 const min=Math.min(0,...vals),max=Math.max(0,...vals);
 const x=d3.scaleLinear().domain([min===max?min-1:min,max===min?max+1:max]).range([left,W-right]);
 const svg=d3.select(holder).append("svg").attr("viewBox","0 0 "+W+" "+H).attr("role","img").attr("aria-label","통계 비교 그래프");
 entries.forEach((row,i)=>{
  const v=Number(row.values[col]),y=20+i*27;
  svg.append("text").attr("x",left-9).attr("y",y+12).attr("text-anchor","end").attr("font-size",12).text(row.label.slice(0,9));
  svg.append("rect").attr("x",Math.min(x(0),x(v))).attr("y",y).attr("width",Math.abs(x(v)-x(0))).attr("height",17).attr("rx",3).attr("fill","#3e8aa7");
  svg.append("text").attr("x",Math.max(x(0),x(v))+5).attr("y",y+12).attr("font-size",11).text(fmt(v,2));
 });
}
async function renderExam(subject,focus){
 const root=section("exam");root.innerHTML='<p class="ng-empty">기출 분석 자료를 준비하는 중입니다.</p>';
 try{
 const [d,manifest]=await Promise.all([raw("tools/cut/data/ebsi_geo_data.json"),raw("tools/cut/data/question-image-manifest.json")]);
 const records=(d.records||[]).filter(r=>r.subject===(subject==="world"?"세계지리":"한국지리")).sort((a,b)=>b.exam_year-a.exam_year||Number(b.month)-Number(a.month));
 if(!records.length)throw Error("기출 자료가 없습니다.");
 let st=store.exam[subject];if(!st)st=store.exam[subject]={key:records[0].exam_year+"-"+records[0].month,question:1};
 const u=pathFromFocus(focus),selected=u?.searchParams.get("exam");
 if(selected)st.key=selected;
 const getRecord=()=>records.find(r=>r.exam_year+"-"+r.month===st.key||r.school_year+"-"+r.month===st.key)||records[0];
 const images=(manifest.items||[]);
 const getImage=(rec,q)=>images.find(x=>x.exam_year===rec.exam_year&&String(x.month).padStart(2,"0")===String(rec.month).padStart(2,"0")&&x.question===q&&x.subject===rec.subject);
 root.innerHTML='<div class="ng-controlbar"><label>시험 선택<select class="ng-input" id="ng-exam-selector">'+records.map(r=>option(r.exam_year+"-"+r.month,r.school_year+"학년도 "+Number(r.month)+"월",r.exam_year+"-"+r.month===st.key)).join("")+'</select></label><span class="ng-exam-info">등급컷 · 오답률 · 문항 자료</span></div><div id="ng-exam-content"></div>';
 function draw(){
   const rec=getRecord();st.key=rec.exam_year+"-"+rec.month;
   const wrongs=new Map((rec.wrong_top15||[]).map(x=>[x.question,x]));
   const cuts=[1,2,3].map(n=>'<tr><th>'+n+'등급</th><td>'+fmt(rec["raw"+n],0)+'</td><td>'+fmt(rec["std"+n],0)+'</td><td>'+fmt(rec["pct"+n],0)+'</td></tr>').join("");
   const choices=Array.from({length:20},(_,i)=>{
     const n=i+1,o=wrongs.get(n);return '<button class="ng-question-button'+(st.question===n?" on":"")+'" data-exam-q="'+n+'">'+n+'번'+(o?'<small>오답 '+fmt(o.wrong_rate)+'%</small>':"")+'</button>'
   }).join("");
   const q=st.question||1,o=wrongs.get(q),img=getImage(rec,q);
   const imgurl=img?"tools/cut/"+img.url.replace(/^\.\//,""):"";
   const image=img?'<img loading="lazy" class="ng-exam-img" src="'+esc(imgurl)+'" alt="'+esc(rec.subject+" "+rec.school_year+"학년도 "+Number(rec.month)+"월 "+q+"번 문항")+'">':'<div class="ng-empty">해당 문항의 이미지가 제공되지 않습니다.</div>';
   const opts=o?.choices||[];
   const bars=opts.length?'<div class="ng-choice-data"><h4>선택지 응답 비율</h4>'+opts.map((x,i)=>'<div class="ng-choice"><span>'+(i+1)+'번'+(o.answer===i+1?" · 정답":"")+'</span><div><i style="width:'+Math.min(100,Math.max(0,Number(x)))+'%"></i></div><b>'+fmt(x)+'%</b></div>').join("")+'</div>':"";
   $("#ng-exam-content",root).innerHTML='<div class="ng-exam-summary"><div><span>원점수 평균</span><strong>'+fmt(rec.national_mean)+'</strong></div><div><span>표준편차</span><strong>'+fmt(rec.national_sd)+'</strong></div><div><span>자료 기준</span><strong>'+esc(rec.source||"EBSi")+'</strong></div></div><div class="ng-exam-columns"><div class="ng-chartcard"><h3>등급 구분점수</h3><table class="ng-table"><thead><tr><th>등급</th><th>원점수</th><th>표준점수</th><th>백분위</th></tr></thead><tbody>'+cuts+'</tbody></table></div><div class="ng-chartcard"><h3>오답률 상위 문항</h3><div class="ng-wrong-top">'+(rec.wrong_top15||[]).slice(0,10).map(x=>'<button data-exam-q="'+x.question+'"><b>'+x.question+'번</b><span>오답 '+fmt(x.wrong_rate)+'%</span></button>').join("")+'</div></div></div><div class="ng-chartcard ng-exam-questions"><h3>문항별 자료 <small>문항을 선택하세요</small></h3><div class="ng-question-grid">'+choices+'</div><div class="ng-exam-detail"><div><div class="ng-exam-qtitle"><strong>'+q+'번</strong><span>'+(!o?"오답률 자료 미제공":"오답률 "+fmt(o.wrong_rate)+"% · 정답 "+fmt(o.answer,0)+"번")+'</span></div>'+image+'</div>'+bars+'</div></div>';
   $("#ng-exam-selector",root).value=rec.exam_year+"-"+rec.month;
 }
 root.onclick=e=>{const x=e.target.closest("[data-exam-q]");if(x){st.question=Number(x.dataset.examQ);draw();x.closest(".ng-exam-questions")?.scrollIntoView({block:"nearest"})}};
 $("#ng-exam-selector",root).addEventListener("change",e=>{st.key=e.target.value;st.question=1;draw()});
 draw();
 }catch(e){showError(root,e)}
}
let activeDocument=null;
async function openDocument(path){
 if(!/^(notes|atlas-archive)\//.test(path)||path.includes("..")){alert("자료를 열 수 없습니다.");return}
 if(activeDocument)activeDocument.remove();
 const d=document.createElement("dialog");d.className="ng-document";
 d.innerHTML='<div class="ng-document-head"><strong>자료 읽기</strong><button class="ng-btn">닫기 ×</button></div><div class="ng-document-body"><div class="ng-empty">본문을 불러오는 중입니다.</div></div>';
 document.body.appendChild(d);activeDocument=d;d.showModal();
 $(".ng-document-head button",d).onclick=()=>d.close();
 d.onclose=()=>{d.remove();if(activeDocument===d)activeDocument=null};
 try{
  const r=await fetch(path);if(!r.ok)throw Error("HTTP "+r.status);
  const html=await r.text(), parsed=new DOMParser().parseFromString(html,"text/html");
  const body=parsed.querySelector("main")||parsed.body;
  body.querySelectorAll("script,style,nav,header,footer,iframe,form,button,aside,[role=navigation]").forEach(x=>x.remove());
  const clone=body.cloneNode(true),base=new URL(path,location.href);
  clone.querySelectorAll("*").forEach(node=>{
   Array.from(node.attributes||[]).forEach(attr=>{if(/^on/i.test(attr.name))node.removeAttribute(attr.name)});
   for(const tag of ["src","poster"]){const val=node.getAttribute(tag);if(val&&!/^(data:|blob:)/.test(val))node.setAttribute(tag,new URL(val,base).href)}
   if(node.tagName==="A"){const h=node.getAttribute("href");if(!h||h.startsWith("#"))return;
     const target=new URL(h,base);
     if(target.origin===location.origin && /\/(notes|atlas-archive)\//.test(target.pathname)){
       node.dataset.localdoc=target.pathname.replace(new URL(".",location.href).pathname,"");node.removeAttribute("href");node.classList.add("ng-local-link");
     }else{node.removeAttribute("href");node.classList.add("ng-source-text")}
   }
  });
  const mount=$(".ng-document-body",d);mount.textContent="";mount.appendChild(clone);
  mount.addEventListener("click",e=>{let x=e.target.closest("[data-localdoc]");if(x){d.close();openDocument(x.dataset.localdoc)}});
 }catch(e){$(".ng-document-body",d).innerHTML='<p class="ng-empty">'+esc(e.message)+'</p>'}
}
window.GeoLabNative={render:function(kind,subject,focus){if(kind==="climate")return renderClimate(subject,focus);if(kind==="stats")return renderStats(subject,focus);if(kind==="exam")return renderExam(subject,focus)},openDocument};
})();
