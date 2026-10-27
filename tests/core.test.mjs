import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,sampleState,validateState,topicToScript,promptFor,safeURL,escapeHTML} from '../core.js';
test('sample and empty data survive backup round-trip',()=>{for(const s of [createState(),sampleState()])assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);});
test('restore rejects incomplete, malformed and unsupported data',()=>{
 assert.throws(()=>validateState({version:99}));
 const s=sampleState();s.scripts[0].checks='bad';assert.throws(()=>validateState(s));
 const n=sampleState();n.topics.push({...n.topics[0]});assert.throws(()=>validateState(n));
 const r=createState();r.reviews.push({id:'r',scriptId:'s',date:'2026-10-26',notes:'',views:-1,likes:0,saves:0,comments:0,followers:0});assert.throws(()=>validateState(r));
});
test('adopting a topic preserves evidence and produces a restorable draft',()=>{const s=sampleState(),t=s.topics[1],draft=topicToScript(t);assert.equal(draft.topicId,t.id);assert.equal(draft.sources,t.sources);assert.equal(draft.status,'草稿');assert.deepEqual(draft.checks,[false,false]);s.scripts.push(draft);assert.doesNotThrow(()=>validateState(s));});
test('prompts use content and preferences and do not claim verified facts',()=>{const s=sampleState();for(const m of ['topics','script','hook','simple','fact','titles','review']){const p=promptFor(m,s.scripts[0],s.settings);assert.ok(p.includes('抖音'));assert.ok(p.includes('1–3 分钟'));assert.ok(p.includes(s.scripts[0].title));assert.ok(p.includes('不要编造'));assert.ok(p.includes('目标受众'));}assert.ok(promptFor('fact',s.scripts[0],s.settings).includes('不要假装已经检索过'));});
test('untrusted links and markup are safe for HTML rendering',()=>{assert.equal(safeURL('javascript:alert(1)'), '');assert.equal(safeURL('file:///C:/private'),'');assert.equal(safeURL('https://example.com'),'https://example.com/');assert.equal(escapeHTML('<img src=x onerror="alert(1)">'),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');});
