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
const ENTRIES = Object.freeze({
 "korea:base:01:위치:6":Object.freeze({
  question:"우리나라 표준 경선은 동경 135°이다.",
  answer:"O",
  explanation:"우리나라 표준시는 동경 135°를 기준으로 하며, 협정 세계시보다 9시간 빠릅니다. 국토의 중앙 경선인 동경 127° 30′과 표준 경선을 혼동하지 않아야 합니다.",
  verifiedWith:"지학사 《한국지리》 핵심큐(수리적 위치·표준 경선); 국토지리정보원 국토정보 용어사전(표준자오선)",
  curriculum:"2015 개정 한국지리 - 국토의 위치와 영역",
  sources:["https://new.jihak.co.kr/upload/public/pdf-viewer/RF/334033.pdf","https://www.codil.or.kr/filebank/original/DI/OTMCDI051380/OTMCDI051380.pdf"]
 }),
 "world:base:01:태양과 기온:1":Object.freeze({
  question:"열대 기후 지역은 최한월 평균 기온이 18℃ 이상이다.",
  answer:"O",
  explanation:"쾨펜의 열대 기후(A)는 가장 추운 달의 평균 기온이 18℃ 이상입니다. 따라서 모든 달의 평균 기온이 18℃ 이상이며, 열대 우림·열대 몬순·사바나 기후는 강수량과 계절별 강수 분포로 세분합니다.",
  verifiedWith:"미래엔 《1등급 세계지리 815제》 정답 해설(쾨펜 기후 구분); EBS 지리 해설 자료",
  curriculum:"2015 개정 세계지리 - 세계의 기후와 주민 생활",
  sources:["https://www.mirae-n.com/UPLOAD/EShop/EduN/Archive/Learning/Upload/REF_PDS/211021104234557_1%EB%93%B1%EA%B8%89_%EC%84%B8%EA%B3%84%EC%A7%80%EB%A6%AC%20%28815%EC%A0%9C%29_%ED%95%B4%EC%84%A4PDF.pdf"]
 })
});
function get(id) {return Object.prototype.hasOwnProperty.call(ENTRIES,id)?ENTRIES[id]:null}
function build(q){
 // The original source is passed through literally. Never rewrite correction text.
 const source=String(q.explanation||"");
 const note=get(q.id);
 const allowed=note&&note.question===q.text&&note.answer===q.answer;
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
