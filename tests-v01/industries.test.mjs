import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectDailyTags,DAILY_TAGS,PLATFORM_PRESETS,parsePlatform} from '../backend/platforms.mjs';
test('daily collection defaults to every supported industry and validates explicit selections',()=>{
 assert.equal(PLATFORM_PRESETS.find(s=>s.type==='douyin_daily').query,'全部');assert.equal(selectDailyTags().length,24);assert.equal(selectDailyTags('').length,DAILY_TAGS.length);assert.deepEqual(selectDailyTags('美食,635').map(x=>x[1]),['美食','汽车']);assert.throws(()=>selectDailyTags('科技,错误行业'),/未知/);
});
test('non-AI Bilibili industry data is preserved with native category',()=>{
 const records=parsePlatform({code:0,data:{list:[{bvid:'BV1234567890',title:'今天做红烧肉',tname:'美食制作',stat:{view:100}}]}},'bilibili');assert.equal(records.length,1);assert.equal(records[0].metrics.category,'美食制作');assert.equal(records[0].title,'今天做红烧肉');
});
