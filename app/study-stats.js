(function(root){
"use strict";
/* Student-first presentation of existing official statistics; source values untouched. */
const MENU={
 world:[
 ["인구·도시",[["world-population-compare",0,"대륙·국가별 인구"],["world-08d3586a",0,"국가별 인구 구조"],["world-urbanization-history",1,"주요 국가 도시화율"],["world-ca743699",0,"국제 이주자 상위 국가"]]],
 ["농업·식량",[["world-crop-rank",0,"곡물 생산 상위 국가"],["world-crop-trade-rank",0,"곡물 수출입 상위 국가"],["world-livestock-rank",0,"가축 사육 상위 국가"],["world-b2858416",0,"기호 작물 생산 국가"]]],
 ["에너지·자원",[["world-primary-energy-rank",0,"1차 에너지 공급 상위 국가"],["world-energy-compare--continent",0,"대륙별 에너지"],["world-energy-compare--country",3,"주요 국가별 에너지"],["world-fossil-energy-balance",3,"화석연료 생산·소비"],["world-renewable-generation-rank",2,"신·재생 에너지 발전 국가"]]],
 ["산업·무역",[["world-e30c1073",0,"국가별 산업 구조"],["world-6baf531c",0,"국가별 수출입 구성"],["world-ec1c1e8d",0,"세계 제조업 비중 변화"]]],
 ["문화·종교",[["world-religion-compare",3,"주요 국가의 종교 구성"],["world-religion-rank",0,"종교별 신자 수 상위 국가"]]],
 ["지역별 특징",[["world-monsoon-compare",0,"몬순 아시아·오세아니아"],["world-dry-compare",0,"건조 아시아·북부 아프리카"],["world-africa-latin-compare",0,"사하라 이남 아프리카·중남미"]]]
 ],
 korea:[
 ["인구·도시",[["korea-population-compare",0,"시도별 인구·인구 밀도"],["korea-daytime-compare",0,"상주 인구와 주간 인구"],["korea-city-rank",1,"권역별 도시 인구"],["korea-f50d9521",0,"노년층 인구 비율"]]],
 ["산업·서비스",[["korea-industry-compare",0,"시도별 제조업"],["korea-manufacturing-sectors-province",0,"지역별 제조업 업종"],["korea-6631e12e",3,"지역별 소매업"]]],
 ["농업·식량",[["korea-agriculture-compare",0,"시도별 농가와 경지"],["korea-crop-share-national",2,"작물별 재배 면적"],["korea-e379c174",0,"주요 작물 생산량"]]],
 ["에너지·자원",[["korea-energy-compare",0,"시도별 에너지"],["korea-generation-mix",1,"시도별 발전량"],["korea-renewable-production",0,"신·재생 에너지 생산"]]],
 ["지역·남북한",[["korea-capital-compare",0,"수도권 주요 지표"],["korea-532f0cf7",0,"남한과 북한의 주요 지표"],["korea-north-compare",0,"남북한 농업 지표"]]]
 ]};
const stStore={},q=(root,id)=>root.querySelector(id);
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const lower=s=>String(s??"").normalize("NFKC").toLocaleLowerCase("ko-KR");
const number=n=>(n===null||n===undefined||n===""||!Number.isFinite(Number(n)))?null:Number(n);
const fmt=(n,d)=>number(n)===null?"—":Number(n).toLocaleString("ko-KR",{maximumFractionDigits:d??1});
function allTables(d,subject){
 const sub=d.subjects?.[subject];
 if(!sub||!root.GeoLabStats)throw Error("통계 자료가 없습니다.");
 return (sub.topics||[]).flatMap(t=>root.GeoLabStats.tablesForTopic(t,subject));
}
function featured(d,s){
 const lookup=new Map(allTables(d,s).map(e=>[e.table.id,e]));
 return (MENU[s]||[]).map((p,i)=>({name:p[0],key:String(i),items:p[1].map(it=>{
 const e=lookup.get(it[0]);return e?{entry:e,label:it[2],view:Math.min(it[1],e.table.views.length-1)}:null;
 }).filter(Boolean)}));
}
function ranked(view,col,asc){
 return (view.rows||[]).map(r=>({row:r,val:number(r.values?.[col])}))
 .filter(x=>x.val!==null&&x.row.group!=="national"&&!["전국","합계","총계","세계","전체"].includes(x.row.label))
 .sort((a,b)=>asc?a.val-b.val:b.val-a.val);
}
function csv(filename,view){
 const rows=[[view.rowLabel||"지역",...(view.columns||[]).map(c=>[c.label,c.year||view.year,c.unit].filter(Boolean).join(" / "))],
 ...(view.rows||[]).map(r=>[r.label,...(r.values||[])])];
 const text="\ufeff"+rows.map(r=>r.map(x=>'"'+String(x??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const url=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download="GeoLab_"+filename.replace(/[\\/:*?"<>|]/g,"_")+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function bars(holder,rows,digits,unit,limit){
 const d3=root.d3;
 if(!d3){holder.textContent="그래프를 표시할 수 없습니다.";return}
 const values=rows.slice(0,limit);
 if(!values.length){holder.textContent="이 지표에는 그래프로 표시할 수치가 없습니다.";return}
 const width=720,height=values.length*30+14,left=154,right=105;
 const nums=values.map(x=>x.val),min=Math.min(0,...nums),max=Math.max(0,...nums);
 const x=d3.scaleLinear().domain(min===max?[min-1,max+1]:[min,max]).range([left,width-right]);
 const svg=d3.select(holder).append("svg").attr("viewBox","0 0 "+width+" "+height).attr("role","img").attr("aria-label","지역별 수치 비교 그래프");
 values.forEach((v,i)=>{
   const y=6+i*30;
   svg.append("text").attr("x",left-8).attr("y",y+14).attr("text-anchor","end").attr("font-size",12).text(v.row.label.length>11?v.row.label.slice(0,10)+"…":v.row.label);
   svg.append("rect").attr("x",Math.min(x(0),x(v.val))).attr("y",y).attr("width",Math.max(1,Math.abs(x(0)-x(v.val)))).attr("height",19).attr("fill","#397b9f").attr("rx",3);
   svg.append("text").attr("x",Math.max(x(0),x(v.val))+6).attr("y",y+14).attr("font-size",11).text(fmt(v.val,digits));
 });
}
let remote;
function render(subject,focus){
 const host=document.getElementById("native-stats");
 host.innerHTML='<p class="es-wait">통계 자료를 불러오는 중입니다.</p>';
 remote=remote||fetch("tools/stats/data/stats.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>root.TwCodec?root.TwCodec.unwrap(d):d);
 remote.then(d=>mount(host,d,subject,focus)).catch(e=>{host.innerHTML='<p class="es-wait">자료를 불러오지 못했습니다. '+E(e.message)+'</p>'});
}
function mount(host,d,subject,focus){
 const all=allTables(d,subject),curated=featured(d,subject),ids=new Map(all.map(x=>[x.table.id,x]));
 const st=stStore[subject]||(stStore[subject]={mode:"core",cat:"0",query:"",table:null,view:0,metric:0,asc:false,limit:10});
 const linked=focus?.path?new URL(focus.path,location.href):null;
 if(linked?.pathname.includes("stats")){
   const id=decodeURIComponent(linked.hash.slice(1)),e=ids.get(id)||ids.get(id+"--continent");
   if(e){st.mode="all";st.cat=e.topic.id;st.table=e.table.id;st.view=0;st.metric=0;}
 }
 if(!ids.has(st.table)){
   const first=curated.flatMap(x=>x.items)[0];
   st.table=first?.entry.table.id||all[0].table.id;
   st.view=first?.view||0;
 }
 const current=()=>ids.get(st.table)||all[0];
 host.innerHTML='<div class="es-top"><div><strong>수능 자료 해석</strong><p>지역별 순위·비율·분포를 비교할 통계를 선택하세요.</p></div><div class="es-mode"><button data-es-mode="core">핵심 통계</button><button data-es-mode="all">전체 자료</button></div></div>'+
 '<div id="es-cats" class="es-cats"></div><div id="es-choices" class="es-choices"></div><section id="es-detail" class="es-detail"></section>';
 const drawNav=()=>{
   host.querySelectorAll("[data-es-mode]").forEach(b=>b.classList.toggle("on",b.dataset.esMode===st.mode));
   const list=st.mode==="core"?curated.map(x=>({key:x.key,name:x.name,count:x.items.length})):
    d.subjects[subject].topics.filter(t=>t.id!=="climate").map(t=>({key:t.id,name:t.title,count:all.filter(x=>x.topic.id===t.id).length}));
   q(host,"#es-cats").innerHTML=[{key:"all",name:"전체",count:st.mode==="core"?curated.reduce((n,x)=>n+x.items.length,0):all.length},...list].map(x=>'<button data-es-cat="'+E(x.key)+'" class="'+(st.cat===x.key?"on":"")+'">'+E(x.name)+' <small>'+x.count+'</small></button>').join("");
   if(st.mode==="core"){
     const rows=curated.filter(x=>st.cat==="all"||st.cat===x.key).flatMap(x=>x.items.map(i=>({...i,group:x.name})));
     q(host,"#es-choices").innerHTML='<p class="es-tip">수능 자료 해석에 활용도가 높은 통계부터 배치했습니다. 원하는 자료를 선택하세요.</p><div class="es-picks">'+rows.map(x=>'<button data-es-table="'+E(x.entry.table.id)+'" data-es-start="'+x.view+'" class="'+(st.table===x.entry.table.id?"on":"")+'"><small>'+E(x.group)+'</small><strong>'+E(x.label)+'</strong><span>'+E(x.entry.table.views[x.view]?.label||"자료 비교")+'</span></button>').join("")+'</div>';
   }else{
     const needle=lower(st.query).trim();
     const rows=all.filter(x=>(st.cat==="all"||x.topic.id===st.cat)&&(!needle||lower([x.table.title,x.topic.title,x.region.title,...x.table.views.map(v=>v.label),...x.table.views.flatMap(v=>(v.columns||[]).map(c=>c.label))].join(" ")).includes(needle)));
     q(host,"#es-choices").innerHTML='<div class="es-searchrow"><input type="search" id="es-search" placeholder="통계명·지표 검색" value="'+E(st.query)+'" aria-label="통계 검색"><small>검색 결과 '+rows.length+'개</small></div><div class="es-all">'+rows.map(x=>'<button data-es-table="'+E(x.table.id)+'" class="'+(st.table===x.table.id?"on":"")+'">'+E(x.table.title)+' <small>'+E(x.topic.title)+(x.region.title?" · "+E(x.region.title):"")+'</small></button>').join("")+'</div>';
   }
 };
 const drawDetail=()=>{
   const ent=current(),table=ent.table,view=table.views[Math.min(st.view,table.views.length-1)];
   if(!view){q(host,"#es-detail").innerHTML='<p class="es-wait">표에 자료가 없습니다.</p>';return}
   const cols=view.columns||[];st.metric=Math.max(0,Math.min(st.metric,cols.length-1));
   const col=cols[st.metric]||{label:"수치"},unit=col.unit||"",dec=col.digits??1,rows=ranked(view,st.metric,st.asc);
   const years=[col.year,view.year,...(view.sources||[]).map(x=>x.year)].filter(Boolean);
   const src=[...new Set((view.sources||[]).map(x=>x.name).filter(Boolean))];
   const quick=rows.slice(0,3).map(x=>E(x.row.label)+" "+fmt(x.val,dec)).join(" · ");
   const title='<div class="es-dtitle"><div><small>'+E(ent.topic.title)+(ent.region.title?" · "+E(ent.region.title):"")+'</small><h2>'+E(table.title)+'</h2></div><button data-es-export>CSV 저장</button></div>';
   const views=table.views.length>1?'<div class="es-views">'+table.views.map((v,i)=>'<button data-es-view="'+i+'" class="'+(i===st.view?"on":"")+'">'+E(v.label||"자료 "+(i+1))+'</button>').join("")+'</div>':"";
   const controls='<div class="es-controls"><label>비교 지표<select id="es-metric">'+cols.map((c,i)=>'<option value="'+i+'"'+(i===st.metric?" selected":"")+'>'+E(c.label)+(c.unit?" ("+E(c.unit)+")":"")+'</option>').join("")+'</select></label><label>정렬<select id="es-order"><option value="desc"'+(!st.asc?" selected":"")+'>값 큰 순서</option><option value="asc"'+(st.asc?" selected":"")+'>값 작은 순서</option></select></label><label>그래프 표시<select id="es-limit"><option value="10"'+(st.limit===10?" selected":"")+'>상위 10개</option><option value="20"'+(st.limit===20?" selected":"")+'>20개</option><option value="9999"'+(st.limit===9999?" selected":"")+'>전체</option></select></label></div>';
   const meta='<div class="es-meta"><span>단위 <b>'+E(unit||"원자료 확인")+'</b></span><span>기준 <b>'+E([...new Set(years)].join(" / ")||"출처 확인")+'</b></span><span>지역 <b>'+rows.length+'개</b></span></div>';
   const reading='<div class="es-reading"><strong>자료 확인</strong><p>수치의 크기뿐 아니라 단위와 기준 연도를 확인하고, 절대량과 비율을 구분하세요.</p>'+(quick?'<p><b>'+(st.asc?"낮은 값":"높은 값")+' 순서</b> '+quick+'</p>':"")+'</div>';
   const head='<thead><tr><th>'+E(view.rowLabel||"지역")+'</th>'+cols.map((c,i)=>'<th><button data-es-col="'+i+'">'+E(c.label)+(c.unit?' <small>'+E(c.unit)+'</small>':'')+(c.year?' <em>'+E(c.year)+'</em>':'')+'</button></th>').join("")+'</tr></thead>';
   const ordered=[...(view.rows||[])].sort((a,b)=>{const a1=number(a.values?.[st.metric]),b1=number(b.values?.[st.metric]);if(a1===null)return 1;if(b1===null)return -1;return st.asc?a1-b1:b1-a1});
   const tb='<div class="es-table-wrap"><table>'+head+'<tbody>'+ordered.map(r=>'<tr><th>'+E(r.label)+'</th>'+cols.map((c,i)=>'<td class="'+(i===st.metric?"selected":"")+'">'+fmt(r.values?.[i],c.digits??1)+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
   q(host,"#es-detail").innerHTML=title+views+meta+reading+controls+'<div class="es-grid"><div class="es-chartbox"><strong>'+E(col.label)+' 비교</strong><div id="es-chart"></div></div><div class="es-tablebox"><strong>원자료 전체</strong>'+tb+'</div></div><p class="es-source">출처 '+E(src.join(", ")||"원본 통계")+ (view.note?' · '+E(view.note):"")+'</p>';
   bars(q(host,"#es-chart"),rows,dec,unit,st.limit);
 };
 const draw=()=>{drawNav();drawDetail()};
 host.onclick=e=>{
  let b=e.target.closest("[data-es-mode]");if(b){st.mode=b.dataset.esMode;st.cat=st.mode==="core"?"0":"all";draw();return}
  b=e.target.closest("[data-es-cat]");if(b){st.cat=b.dataset.esCat;drawNav();return}
  b=e.target.closest("[data-es-table]");if(b){st.table=b.dataset.esTable;st.view=Number(b.dataset.esStart||0);st.metric=0;st.asc=false;draw();q(host,"#es-detail").scrollIntoView({behavior:"smooth",block:"start"});return}
  b=e.target.closest("[data-es-view]");if(b){st.view=Number(b.dataset.esView);st.metric=0;drawDetail();return}
  b=e.target.closest("[data-es-col]");if(b){st.metric=Number(b.dataset.esCol);drawDetail();return}
  if(e.target.closest("[data-es-export]")){const ent=current();csv(ent.table.title,ent.table.views[st.view]||ent.table.views[0])}
 };
 host.onchange=e=>{
  if(e.target.id==="es-metric"){st.metric=Number(e.target.value);drawDetail()}
  if(e.target.id==="es-order"){st.asc=e.target.value==="asc";drawDetail()}
  if(e.target.id==="es-limit"){st.limit=Number(e.target.value);drawDetail()}
 };
 host.oninput=e=>{if(e.target.id!=="es-search")return;st.query=e.target.value;const caret=e.target.selectionStart;drawNav();const n=q(host,"#es-search");n.focus();n.setSelectionRange(caret,caret)};
 draw();
}
root.GeoLabExamStats=Object.freeze({render,allTables,featured,ranked,MENU});
})(typeof window!=="undefined"?window:globalThis);
