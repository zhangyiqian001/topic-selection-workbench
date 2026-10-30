import {assessRaw,SCREEN_WEIGHTS} from '../backend/assessment.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../backend/store.mjs';
import {computeScore,DEFAULT_SETTINGS,DIMENSIONS} from '../backend/constants.mjs';
test('automatic screening gives complete scores with explicit priors and material weight changes',()=>{
 const s=new Store(fs.mkdtempSync(path.join(os.tmpdir(),'studio-auto-score-')));
 try{
 const stamp=new Date().toISOString();
 s.updateSettings({keywords:'教程'});
 const a=s.addRaw({title:'AI 教程实测',url:'https://example.com/ai',published_at:stamp},{metrics:{platform:'测试',board:'公开榜',rank:3,stats_date:'2026-10-27'}});
 const b=s.addRaw({title:'AI 更新',url:'https://example.com/ai2',published_at:stamp},{metrics:{platform:'测试',board:'公开榜',rank:1,stats_date:'2026-10-27'}});
 let raw=s.bundle().raw,first=raw.find(r=>r.id===a.id).assessment;
 assert.equal(first.scores.length,4);assert.ok(first.scores.every(x=>x.reason));assert.equal(typeof first.total,'number');
 s.updateSettings({screening_weights:{relevance:100,attention:0,freshness:0,evidence:0}});
 raw=s.bundle().raw;assert.ok(raw.find(r=>r.id===a.id).assessment.total>raw.find(r=>r.id===b.id).assessment.total);
 s.updateSettings({screening_weights:{relevance:0,attention:100,freshness:0,evidence:0}});
 raw=s.bundle().raw;assert.ok(raw.find(r=>r.id===b.id).assessment.total>raw.find(r=>r.id===a.id).assessment.total);
 const topic=s.saveTopic({title:'领域教程',evidence_ids:[a.id],apply_rule_scores:true});assert.equal(s.topicDetail(topic).scores.length,6);assert.equal(s.topicDetail(topic).screening.version,4);
 assert.throws(()=>s.updateSettings({screening_weights:{relevance:NaN}}),/权重/);
 }finally{s.close();}
});
test('unequal dimension values respond to weights while human overrides rule and AI',()=>{
 const scores=DIMENSIONS.map(([dimension],i)=>({dimension,value:i===0?5:1,reason:'公开证据',actor:'rule'}));
 assert.notEqual(computeScore(scores,DEFAULT_SETTINGS.weights).total,computeScore(scores,{value:100,heat:0,visual:0,difference:0,timely:0,cost:0}).total);
 assert.equal(computeScore([...scores,{dimension:'value',value:2,reason:'人工核验',actor:'human'},{dimension:'value',value:5,reason:'AI建议',actor:'ai'}],{value:100,heat:0,visual:0,difference:0,timely:0,cost:0}).total,40);
});

test('unrelated items get low domain match, missing metrics use disclosed priors, fresh snapshots cannot refresh old news',()=>{
 const clock=Date.parse('2026-10-27T00:00:00Z'),settings={...DEFAULT_SETTINGS,keywords:'AI,教程',screening_weights:SCREEN_WEIGHTS};
 const raw={title:'明星演唱会',summary:'',url:'https://example.com/event',metrics:{platform:'抖音',rank:1,board:'热榜',snapshot_at:'2026-10-27T00:00:00Z'}};
 const result=assessRaw(raw,[raw,{metrics:{...raw.metrics,rank:50}}],settings,clock);assert.equal(result.contributions.relevance.value,1);assert.equal(result.adjustment,'');assert.equal(result.contributions.freshness.estimated,true);
 const unknown=assessRaw({title:'通用教程',metrics:{}},[],settings,clock);assert.equal(unknown.complete,true);assert.equal(unknown.contributions.attention.value,2.5);assert.equal(unknown.contributions.attention.estimated,true);assert.ok(unknown.coverage<100);
 const old=assessRaw({...raw,title:'AI 教程',published_at:'2025-01-01T00:00:00Z'},[],settings,clock);assert.equal(old.contributions.freshness.value,1);
});
