"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const site=path.join(__dirname,"..","site");
const read=f=>{const built=path.join(site,f);return fs.readFileSync(fs.existsSync(built)?built:path.join(__dirname,"..","app",f),"utf8");};
const ctx={};vm.createContext(ctx);
vm.runInContext(read("ox-teacher-approved-2026-korea.js"),ctx);
const questions=Array.from(ctx.GeoLabKoreaApprovedOX||[]);
assert.equal(questions.length,41,"Exactly 41 non-excluded items");
const ids=questions.map(q=>q.id);
assert.equal(new Set(ids).size,41);
assert.ok(!ids.some(id=>id.endsWith("K-009")||id.endsWith("K-014")));
assert.equal(questions.filter(q=>q.answer==="O").length,21);
assert.equal(questions.filter(q=>q.answer==="X").length,20);
for(const q of questions){
 assert.equal(q.subject,"korea");
 assert.equal(q.chapter,"기출 기반 OX 보충문항");
 assert.equal(q.teacherReviewed,true);
 assert.equal(q.origin,"teacher-approved-2026-korea");
 assert.ok(q.text&&q.teacherExplanation&&q.source&&q.source.includes("한국지리"));
 assert.equal(q.explanation,"","Preserve original X corrections separately");
}
assert.equal(new Set(questions.map(q=>q.text.replaceAll(" ",""))).size,41);
assert.equal(questions.find(q=>q.sourceId==="K-005").text,"칼데라 분지는 주로 마그마 분출 후 화구가 함몰하여 형성된다.");
const app=read("app.js"),html=read("index.html");
assert.ok(app.includes("teacherOXData();")&&app.includes("GeoLabKoreaApprovedOX"));
assert.ok(app.includes("q.teacherReviewed===true"));
assert.ok(html.includes("ox-teacher-approved-2026-korea.js"));
console.log("PASS: 41 teacher-reviewed Korean geography OX statements, exclusions, explanations, source metadata and UI integration");
