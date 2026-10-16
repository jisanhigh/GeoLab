(function() {
"use strict";
const el=id=>document.getElementById(id);
const E=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const N=v=>String(v||"").normalize("NFKC").toLowerCase().trim();
const F=v=>typeof v==="number"?v.toLocaleString("ko-KR"):v==null?"—":v;
const state={s:"world",view:"home",mode:"all",ch:"all",q:null,answered:false,kind:"all",lib:"all",limit:36,ox:[],climate:[],stats:[],exams:[],docs:[],index:[],hits:[],ready:false};
const SUB=s=>s==="world"?"세계지리":"한국지리";
function record(){try{return JSON.parse(localStorage.getItem("geolab-learning-"+state.s)||"{}")}catch(e){return {}}}
function write(v){try{localStorage.setItem("geolab-learning-"+state.s,JSON.stringify(v))}catch(e){}}
function toast(s){const o=el("toast");o.textContent=s;o.style.display="block";clearTimeout(toast.timer);toast.timer=setTimeout(()=>o.style.display="none",1900)}
function goto(view,sub,historyPush){
 if(sub==="world"||sub==="korea")state.s=sub;
 state.view=view;document.body.dataset.subject=state.s;
 document.querySelectorAll(".panel").forEach(x=>x.classList.toggle("active",x.id==="panel-"+view));
 document.querySelectorAll("[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
 document.querySelectorAll("[data-subject]").forEach(x=>x.classList.toggle("active",x.dataset.subject===state.s));
 el("homeTitle").textContent=SUB(state.s);el("subjectLabel").textContent=state.s==="world"?"WORLD GEOGRAPHY":"KOREAN GEOGRAPHY";
 if(historyPush!==false)history.pushState(null,"","#"+state.s+"/"+view);
 if(view==="home")home();
 if(view==="ox"){chapterSelect();question(false)}
 if(view==="search")search();
 if(view==="library")library();
 if(["climate","stats","exam"].includes(view))module(view);
 window.scrollTo(0,0);
}
function module(which){
 const path=which==="climate"?(state.s==="world"?"tools/climate/index.html":"tools/climate/korea.html"):which==="stats"?"tools/stats/index.html?subject="+state.s:"tools/cut/index.html?subject="+state.s;
 const f=el("frame-"+which);if(f.dataset.route!==path){f.src=path;f.dataset.route=path}
}
function bank(){return state.ox.filter(x=>x.subject===state.s)}
function home(){
 const qs=bank(),r=record(),done=qs.filter(q=>r[q.id]&&r[q.id].seen).length,wrong=qs.filter(q=>r[q.id]&&r[q.id].wrong).length;
 el("progressLine").textContent=state.ready?done+"문항 학습 · 복습할 문항 "+wrong+"개":"학습 자료를 불러오는 중입니다.";
 el("progressBar").style.width=(qs.length?100*done/qs.length:0)+"%";
 el("wrongCount").textContent=wrong;el("oxTotal").textContent=F(qs.length);
 el("climateTotal").textContent=F(state.climate.filter(x=>x.subject===state.s).length);
 el("statsTotal").textContent=F(state.stats.filter(x=>x.subject===state.s).length);
 const map=new Map();qs.forEach(q=>{if(!map.has(q.chapter))map.set(q.chapter,[0,0]);let x=map.get(q.chapter);x[0]++;if(r[q.id]&&r[q.id].seen)x[1]++});
 el("chapterTiles").innerHTML=Array.from(map).map(p=>'<button class="chapter" data-chapter="'+E(p[0])+'">'+E(p[0])+'<small>'+p[1][1]+'/'+p[1][0]+'문항 학습</small></button>').join("")||'<p class="hint">자료를 불러오는 중입니다.</p>';
}
function stat(){
 let qs=bank(),r=record();
 el("studyDone").textContent=qs.filter(q=>r[q.id]&&r[q.id].seen).length;
 el("studyRight").textContent=qs.filter(q=>r[q.id]&&r[q.id].seen&&!r[q.id].wrong).length;
 el("studyWrong").textContent=qs.filter(q=>r[q.id]&&r[q.id].wrong).length;
}
function chapterSelect(){
 const opts=Array.from(new Set(bank().map(q=>q.chapter)));
 if(state.ch!=="all"&&!opts.includes(state.ch))state.ch="all";
 el("chapterSelect").innerHTML='<option value="all">전체 단원</option>'+opts.map(x=>'<option value="'+E(x)+'">'+E(x)+'</option>').join("");
 el("chapterSelect").value=state.ch;
 document.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===state.mode));stat();
}
function pool(){const r=record();return bank().filter(q=>(state.ch==="all"||q.chapter===state.ch)&&(state.mode==="all"||state.mode==="wrong"&&r[q.id]&&r[q.id].wrong||state.mode==="saved"&&r[q.id]&&r[q.id].saved))}
function pick(qs){if(!qs.length)return null;let r=record(),p=qs.filter(q=>q!==state.q),choices=p.length?p:qs;let weights=choices.map(x=>r[x.id]&&r[x.id].wrong?7:r[x.id]&&r[x.id].seen?1:5),n=Math.random()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<choices.length;i++){n-=weights[i];if(n<=0)return choices[i]}return choices[0]}
function question(keep){
 const options=pool();if(!keep||!state.q||!options.some(q=>q.id===state.q.id))state.q=pick(options);
 state.answered=false;const q=state.q;
 el("quizCounter").textContent=options.length+"문항";
 el("questionChapter").textContent=q?q.chapter+" · "+q.group:"학습 범위";
 el("questionText").textContent=q?q.text:(state.mode==="wrong"?"복습할 오답이 없습니다.":state.mode==="saved"?"저장한 문항이 없습니다.":"문항을 불러오는 중입니다.");
 el("feedback").hidden=true;el("feedback").innerHTML="";
 document.querySelectorAll(".answer").forEach(b=>{b.disabled=!q;b.classList.remove("correct","incorrect")});
 el("saveQuestion").disabled=!q;el("nextQuestion").disabled=!q;
 el("saveQuestion").textContent=q&&record()[q.id]&&record()[q.id].saved?"★ 저장됨":"☆ 문항 저장";stat();
}
function answer(a){
 let q=state.q;if(!q||state.answered)return;state.answered=true;let ok=a===q.answer,r=record();
 r[q.id]=Object.assign({},r[q.id],{seen:true,wrong:!ok,tries:((r[q.id]||{}).tries||0)+1});
 write(r);
 document.querySelectorAll(".answer").forEach(b=>{b.disabled=true;if(b.dataset.answer===q.answer)b.classList.add("correct");else if(b.dataset.answer===a&&!ok)b.classList.add("incorrect")});
 const f=el("feedback");f.hidden=false;
 f.innerHTML="<b>"+(ok?"정답입니다.":"오답입니다.")+" 정답: "+E(q.answer)+"</b>"+E(q.explanation||"해설이 없는 문항입니다.").replace(/\[([^\]]+)\]/g,"<em>$1</em>");
 stat();
}
function add(kind,subject,title,desc,sub,extra){
 state.index.push(Object.assign({kind,subject,title,desc,sub,hay:N([title,desc,sub].join(" "))},extra||{}));
}
function oxData(d,extra){
 Object.entries(d.subjects||{}).forEach(([s,v])=>(v.chapters||[]).forEach(c=>(c.groups||[]).forEach(g=>(g.items||[]).forEach(q=>{
 const id=s+":"+(extra?"ext":"base")+":"+c.no+":"+g.title+":"+q.n;
 const item={id,subject:s,chapter:c.title||"기타",group:g.title,text:q.t,answer:q.a,explanation:q.f||""};
 state.ox.push(item);add("ox",s,q.t,q.f||"OX 문제",c.title+" · "+g.title,{id,chapter:item.chapter})
 }))));
}
function climateData(d,s){(d.regions||[]).forEach(x=>{
 state.climate.push({subject:s,name:x.name});
 add("climate",s,x.name,"연평균 "+F(x.annualMeanTemperatureC)+"℃ · 연강수량 "+F(x.annualPrecipitationMm)+"mm",[x.country||x.nation||x.continent||x.zone,x.climateCode||x.zone].filter(Boolean).join(" · "));
})}
function statsData(d){Object.entries(d.subjects||{}).forEach(([s,sub])=>(sub.topics||[]).forEach(t=>(t.regions||[{title:"",tables:t.tables||[]}]).forEach(g=>(g.tables||[]).forEach(tb=>{
 state.stats.push({subject:s,title:tb.title});
 const labels=(tb.views||[]).flatMap(v=>(v.columns||[]).map(x=>x.label).concat((v.rows||[]).map(x=>x.label))).slice(0,100);
 add("stats",s,tb.title,labels.join(" · "),t.title+(g.title?" / "+g.title:""));
}))))}
function examsData(d){(d.records||[]).forEach(x=>{
 let s=x.subject==="세계지리"?"world":"korea",t=x.school_year+"학년도 "+Number(x.month)+"월 "+x.subject;
 state.exams.push({subject:s,title:t});add("exam",s,t,"1등급 "+F(x.raw1)+"점 · 평균 "+F(x.national_mean)+"점","등급컷·오답률");
})}
function catalogData(d){state.docs=d.map(x=>Object.assign({},x,{hay:N([x.title,x.type,x.text].join(" "))}));state.docs.forEach(x=>add("library","all",x.title,(x.text||"").slice(0,500),x.type,{url:x.url}))}
const labels={ox:"OX 문항",climate:"기후 관측",stats:"통계표",exam:"기출 분석",library:"읽기 자료"};
function hits(){const terms=N(el("searchInput").value).split(/\s+/).filter(Boolean);return terms.length?state.index.filter(x=>(x.subject==="all"||x.subject===state.s)&&(state.kind==="all"||x.kind===state.kind)&&terms.every(t=>x.hay.includes(t))):[]}
function search(){
 const items=hits();state.hits=items;const txt=N(el("searchInput").value);
 el("searchCount").textContent=state.ready?(txt?F(items.length)+"건 검색됨":"검색어를 입력해 주세요."):"자료를 불러오는 중입니다.";
 el("searchResults").innerHTML=!txt?'<div class="empty">검색어를 입력하면 자료가 표시됩니다.</div>':!items.length?'<div class="empty">검색 결과가 없습니다.</div>':items.slice(0,70).map((x,i)=>
 '<button class="result" data-hit="'+i+'"><span class="type">'+E(labels[x.kind])+'</span><strong>'+E(x.title)+'</strong><p>'+E(x.desc)+'</p><div class="footnote">'+E(x.sub)+' · 자료 보기 →</div></button>').join("");
}
function documentView(url){
 const d=document.createElement("dialog");d.className="document-dialog";
 const bar=document.createElement("div");bar.className="dialogbar";bar.innerHTML='<strong>원문 자료</strong><button class="btn outline">닫기 ×</button>';
 const f=document.createElement("iframe");f.title="자료 본문";f.src=url;d.append(bar,f);
 bar.querySelector("button").onclick=()=>d.close();d.onclose=()=>d.remove();document.body.appendChild(d);d.showModal();
}
function openHit(x){
 if(!x)return;
 if(x.kind==="library"){documentView(x.url);return}
 if(x.kind==="ox"){
 state.mode="all";state.ch=x.chapter;goto("ox",x.subject);state.q=state.ox.find(q=>q.id===x.id)||null;question(true);return
 }
 goto(x.kind,x.subject);toast("해당 과목 자료를 표시합니다.");
}
function library(){
 const terms=N(el("librarySearch").value).split(/\s+/).filter(Boolean);
 const list=state.docs.filter(x=>(state.lib==="all"||x.type===state.lib)&&terms.every(t=>x.hay.includes(t)));
 el("libraryCount").textContent=F(list.length)+"개 자료";
 el("libraryResults").innerHTML=list.slice(0,state.limit).map(x=>
 '<button class="result" data-document="'+E(x.url)+'"><span class="type">'+E(x.type)+'</span><strong>'+E(x.title)+'</strong><p>'+E((x.text||"").slice(0,140))+'</p><div class="footnote">원문 보기 →</div></button>').join("")||'<div class="empty">검색 결과가 없습니다.</div>';
 el("libraryMore").hidden=list.length<=state.limit;
}
async function data(){
 const paths=["tools/ox/data/ox.json","tools/ox/data/ox-extra.json","tools/climate/data/climate-data.json","tools/climate/data/korea-climate-data.json","tools/stats/data/stats.json","tools/cut/data/ebsi_geo_data.json","catalog.json"];
 const results=await Promise.allSettled(paths.map(async p=>{let r=await fetch(p);if(!r.ok)throw Error(p+" "+r.status);let d=await r.json();return window.TwCodec?window.TwCodec.unwrap(d):d}));
 results.forEach((x,i)=>{if(x.status!=="fulfilled"){console.warn("GeoLab fetch failed:",paths[i],x.reason);return}try{let d=x.value;
 if(i<2)oxData(d,i===1);if(i===2)climateData(d,"world");if(i===3)climateData(d,"korea");
 if(i===4)statsData(d);if(i===5)examsData(d);if(i===6)catalogData(d)
 }catch(e){console.error("GeoLab parse failed",paths[i],e)}});
 state.ready=true;goto(state.view,state.s,false);
 if(!state.ox.length)toast("OX 자료를 불러오지 못했습니다.");
}
document.addEventListener("click",e=>{
 const s=e.target.closest("[data-subject]");if(s){state.ch="all";state.q=null;goto(state.view,s.dataset.subject);return}
 const v=e.target.closest("[data-view]");if(v){goto(v.dataset.view);return}
 const c=e.target.closest("[data-chapter]");if(c){state.ch=c.dataset.chapter;state.q=null;goto("ox");return}
 const m=e.target.closest("[data-mode]");if(m){state.mode=m.dataset.mode;state.q=null;chapterSelect();question(false);return}
 const a=e.target.closest("[data-answer]");if(a){answer(a.dataset.answer);return}
 const k=e.target.closest("[data-kind]");if(k){state.kind=k.dataset.kind;document.querySelectorAll("[data-kind]").forEach(b=>b.classList.toggle("active",b===k));search();return}
 const l=e.target.closest("[data-lib]");if(l){state.lib=l.dataset.lib;state.limit=36;document.querySelectorAll("[data-lib]").forEach(b=>b.classList.toggle("active",b===l));library();return}
 const h=e.target.closest("[data-hit]");if(h){openHit(state.hits[+h.dataset.hit]);return}
 const d=e.target.closest("[data-document]");if(d){documentView(d.dataset.document);return}
 const ex=e.target.closest("[data-expand]");if(ex){const fr=el("frame-"+ex.dataset.expand);if(fr.src)location.assign(fr.src);return}
});
el("chapterSelect").onchange=e=>{state.ch=e.target.value;state.q=null;question(false)};
el("nextQuestion").onclick=()=>question(false);
el("saveQuestion").onclick=()=>{const q=state.q;if(!q)return;let r=record();r[q.id]=r[q.id]||{};r[q.id].saved=!r[q.id].saved;write(r);el("saveQuestion").textContent=r[q.id].saved?"★ 저장됨":"☆ 문항 저장"};
el("reviewHome").onclick=()=>{state.mode="wrong";state.ch="all";state.q=null;goto("ox")};
el("resetProgress").onclick=()=>{if(confirm(SUB(state.s)+"의 학습 기록을 초기화할까요?")){write({});state.q=null;question(false)}};
el("searchInput").oninput=search;el("clearSearch").onclick=()=>{el("searchInput").value="";search()};
el("librarySearch").oninput=()=>{state.limit=36;library()};
el("libraryMore").onclick=()=>{state.limit+=36;library()};
window.addEventListener("popstate",()=>{let a=location.hash.substring(1).split("/");goto(a[1]||"home",a[0]||"world",false)});
const route=location.hash.substring(1).split("/");
goto(route[1]||"home",route[0]||"world",false);
data();
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();