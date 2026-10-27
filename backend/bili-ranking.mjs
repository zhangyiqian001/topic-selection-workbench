export const BILI_RANK_URL='https://api.bilibili.com/x/web-interface/ranking/v2';
export const BILI_CHANNEL_URL='https://api.bilibili.com/x/kv-frontend/namespace/data?appKey=333.1339&nscode=10';
export function parseBiliChannels(body,query='全部'){
 const doc=typeof body==='string'?JSON.parse(body):body,config=doc.data?.data;
 if(doc.code!==0||!config)throw new Error('B站分区配置获取失败，未使用旧分区编号冒充');
 let order;try{order=JSON.parse(config['channel_list.popular_page_sort']);}catch{throw new Error('B站排行榜分区配置格式异常');}
 if(!Array.isArray(order)||!order.length)throw new Error('B站未提供排行榜分区');
 const channels=[];for(const slug of order){let channel;try{channel=JSON.parse(config['channel_list.'+slug]);}catch{throw new Error('B站分区配置缺项：'+slug);}
 if(channel.seasonType||slug==='all')continue;
 if(!Number.isInteger(channel.tid)||channel.tid<=0||typeof channel.name!=='string'||!channel.name.trim()||!/^\w+$/.test(slug))throw new Error('B站分区身份字段异常：'+slug);
 channels.push({id:channel.tid,name:channel.name,slug});}
 if(!channels.length||new Set(channels.map(c=>c.id)).size!==channels.length)throw new Error('B站分区为空或ID重复');
 const selected=String(query||'全部').split(/[,，]/).map(s=>s.trim()).filter(Boolean);if(selected.includes('全部')||!selected.length)return channels;
 const invalid=selected.filter(v=>!channels.some(c=>[String(c.id),c.name,c.slug].includes(v)));if(invalid.length)throw new Error('未知或不支持的B站UGC排行榜分区：'+invalid.join('、'));
 return channels.filter(c=>selected.some(v=>[String(c.id),c.name,c.slug].includes(v)));
}
const numeric=v=>typeof v==='number'&&Number.isFinite(v)?v:undefined;
export function parseBiliRanking(body,channel,stamp=new Date().toISOString()){
 const doc=typeof body==='string'?JSON.parse(body):body;
 if(doc.code!==0)throw new Error(`B站分区榜未返回成功状态（code ${doc.code}）`);
 const rows=doc.data?.list;if(!Array.isArray(rows)||!rows.length||rows.length>1000)throw new Error('B站分区榜为空或格式异常');
 const ids=new Set();return rows.map((r,i)=>{
 if(!/^BV[a-zA-Z0-9]{10}$/.test(r.bvid||'')||typeof r.title!=='string'||!r.title.trim()||ids.has(r.bvid))throw new Error('B站分区榜包含无效或重复视频');ids.add(r.bvid);
 const published=Number.isFinite(r.pubdate)&&r.pubdate>0&&r.pubdate*1000<=Date.parse(stamp)+300000?new Date(r.pubdate*1000).toISOString():'';
 return {title:r.title,summary:String(r.desc||'来源未提供简介，请查看视频。').slice(0,1600),url:'https://www.bilibili.com/video/'+r.bvid,published_at:published,content_type:'B站分区榜视频',tags:['B站',channel.name,r.tnamev2||r.tname||''].filter(Boolean),metrics:Object.fromEntries(Object.entries({platform:'B站',category:channel.name,video_category:r.tnamev2||r.tname||'',board:'分区排行榜 · '+channel.name,board_id:String(channel.id),rank:i+1,rank_kind:'official_rank',author:r.owner?.name,plays:numeric(r.stat?.view),likes:numeric(r.stat?.like),comments:numeric(r.stat?.reply),favorites:numeric(r.stat?.favorite),coins:numeric(r.stat?.coin),shares:numeric(r.stat?.share),danmaku:numeric(r.stat?.danmaku),duration_seconds:numeric(r.duration),snapshot_at:stamp,checked_at:stamp,source_url:'https://www.bilibili.com/v/popular/rank/'+channel.slug,source_scope:String(doc.data.note||'近期综合表现，动态更新'),note:'平台分区排行榜原始顺序；近期综合表现，非一日新增或日增量榜。互动量是累计快照；快照时间不是平台更新时间。'}).filter(([,v])=>v!==undefined))};
 });
}
export async function fetchBiliRankings(source,fetcher,{pause=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const channels=parseBiliChannels(await fetcher(BILI_CHANNEL_URL),source.query),records=[],warnings=[];
 for(let i=0;i<channels.length;i++){const channel=channels[i];if(i)await pause(1000);
 try{const url=new URL(BILI_RANK_URL);url.search=new URLSearchParams({rid:String(channel.id),type:'all',web_location:'333.934'});records.push(...parseBiliRanking(await fetcher(url.href),channel));}
 catch(error){warnings.push(channel.name+'：'+error.message);if(/HTTP (401|403|429)|code -352/.test(error.message)){warnings.push('来源限制，停止后续分区请求，请稍后重试');break;}}
 }
 if(!records.length)throw new Error(warnings.join('；')||'B站分区榜没有返回有效视频');return {records,warnings};
}
