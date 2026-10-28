import {XHS_INDEX_URL,XHS_INDEX_DEFAULTS} from './xhs-index.mjs';
import {BILI_RANK_URL} from './bili-ranking.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {parseXhsPublic,XHS_PUBLIC_URL} from './xhs-public.mjs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),vendor=path.join(path.dirname(fileURLToPath(import.meta.url)),'vendor','douyin');
export const PLATFORM_TYPES=['douyin','douyin_daily','bilibili','bilibili_ranking','xiaohongshu','xiaohongshu_public','xiaohongshu_index'];
export const PLATFORM_PRESETS=[
 {name:'小红书 · 多领域笔记线索',type:'xiaohongshu_index',url:XHS_INDEX_URL,query:XHS_INDEX_DEFAULTS,frequency_minutes:1440},
 {name:'B站 · 各分区排行榜',type:'bilibili_ranking',url:BILI_RANK_URL,query:'全部',frequency_minutes:240},
 {name:'小红书 · 热点灵感（公开快照）',type:'xiaohongshu_public',url:XHS_PUBLIC_URL,query:'',frequency_minutes:1440},
 {name:'抖音 · 实时热点榜',type:'douyin',url:'https://so-landing.douyin.com/aweme/v1/hot/search/list/',query:'',frequency_minutes:240},
 {name:'抖音 · 创作指南一日榜',type:'douyin_daily',url:'https://trendinsight.oceanengine.com/api/v2/brand/',query:'全部',frequency_minutes:1440},
 {name:'B站 · 热门视频',type:'bilibili',url:'https://api.bilibili.com/x/web-interface/popular',query:'',frequency_minutes:240},
 {name:'小红书 · 公开热点',type:'xiaohongshu',url:'https://edith.xiaohongshu.com/api/sns/v1/search/hot_list',query:'',frequency_minutes:240}
];
export const DAILY_TAGS=[['601','剧情'],['602','明星'],['606','音乐'],['607','二次元'],['608','游戏'],['609','社会时政'],['612','舞蹈'],['614','三农'],['615','科技'],['616','财经'],['617','母婴'],['619','生活家居'],['621','医疗健康'],['623','情感'],['624','文化'],['625','职场'],['626','教育校园'],['627','摄影摄像'],['628','美食'],['629','旅行'],['631','时尚'],['633','体育'],['634','休闲娱乐'],['635','汽车']];
export function selectDailyTags(query='全部'){const selected=String(query||'全部').split(/[,，]/).map(x=>x.trim()).filter(Boolean);if(!selected.length||selected.includes('全部'))return DAILY_TAGS;const invalid=selected.filter(x=>!DAILY_TAGS.some(([id,name])=>x===id||x===name));if(invalid.length)throw new Error('未知一日榜行业：'+invalid.join('、'));return DAILY_TAGS.filter(([id,name])=>selected.includes(id)||selected.includes(name));}
const num=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
const timestamp=v=>{if(!v)return '';const n=typeof v==='number'?v:typeof v==='string'&&/^\d{10,13}$/.test(v)?Number(v):null;const t=n!==null?(n<1e12?n*1000:n):Date.parse(String(v).includes('T')?v:String(v).replace(' ','T')+'+08:00');return Number.isFinite(t)?new Date(t).toISOString():'';};
const compact=obj=>Object.fromEntries(Object.entries(obj).filter(([,v])=>v!==null&&v!==undefined));
const current=()=>new Date().toISOString();
export function platformOf(type){if(type==='rsshub')return 'RSSHub';return type==='douyin'||type==='douyin_daily'?'抖音':['bilibili','bilibili_ranking'].includes(type)?'B站':['xiaohongshu','xiaohongshu_public','xiaohongshu_index'].includes(type)?'小红书':'';}
export function parsePlatform(body,type){const data=typeof body==='string'?JSON.parse(body):body,checked=current();
 if(type==='douyin'){
  if(data.status_code!==0)throw new Error('抖音返回错误状态，未取得榜单');
  const container=data.data||data,rows=container.word_list,updated=timestamp(container.active_time);
  if(!Array.isArray(rows)||!rows.length||!updated)throw new Error('抖音未返回有效榜单或更新时间');
  if(Date.parse(updated)>Date.now()+300000)throw new Error('抖音榜单时间异常：晚于当前时间');
  const hasRanks=rows.some(r=>Number.isInteger(num(r.position)));
  const ranked=rows.map((r,i)=>({r,rank:hasRanks?num(r.position):i+1})).filter(({r,rank})=>r.word&&Number.isInteger(rank)&&rank>=1&&rank<=50).sort((a,b)=>a.rank-b.rank);
  if(!ranked.length||new Set(ranked.map(x=>x.rank)).size!==ranked.length||ranked.some((x,i)=>x.rank!==i+1))throw new Error('抖音榜单为空、重复排名或排名不连续');
  return ranked.map(({r,rank})=>{let meta={};try{meta=JSON.parse(r.hotlist_param||'{}');}catch{throw new Error('抖音榜单身份字段格式异常');}if(meta.board_type!==undefined&&(meta.board_type!==0||String(meta.board_sub_type||'')!==''||meta.rank!==rank))throw new Error('抖音返回的榜单身份或排名与请求不符');return {title:r.word,summary:'抖音公开实时热点线索；搜索热度不是视频播放量。',url:'https://www.douyin.com/search/'+encodeURIComponent(r.word),published_at:timestamp(r.event_time),content_type:'抖音热点',tags:['抖音','实时热榜'],metrics:compact({platform:'抖音',board:'实时热点榜',rank,rank_kind:hasRanks?'official_rank':'list_order',hot_value:num(r.hot_value),board_updated_at:updated,snapshot_at:updated,checked_at:checked,stale:Date.now()-Date.parse(updated)>7200000,note:'来源更新时间超过2小时会标注过期。热度为平台原始值，不代表单视频播放量。'})};});
 }
 if(type==='bilibili'){
  if(data.code!==0)throw new Error(`B站接口未返回有效数据（code ${data.code}）。不切换口径伪装榜单。`);const rows=data.data?.list;if(!Array.isArray(rows)||!rows.length)throw new Error('B站热门列表为空');
  return rows.slice(0,50).filter(r=>r.bvid&&r.title).map((r,i)=>({title:r.title,summary:String(r.desc||'来源未提供简介，请查看视频。').slice(0,1600),url:'https://www.bilibili.com/video/'+r.bvid,published_at:timestamp(r.pubdate),content_type:'B站视频',tags:['B站',r.tname||'热门视频'],metrics:compact({platform:'B站',category:r.tname||'',board:'热门视频列表',rank:i+1,rank_kind:'list_order',author:r.owner?.name,plays:num(r.stat?.view),likes:num(r.stat?.like),comments:num(r.stat?.reply),favorites:num(r.stat?.favorite),coins:num(r.stat?.coin),shares:num(r.stat?.share),snapshot_at:checked,checked_at:checked,note:'rank 是本次热门列表顺序，不是官方全站日榜名次；互动数据为累计快照。'})}));
 }
 if(type==='xiaohongshu'){
  if(data.success===false||data.code!==undefined&&![0,200].includes(data.code))throw new Error(`小红书未返回成功数据（code ${data.code}），可能需要有效会话或授权数据源。`);
  const rows=data.data?.items||data.data?.hot_list||data.items||data.hot_list;if(!Array.isArray(rows)||!rows.length)throw new Error('小红书未返回可用热榜（当前公开请求可能受限）。可使用自己的授权来源或导入已导出的 JSON，不伪造热榜。');
  return rows.slice(0,100).filter(r=>r.title||r.word||r.keyword).map((r,i)=>{const title=String(r.title||r.word||r.keyword);return {title,summary:String(r.desc||'小红书热搜词线索，不是笔记内容或笔记播放量。'),url:r.url&&/^https:\/\/(?:www\.)?xiaohongshu\.com\//.test(r.url)?r.url:'https://www.xiaohongshu.com/search_result?keyword='+encodeURIComponent(title),published_at:'',content_type:'小红书热词',tags:['小红书','搜索热榜'],metrics:compact({platform:'小红书',board:'搜索热榜',rank:num(r.rank)??i+1,rank_kind:r.rank?'provided_rank':'list_order',hot_value:num(r.score??r.hot_value),hot_text:r.hot_text||'',board_updated_at:timestamp(data.data?.updated_at||data.updated_at),snapshot_at:timestamp(data.data?.updated_at||data.updated_at)||checked,checked_at:checked,note:'只保存来源实际提供的热度；不推测笔记点赞、收藏或播放量。'})};});
 }
 throw new Error('未知平台格式');
}
export function parseDailyReport(report,{imported=false}={}){
 if(!report||!Array.isArray(report.boards)||!/^\d{4}-\d{2}-\d{2}$/.test(report.stats_date||''))throw new Error('需要包含 stats_date 和 boards 的原一日榜 JSON，不能使用 Excel 报告入口脚本。');
 const records=[],warnings=[],signatures=new Set();
 for(const board of report.boards){const rows=board.rows||[];if(!rows.length){if(board.status&&!['成功','官方返回为空'].includes(board.status))warnings.push(board.name+'：'+board.status);continue;}
  if(rows.length>50)throw new Error(board.name+'：每个垂类超过 50 条');const ranks=rows.map(r=>num(r.seq)),ids=rows.map(r=>String(r.item_id||''));if(ranks.some((r,i)=>r!==i+1)||new Set(ids).size!==ids.length||ids.some(x=>!/^\d+$/.test(x)))throw new Error(board.name+'：榜单名次不连续、视频 ID 缺失或重复');const fp=ids.join(',');if(signatures.has(fp))throw new Error('不同垂类整榜重复，可能是参数未生效');signatures.add(fp);
  const stats=board.date||report.stats_date,snapshot=timestamp(board.fetched||report.collected);if(!snapshot)throw new Error('一日榜缺少实际采集时间');
  for(const r of rows){const metrics=compact({platform:'抖音',board:'创作指南一日榜 · '+board.name,category:board.name,rank:Number(r.seq),rank_kind:'official_rank',stats_date:stats,source_scope:report.scope||'创作指南 / 热门视频 / 近1日 / 视频指数排序',source_url:board.source||'',author:r.author,followers:num(r.author_fans),video_index:num(r.index),plays:num(r.play_cnt),likes:num(r.like_cnt),comments:num(r.comment_cnt),shares:num(r.forward_cnt),snapshot_at:snapshot,checked_at:snapshot,imported,stale:Date.now()-Date.parse(stats+'T00:00:00+08:00')>3*86400000,note:'统计日期与采集日期分开记录。一日榜不意味着播放、点赞、评论都是当日增量；保留平台视频指数原始排序。'});records.push({title:String(r.video_title||'未命名视频'),summary:`${r.author||'未知作者'} · ${board.name} · 统计日期 ${stats}；仅为榜单线索，内容与方法需打开视频核验。`,url:'https://www.douyin.com/video/'+r.item_id,published_at:timestamp(r.publish_time),content_type:'抖音一日榜视频',tags:['抖音','一日榜',board.name],metrics});}
 }
 return {records,warnings,stats_date:report.stats_date,collected:report.collected,boards:report.boards.length};
}
export function parsePlatformImport(payload,platform){
 if(platform==='douyin_daily')return parseDailyReport(payload,{imported:true});
 if(!['douyin','bilibili','xiaohongshu'].includes(platform))throw new Error('请选择抖音、小红书或 B站');
 let records;
 if(platform==='xiaohongshu'&&(Array.isArray(payload)||Array.isArray(payload.notes)||Array.isArray(payload.items)&&payload.platform)){
  const list=Array.isArray(payload)?payload:payload.notes||payload.items;if(list.length>10000)throw new Error('一次最多导入 10000 条笔记');
  records=list.map((r,i)=>{const title=r.title||r.display_title||r.note_card?.display_title,url=r.url||r.note_url||(r.note_id?'https://www.xiaohongshu.com/explore/'+r.note_id:'');if(typeof title!=='string'||!title.trim()||!/^https:\/\/(?:www\.)?xiaohongshu\.com\//.test(url))throw new Error('第 '+(i+1)+' 条小红书数据缺少标题或本站原始链接');const stats=r.interact_info||r.note_card?.interact_info||r;const stamp=timestamp(r.snapshot_at||payload.collected)||current();return {title,summary:String(r.desc||r.summary||r.note_card?.desc||''),url,published_at:timestamp(r.published_at||r.publish_time),content_type:'小红书笔记',tags:['小红书','文件导入'],metrics:compact({platform:'小红书',board:'本人导出笔记',author:r.author||r.user?.nickname||r.note_card?.user?.nickname,likes:num(stats.likes??stats.liked_count),comments:num(stats.comments??stats.comment_count),favorites:num(stats.favorites??stats.collected_count),likes_text:typeof stats.liked_count==='string'?stats.liked_count:'',snapshot_at:stamp,source_time_known:!!(r.snapshot_at||payload.collected),checked_at:stamp,imported:true,note:'用户主动导入的笔记数据，不代表本次已联网抓取；未提供的指标不补零，原始时间未提供时仅记录导入时间。'})};});
 }else records=parsePlatform(payload,platform).map(r=>({...r,metrics:{...r.metrics,imported:true,note:r.metrics.note+'；本次由文件导入，不是实时请求结果。'}}));
 if(!records.length)throw new Error('文件没有可导入记录');return {records,warnings:[],stats_date:'',collected:payload.collected||'',boards:1};
}
export async function fetchXiaohongshu(fetcher){
 const attempts=[],direct='https://edith.xiaohongshu.com/api/sns/v1/search/hot_list',aggregate='https://60s.viki.moe/v2/rednote';
 try{const records=parsePlatform(await fetcher(direct),'xiaohongshu');return {records,warnings:[]};}catch(error){attempts.push('官方公开入口：'+error.message);}
 try{const response=JSON.parse(await fetcher(aggregate));if(response.code!==200)throw new Error('公开聚合未返回成功状态');const items=Array.isArray(response.data)?response.data:response.data?.items||response.data?.list;if(!Array.isArray(items))throw new Error('公开聚合没有可用列表');const records=parsePlatform({code:0,data:{items:items.map(x=>({...x,title:x.title||x.word,hot_value:x.hot_value??x.hot_value_raw,hot_text:x.hot_value_desc||x.hot_text,rank:x.rank})),updated_at:response.update_time||response.data?.update_time}},'xiaohongshu').map(r=>({...r,metrics:{...r.metrics,provider:'60s 公开聚合',provider_url:aggregate,source_time_known:!!r.metrics.board_updated_at,note:r.metrics.note+'；由60s公开聚合提供，可能缓存，非平台直连或笔记详情。'}}));return {records,warnings:[],provider:'60s 公开聚合'};}catch(error){attempts.push('60s公开聚合：'+error.message);}
 throw new Error('小红书暂无可用公开数据。'+attempts.join('；')+'。未写入空榜或旧数据冒充成功。');
}
async function decode(body,encrypted){if(!encrypted)return body.data||body;const dir=await fs.mkdtemp(path.join(os.tmpdir(),'topic-index-'));try{const input=path.join(dir,'input.json'),output=path.join(dir,'output.json');await fs.writeFile(input,JSON.stringify({data:body.data,encrypted}));await exec(process.execPath,[path.join(vendor,'decode-index.mjs'),input,output],{timeout:12000,windowsHide:true,maxBuffer:1024*1024});return JSON.parse(await fs.readFile(output,'utf8'));}finally{const target=path.resolve(dir),parent=path.resolve(os.tmpdir())+path.sep;if(!target.startsWith(parent)||!path.basename(target).startsWith('topic-index-'))throw new Error('临时目录清理路径校验失败');await fs.rm(target,{recursive:true,force:true});}}
export async function fetchDaily(source){let lastRequest=0;
 async function request(endpoint,params){const gap=1500-(Date.now()-lastRequest);if(gap>0)await new Promise(r=>setTimeout(r,gap));lastRequest=Date.now();const response=await fetch('https://trendinsight.oceanengine.com/api/v2/brand/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json','appsource':'PC','Referer':'https://trendinsight.oceanengine.com/vertical-analysis'},body:JSON.stringify(params),signal:AbortSignal.timeout(16000)});if(!response.ok)throw new Error('抖音一日榜 HTTP '+response.status);const body=await response.json();if(body.status!==0)throw new Error('抖音一日榜返回错误状态 '+body.status);const data=await decode(body,response.headers.get('x-encrypted'));if(!data||typeof data!=='object'||data.BaseResp?.StatusCode)throw new Error('一日榜格式或权限异常');return data;}
 const scope=await request('get_hot_videos_time_scope',{}),day=scope.latest_day;if(!/^\d{8}$/.test(day||''))throw new Error('一日榜未提供有效最新统计日期');const date=day.slice(0,4)+'-'+day.slice(4,6)+'-'+day.slice(6),tags=selectDailyTags(source.query);const boards=[];
 for(const [tag,name]of tags){try{const data=await request('get_hot_videos_list',{tag_id:tag,category:tag,period:'1',end_date:day,rank_type:0,sort_by:0,page_req:{current_page:1,page_size:'50'}});boards.push({name,tag,date,source:`https://creator.douyin.com/creator-micro/creator-count/vertical-analysis?areaId=${tag}&tabValue=creativity&subTab=video`,rows:data.video_infos||[],fetched:current(),status:'成功'});}catch(error){boards.push({name,rows:[],status:error.message});if(/401|403|429/.test(error.message))break;}}
 const report={stats_date:date,collected:current(),scope:'创作指南 / 内容创意分析 / 热门视频 / 近1日；视频指数默认排序',boards},result=parseDailyReport(report);if(!result.records.length)throw new Error(result.warnings.join('；')||'官方一日榜返回为空');return result;
}
