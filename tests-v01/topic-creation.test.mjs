import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../backend/store.mjs';
test('creation drafts persist through restart and restore; old backups default to empty drafts',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-creation-'));let s=new Store(dir);
 try{const raw=s.addRaw({title:'参考资料',url:'https://example.com/source'});const id=s.saveTopic({title:'AI 科普',evidence_ids:[raw.id]});
 s.saveTopic({creation:{script:'已编辑的脚本',outline:'演示步骤'}},id);s.saveTopic({favorite:true},id);
 s.changeStatus(id,'已入选','人工准备拍摄');s.changeStatus(id,'创作中','开始写脚本');assert.equal(s.topicDetail(id).verified,0);
 assert.throws(()=>s.saveTopic({creation:{script:42}},id),/格式/);assert.equal(s.topicDetail(id).creation.script,'已编辑的脚本');
 const backup=s.export();s.close();s=new Store(dir);assert.equal(s.topicDetail(id).creation.outline,'演示步骤');s.restore(backup);assert.equal(s.topicDetail(id).creation.script,'已编辑的脚本');
 const old=structuredClone(backup);for(const t of old.tables.topics)delete t.creation;s.restore(old);assert.deepEqual(s.topicDetail(id).creation,{});assert.equal(s.topicDetail(id).evidence.length,1);
 }finally{s.close();fs.rmSync(dir,{recursive:true,force:true});}
});
