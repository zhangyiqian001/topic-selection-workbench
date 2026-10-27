import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseFeed,SOURCES} from '../feeds.mjs';
import {keywordMatches,mergeRadar,angleDrafts,editorialScore,parseTopicImport} from '../radar-core.js';
import {createState,validateState,topicToScript} from '../core.js';
test('RSS parsing preserves actual source date, URLs and plain text without inventing heat',()=>{
 const items=parseFeed('<rss><channel><item><title><![CDATA[AI &amp; tools]]></title><link>https://example.com/a</link><pubDate>Mon, 26 Oct 2026 12:00:00 GMT</pubDate><description><![CDATA[<p>A useful <b>demo</b></p>]]></description></item></channel></rss>',SOURCES[1],'2026-10-26T13:00:00Z');
 assert.equal(items.length,1);assert.equal(items[0].title,'AI & tools');assert.equal(items[0].summary,'A useful demo');assert.equal(items[0].publishedAt,'2026-10-26T12:00:00.000Z');assert.equal(items[0].hotValue,0);assert.equal(items[0].dataKind,'live');assert.throws(()=>parseFeed('<html>blocked</html>',SOURCES[1]));
});
test('Douyin parser preserves returned rank, heat and Beijing timestamp',()=>{
 const items=parseFeed(JSON.stringify({status_code:0,active_time:'2026-10-26 20:00:00',word_list:[{word:'AI 工具发布',hot_value:12345},{word:'自然景观',hot_value:10000}]}),SOURCES[0]);assert.equal(items[0].rank,1);assert.equal(items[0].hotValue,12345);assert.equal(items[0].publishedAt,'2026-10-26T12:00:00.000Z');assert.equal(keywordMatches(items[1]).length,0);assert.throws(()=>parseFeed('{}',SOURCES[0]));
});
test('refresh updates metadata while preserving triage and deduplicating records',()=>{
 const x={id:'x',title:'AI 工具',fetchedAt:'2026-10-25',favorite:true,ignored:true,hotValue:10};const refreshed=mergeRadar([x],[{...x,favorite:false,ignored:false,hotValue:20,fetchedAt:'2026-10-26'}]);assert.equal(refreshed.length,1);assert.equal(refreshed[0].favorite,true);assert.equal(refreshed[0].ignored,true);assert.equal(refreshed[0].hotValue,20);assert.equal(keywordMatches({title:'This explains AI, not rain.'},'AI').length,1);assert.equal(keywordMatches({title:'rain'},'AI').length,0);
});
test('angle briefs preserve provenance and travel into production scripts',()=>{
 const item={id:'radar1',title:'AI 功能更新',sourceName:'官方',url:'https://example.com',publishedAt:'2026-10-26',fetchedAt:'2026-10-26'};const drafts=angleDrafts(item);assert.equal(drafts.length,3);assert.equal(drafts[0].sourceRadarId,item.id);assert.equal(drafts[0].sourceVerified,false);const script=topicToScript({...drafts[0],id:'topic1'});assert.ok(script.hook);assert.ok(script.demo);assert.ok(script.body.includes(drafts[0].question));assert.ok(script.sources.includes(item.url));assert.ok(script.sources.includes(drafts[0].risk));
});
test('editorial scoring is explicit and imported AI proposals need review',()=>{
 assert.equal(editorialScore({}),null);assert.equal(editorialScore({relevance:5,value:5,demoScore:5,novelty:5}),100);assert.equal(editorialScore({relevance:1,value:1,demoScore:1,novelty:1}),20);assert.throws(()=>parseTopicImport('[{"title":"missing angle"}]'));assert.equal(parseTopicImport('```json\n[{"title":"AI","angle":"explain"}]\n```')[0].category,'知识科普');
});
test('v1 data migrates without losing old content and v2 radar survives backup',()=>{
 const old=createState();old.version=1;delete old.radar;delete old.radarMeta;delete old.settings.radarKeywords;const migrated=validateState(old);assert.equal(migrated.version,2);assert.deepEqual(migrated.radar,[]);assert.ok(migrated.settings.radarKeywords);const s=createState();s.radar=parseFeed(JSON.stringify({status_code:0,active_time:'2026-10-26 20:00:00',word_list:[{word:'AI',hot_value:123}]}),SOURCES[0]);assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))),s);
});
