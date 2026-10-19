/* GeoLab — climate classification and station search.
 * Climate symbols are case-sensitive. Place-name search is case-insensitive.
 * Source climateGroup 'Bw' is normalized to standard Köppen 'BW' (desert).
 * H (highlands) is a supplementary teaching category, not a Köppen class.
 */
(function(root) {
  "use strict";
  const LABELS=Object.freeze({
    Af:"열대 우림", Am:"열대 몬순", Aw:"사바나",
    BW:"사막", BS:"스텝", Cfa:"온난 습윤", Cfb:"서안 해양성",
    Cs:"지중해성", Cw:"온대 겨울 건기", Df:"냉대 습윤", Dw:"냉대 겨울 건기",
    ET:"툰드라", EF:"빙설", H:"고산(참고)"
  });
  const ORDER=["Af","Am","Aw","BW","BS","Cfa","Cfb","Cs","Cw","Df","Dw","ET","EF","H"];
  function code(region) {
    const original=String(region?.climateGroup||"").trim();
    return original==="Bw"?"BW":original;
  }
  function asTerms(query) {return String(query||"").normalize("NFKC").trim().split(/\s+/).filter(Boolean)}
  function codeToken(token) {
    return ORDER.find(x=>x.toLowerCase()===String(token).toLowerCase())||null;
  }
  function placeText(region, subject) {
    const v=subject==="world"
      ?[region.name,region.englishName,region.country,region.continent,...(region.aliases||[])]
      :[region.name,region.officialName,region.nation,region.zone,...(region.aliases||[])];
    return v.filter(Boolean).join(" ").normalize("NFKC").toLocaleLowerCase("ko-KR");
  }
  function matchStation(region,query,subject) {
    const txt=placeText(region,subject);
    return asTerms(query).every(t=>{
      if(subject==="world"&&codeToken(t))return code(region)===t;
      return txt.includes(t.toLocaleLowerCase("ko-KR"));
    });
  }
  function invalidCode(query) {
    return asTerms(query).find(t=>codeToken(t)&&codeToken(t)!==t)||null;
  }
  function counts(regions) {
    const count=new Map();
    for(const r of regions){const s=code(r);if(s)count.set(s,(count.get(s)||0)+1)}
    return ORDER.filter(k=>count.has(k)).map(k=>({code:k,name:LABELS[k]||k,count:count.get(k)}));
  }
  root.GeoLabClimate=Object.freeze({LABELS,ORDER,code,asTerms,codeToken,matchStation,invalidCode,counts});
})(typeof window!=="undefined"?window:globalThis);
