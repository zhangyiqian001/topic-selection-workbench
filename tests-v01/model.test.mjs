import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {Store} from '../backend/store.mjs';
import {analyze,testModel} from '../backend/model.mjs';
test('compatible local model can produce reviewable suggestions without auto-creating topics',async()=>{const server=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');if(req.url==='/v1/models')res.end(JSON.stringify({data:[{id:'test-local-model'}]}));else res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({summary:'仅基于提供文本的摘要',tags:['效率'],angles:[{title:'工具怎么用',question:'适合谁',angle:'实际演示'}],uncertainty:'尚未核验原始网页'})}}]}));});await new Promise(r=>server.listen(0,'127.0.0.1',r));const s=new Store(fs.mkdtempSync(path.join(os.tmpdir(),'studio-ai-test-')));try{s.updateSettings({model_url:'http://127.0.0.1:'+server.address().port});assert.equal((await testModel(s.settings())).ok,true);const raw=s.addRaw({title:'工具',summary:'用于学习'});const result=await analyze(s,'raw',raw.id);assert.equal(result.model,'test-local-model');assert.equal(s.rawDetail(raw.id).ai_result.tags[0],'效率');assert.equal(s.topicList().length,0);assert.equal((await testModel({...s.settings(),model_url:'http://example.com'})).ok,false);}finally{s.close();await new Promise(r=>server.close(r));}});
