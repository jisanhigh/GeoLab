/* GeoLab stat cell types. Every source value is left unchanged. */
(function(root){"use strict";
const safeNumber=v=>{
 if(v===null||v===undefined||v==="")return null;
 const n=typeof v==="object"&&!Array.isArray(v)?v.value:v;
 if(typeof n==="boolean"||typeof n==="object")return null;
 if(typeof n==="string"&&n.trim()==="")return null;
 const p=Number(n);return Number.isFinite(p)?p:null;
};
const fmt=(n,d=1)=>safeNumber(n)===null?"—":safeNumber(n).toLocaleString("ko-KR",{maximumFractionDigits:d});
const cellText=(v,d=1)=>{
 if(v===null||v===undefined)return "자료 없음";
 if(typeof v==="object"&&!Array.isArray(v)){
  const name=String(v.name??"").trim();const value=safeNumber(v);
  if(name&&value!==null)return name+" · "+fmt(value,d);
  if(name)return name;
  return "표시 형식 확인 필요";
 }
 if(typeof v==="string"&&safeNumber(v)===null)return v;
 if(safeNumber(v)!==null)return fmt(v,d);
 return String(v);
};
const labelFor=(r,c)=>r.values?.[c]?.name||r.label;
const rankRows=(view,col,asc=false)=>{
 const rows=(view.rows||[]).map(r=>({row:r,val:safeNumber(r.values?.[col]),name:labelFor(r,col)}))
 .filter(x=>x.val!==null&&x.row.group!=="national"&&!["전국","합계","총계","세계","전체"].includes(x.row.label));
 return rows.sort((a,b)=>asc?a.val-b.val:b.val-a.val);
};
const isNamed=(v)=>typeof v==="object"&&v!==null&&!Array.isArray(v)&&typeof v.name==="string"&&safeNumber(v)!==null;
const isText=(v)=>typeof v==="string"&&safeNumber(v)===null;
root.GeoLabStatFormat=Object.freeze({safeNumber,fmt,cellText,labelFor,rankRows,isNamed,isText});
})(typeof window!=="undefined"?window:globalThis);
