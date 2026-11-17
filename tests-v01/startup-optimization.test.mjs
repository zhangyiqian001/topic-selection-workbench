import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../backend/store.mjs';
import {queryInbox} from '../backend/inbox.mjs';
import {automaticBackup,readAutomaticBackup} from '../backend/automatic-backup.mjs';

test('summary avoids loading the material list and inbox filters before pagination',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-paging-'));
 const store=new Store(dir);
 t.after(()=>{store.close();fs.rmSync(dir,{recursive:true});});
 for(let i=0;i<55;i++)store.addRaw({title:'检索目标 '+i,url:'https://example.com/'+i});
 store.addRaw({title:'不匹配',url:'https://example.com/other'});
 const first=queryInbox(store,new URLSearchParams('q='+encodeURIComponent('检索目标')));
 const second=queryInbox(store,new URLSearchParams('page=1&q='+encodeURIComponent('检索目标')));
 assert.equal(first.total,55);
 assert.equal(first.items.length,50);
 assert.equal(second.items.length,5);
 assert.equal(new Set([...first.items,...second.items].map(r=>r.id)).size,55);
 store.rawList=()=>{throw Error('summary should not read the full material list');};
 assert.equal(store.bundle({summary:true}).raw.length,0);
});

test('persisted scores survive restart and update when time or peers change',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-scores-'));
 let store=new Store(dir);
 const original=Date.now;
 t.after(()=>{Date.now=original;store.close();fs.rmSync(dir,{recursive:true});});
 const clock=original();
 const metrics={platform:'B站',board:'测试榜',stats_date:'2026-11-14'};
 const add=rank=>store.addRaw({title:'测试',url:'https://example.com/'+rank,published_at:new Date(clock-23*3600000).toISOString()},{metrics:{...metrics,rank}}).id;
 add(1);const id=add(2);add(3);
 store.refreshScreening();
 const initial=store.rawOne(id).assessment;
 store.close();store=new Store(dir);
 store.refreshScreening();
 assert.deepEqual(store.rawOne(id).assessment,initial);
 add(5);
 store.refreshScreening();
 assert.equal(store.rawOne(id).assessment.contributions.attention.value,4);
 Date.now=()=>clock+2*3600000;
 store.refreshScreening();
 assert.equal(store.rawOne(id).assessment.contributions.freshness.value,4);
});

test('automatic backup restores inserts, edits and deletions from a delta',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-delta-'));
 const store=new Store(dir);
 t.after(()=>{store.close();fs.rmSync(dir,{recursive:true});});
 const updated=store.addRaw({title:'原标题'}).id;
 const removed=store.addRaw({title:'待删除',url:'https://example.com/old'}).id;
 const full=automaticBackup(dir,new Date('2026-11-14T02:00:00Z'));
 store.updateRaw(updated,{title:'新标题'});
 store.deleteRaw(removed);
 const added=store.addRaw({title:'新素材'}).id;
 const delta=automaticBackup(dir,new Date('2026-11-15T02:00:00Z'));
 assert.match(full,/-full/);
 assert.match(delta,/-delta/);
 const snapshot=readAutomaticBackup(dir,delta);
 store.restore(snapshot);
 assert.equal(store.rawOne(updated).title,'新标题');
 assert.equal(store.rawOne(added).title,'新素材');
 assert.equal(store.rawOne(removed),null);
 assert.equal(store.addRaw({title:'被屏蔽',url:'https://example.com/old'}).blocked,true);
});
