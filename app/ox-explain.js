/* GeoLab OX 해설 검증 대장.
 *
 * 원본 데이터: tools/ox/data/ox.json, ox-extra.json.
 * 문항 / 정답 / 원문 정정해설의 변경, 요약, 자동 재서술은 금지.
 * 원본 O/X 판정과 해설이 추가 설명보다 항상 우선.
 * 검증된 문항에만 '문항 ID + 원문 전체 + 정답'으로 일치 검사를 하고 보충 해설 제공.
 * 교과서 및 신뢰할 수 있는 교육 자료와 문항별 대조하지 않은 자동 생성형 설명 금지.
 */
(function(root) {
"use strict";
const ENTRIES = Object.freeze(Object.assign({},
 root.GeoLabOX2027World||{},
 root.GeoLabOX2027Korea||{},
 root.GeoLabOX2027Batch2||{},
 root.GeoLabOX2027Batch3||{},
 root.GeoLabOX2027Batch4World||{},
 root.GeoLabOX2027Batch4Korea||{}
));

function get(id) {return Object.prototype.hasOwnProperty.call(ENTRIES,id)?ENTRIES[id]:null}
function build(q){
 // The original source is passed through literally. Never rewrite correction text.
 const source=String(q.explanation||"");
 const note=get(q.id);
 const allowed=note&&note.question===q.text&&note.answer===q.answer&&note.reviewBasis==="uploaded_EBS_2027"&&Array.isArray(note.sources)&&note.sources.length>0;
 return Object.freeze({
  correction:q.answer==="X"?source:"",
  supplement:allowed?note.explanation:"",
  checked:!!allowed,
  status:allowed?"source_checked":q.answer==="X"?"original_correction":"not_reviewed",
  curriculum:allowed?note.curriculum:"",
  verifiedWith:allowed?note.verifiedWith:""
 });
}
root.GeoLabOX=Object.freeze({build,ENTRIES});
})(typeof window!=="undefined"?window:globalThis);
