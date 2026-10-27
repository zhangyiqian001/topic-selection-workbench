import {XMLParser} from 'fast-xml-parser';
import {createHash} from 'node:crypto';
export const SOURCES=[
 {id:'douyin',name:'抖音热榜',kind:'douyin',url:'https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/',site:'https://www.douyin.com/hot'},
 {id:'qbitai',name:'量子位',kind:'rss',url:'https://www.qbitai.com/feed',site:'https://www.qbitai.com/'},
 {id:'huggingface',name:'Hugging Face 官方',kind:'rss',url:'https://huggingface.co/blog/feed.xml',site:'https://huggingface.co/blog'}
];
const parser=new XMLParser({ignoreAttributes:false,processEntities:false,trimValues:true});
const text=v=>String(typeof v==='object'&&v?v['#text']||'':v||'');
const decodeEntities=value=>value.replace(/&(?:nbsp|amp|quot|lt|gt|apos|#\d+|#x[0-9a-f]+);/gi,x=>{const named={'&nbsp;':' ','&amp;':'&','&quot;':'"','&lt;':'<','&gt;':'>',"&apos;":"'"};if(named[x.toLowerCase()]!==undefined)return named[x.toLowerCase()];const code=x[2].toLowerCase()==='x'?parseInt(x.slice(3,-1),16):Number(x.slice(2,-1));return Number.isInteger(code)&&code>=0&&code<=0x10ffff?String.fromCodePoint(code):'';});
export const plain=v=>{let value=text(v).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1');for(let i=0;i<3;i++)value=decodeEntities(value);return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();};
const date=v=>{const t=Date.parse(text(v));return Number.isFinite(t)?new Date(t).toISOString():'';};
const url=v=>{try{const u=new URL(decodeEntities(text(v)));return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const id=(source,key)=>source+'-'+createHash('sha256').update(key).digest('hex').slice(0,20);
export function parseFeed(body,source,fetchedAt=new Date().toISOString()) {
 if(source.kind==='douyin') {
  const data=JSON.parse(body);if(data.status_code!==0||!Array.isArray(data.word_list)||!data.word_list.length)throw new Error('接口未返回有效热榜');
  return data.word_list.slice(0,100).map((r,i)=>({id:id(source.id,String(r.word)),title:String(r.word||'').slice(0,400),summary:'',url:`https://www.douyin.com/search/${encodeURIComponent(r.word)}`,sourceId:source.id,sourceName:source.name,kind:'douyin',publishedAt:date(data.active_time?.replace(' ','T')+'+08:00'),fetchedAt,rank:i+1,hotValue:Number.isFinite(Number(r.hot_value))?Number(r.hot_value):0,dataKind:'live',favorite:false,ignored:false})).filter(x=>x.title);
 }
 if(!/<(?:rss|feed)[\s>]/i.test(body))throw new Error('来源返回了网页而非 RSS');
 const parsed=parser.parse(body),raw=parsed.rss?.channel?.item||parsed.feed?.entry||[],items=Array.isArray(raw)?raw:[raw];
 const records=items.slice(0,80).map(item=>{
  const link=typeof item.link==='object'?(Array.isArray(item.link)?item.link.find(l=>!l['@_rel']||l['@_rel']==='alternate')?.['@_href']:item.link['@_href']):item.link;
  const title=plain(item.title).slice(0,400),href=url(link);
  return {id:id(source.id,href||title),title,summary:plain(item.description||item.summary||item['content:encoded']||item.content).slice(0,1500),url:href,sourceId:source.id,sourceName:source.name,kind:'news',publishedAt:date(item.pubDate||item.published||item.updated),fetchedAt,rank:0,hotValue:0,dataKind:'live',favorite:false,ignored:false};
 }).filter(x=>x.title&&x.url);
 if(!records.length)throw new Error('来源没有可解析的文章');return records;
}
const cache=new Map(),inflight=new Map();
async function collect(source){
 const cached=cache.get(source.id);if(cached&&Date.now()-cached.timestamp<180000)return {...cached.result,cached:true};
 if(inflight.has(source.id))return inflight.get(source.id);
 const work=(async()=>{
  try{
   const response=await fetch(source.url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Mozilla/5.0 ContentStudio/1.1','Accept':'application/rss+xml, application/xml, application/json, text/xml;q=0.9'}});
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const reader=response.body.getReader();let size=0;const chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3*1024*1024){await reader.cancel();throw new Error('响应超过大小限制');}chunks.push(value);}
   const fetchedAt=new Date().toISOString(),items=parseFeed(Buffer.concat(chunks).toString('utf8'),source,fetchedAt);
   const result={sourceId:source.id,sourceName:source.name,url:source.site,status:'ok',fetchedAt,items,cached:false,stale:false};cache.set(source.id,{timestamp:Date.now(),result});return result;
  }catch(error){return {sourceId:source.id,sourceName:source.name,url:source.site,status:'error',error:error.name==='TimeoutError'?'请求超时':error.message,fetchedAt:cached?.result.fetchedAt||'',items:cached?.result.items||[],cached:!!cached,stale:!!cached};}
 })();inflight.set(source.id,work);try{return await work;}finally{inflight.delete(source.id);}
}
export async function fetchRadar(){return {fetchedAt:new Date().toISOString(),sources:await Promise.all(SOURCES.map(collect))};}
