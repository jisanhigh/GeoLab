/* GeoLab statistics table presentation helpers.
   Changes the grouping only. No numeric values or source metadata are modified.
*/
(function(root){
  "use strict";
  const CONTINENTS=new Set(["아시아","아프리카","유럽","라틴 아메리카","앵글로아메리카","오세아니아"]);
  const SPLIT={
    "world-energy-compare":{
      continent:"대륙별 에너지",
      country:"주요 국가별 에너지"
    },
    "world-8cf8c2b8":{
      continent:"대륙별 수력 제외 신·재생 에너지 발전",
      country:"주요 국가별 수력 제외 신·재생 에너지 발전"
    }
  };
  function splitTable(table,subject){
    const titles=subject==="world"&&SPLIT[table.id];
    if(!titles)return [table];
    return ["continent","country"].map(kind=>({
      ...table,
      id:table.id+"--"+kind,
      originalId:table.id,
      title:titles[kind],
      geographicScope:kind,
      views:(table.views||[]).map(view=>({
        ...view,
        rows:(view.rows||[]).filter(row=>CONTINENTS.has(row.label)===(kind==="continent"))
      }))
    }));
  }
  function tablesForTopic(topic,subject){
    const groups=topic.regions||[{id:"",title:"",tables:topic.tables||[]}];
    return groups.flatMap(region=>(region.tables||[]).flatMap(table=>
      splitTable(table,subject).map(t=>({topic,region,table:t}))
    ));
  }
  const api=Object.freeze({CONTINENTS,SPLIT,splitTable,tablesForTopic});
  root.GeoLabStats=api;
})(typeof window!=="undefined"?window:globalThis);
