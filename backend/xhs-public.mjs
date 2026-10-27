export const XHS_PUBLIC_URL='https://dataxapi.com/zh/tools/hot-search/xiaohongshu/';
const plain=value=>String(value||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').trim();
export function parseXhsPublic(html){
 if(!html.includes('data-live="xiaohongshu-inspiration"'))throw new Error('公开页面没有小红书热点灵感数据区，未当作成功');
 const board=html.match(/<div\b[^>]*\bid="board"[^>]*>/)?.[0],stamp=board?.match(/\bdata-at="([^"]+)"/)?.[1];
 if(!stamp||!Number.isFinite(Date.parse(stamp)))throw new Error('公开页面缺少实际数据读取时间');
 if(Date.parse(stamp)>Date.now()+300000)throw new Error('公开页面的数据时间异常');
 let entries;
 for(const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)){
  let doc;try{doc=JSON.parse(match[1]);}catch{continue;}
  const list=(doc['@graph']||[doc]).find(x=>x['@type']==='ItemList'&&x['@id']===XHS_PUBLIC_URL+'#list');if(list){entries=list.itemListElement;break;}
 }
 if(!Array.isArray(entries)||!entries.length||entries.length>100)throw new Error('公开页面没有有效话题列表');
 const hot=new Map();for(const match of html.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/g)){const summary=match[1];if(!summary.includes('tx-tp'))continue;const href=summary.match(/<a\b[^>]*href="([^"]+)"/)?.[1],heat=summary.match(/<span\b[^>]*class="[^"]*\btx-ht\b[^"]*"[^>]*>\s*<b[^>]*>([\s\S]*?)<\/b>/)?.[1];if(href&&heat)hot.set(plain(href),plain(heat));}
 const ranks=entries.map(x=>x.position);if(new Set(ranks).size!==ranks.length||ranks.some((v,i)=>v!==i+1))throw new Error('公开快照的顺序重复或不连续');
 const snapshot=new Date(stamp).toISOString(),day=new Date(stamp).toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});
 return entries.map(item=>{
  if(typeof item.name!=='string'||!item.name.trim())throw new Error('公开快照存在空标题');const url=new URL(item.url);if(url.protocol!=='https:'||url.hostname!=='www.xiaohongshu.com'||url.pathname!=='/search_result')throw new Error('公开快照存在非小红书话题链接');
  const hotText=hot.get(item.url)||'';
  return {title:item.name,summary:'小红书热点灵感的第三方每日公开快照。用于发现话题，不包含笔记正文或笔记互动量。',url:item.url,published_at:'',content_type:'小红书热点灵感',tags:['小红书','热点灵感','每日公开快照'],metrics:{platform:'小红书',board:'热点灵感 · 每日公开快照',rank:item.position,rank_kind:'provider_order',hot_text:hotText,hot_value_is_display_only:!!hotText,provider:'DataXAPI 公开页面',provider_url:XHS_PUBLIC_URL,source_time_known:true,stats_date:day,snapshot_at:snapshot,checked_at:snapshot,update_frequency:'每天一次',stale:Date.now()-Date.parse(stamp)>36*3600000,note:'公开页面读取时间与本次请求时间分开记录；非实时搜索榜，非笔记数据。热度保留页面展示文字，不将“万”等约数还原为精确值；不是播放量。'}};
 });
}
