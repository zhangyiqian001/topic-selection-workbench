import {plain} from '../feeds.mjs';
export const XHS_INDEX_URL='https://www.so.com/s';
export const XHS_INDEX_DEFAULTS='AI,科技,职场,教育,美食,旅行,家居,母婴,时尚,汽车,健身,财经';
export function indexKeywords(query=XHS_INDEX_DEFAULTS){const words=[...new Set(String(query||XHS_INDEX_DEFAULTS).split(/[,，\n]/).map(x=>x.trim()).filter(Boolean))];if(!words.length||words.length>24||words.some(x=>x.length>40||/[<>\x00-\x1f]/.test(x)))throw new Error('小红书索引检索词应为1–24个，每个不超过40字');return words;}
export function indexURL(keyword,page=1){const url=new URL(XHS_INDEX_URL);url.search=new URLSearchParams({q:'site:xiaohongshu.com '+keyword,pn:String(page)});return url.href;}
const attribute=(tag,key)=>{const match=tag.match(new RegExp('\\b'+key+'\\s*=\\s*([\x22\x27])([\\s\\S]*?)\\1','i'));return match?plain(match[2]):'';};
export function parseXhsIndex(html,keyword,{page=1,checked=new Date().toISOString()}={}){
 if(/<title[^>]*>[^<]*(?:验证码|访问验证|安全验证|人机验证)/i.test(html))throw new Error('搜索来源要求验证，未将验证页当作笔记');
 const chunks=[...html.matchAll(/<li\b[^>]*class=["'][^"']*\bres-list\b[^"']*["'][^>]*>([\s\S]*?)(?=<li\b[^>]*class=["'][^"']*\bres-list\b|<\/ul>)/gi)];
 if(!chunks.length){if(/(?:没有找到|未找到|找不到|无相关结果)/.test(plain(html)))return [];throw new Error('搜索页面格式变化或没有公开结果区');}
 const records=[],seen=new Set();for(const [,chunk]of chunks){const heading=chunk.match(/<h3\b[^>]*class=["'][^"']*\bres-title\b[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)?.[1];if(!heading)continue;const anchor=heading.match(/<a\b([^>]*)>([\s\S]*?)<\/a>/i);if(!anchor)continue;const rawURL=attribute(anchor[1],'data-mdurl')||attribute(anchor[1],'href');let url;try{url=new URL(rawURL);}catch{continue;}
 if(!['https:','http:'].includes(url.protocol)||!['www.xiaohongshu.com','xiaohongshu.com','m.xiaohongshu.com'].includes(url.hostname)||url.username||url.password||!/^\/(?:explore|discovery\/item)\/[a-f0-9]{24}\/?$/i.test(url.pathname))continue;
 const title=plain(anchor[2]).replace(/\s*[-–—|]\s*小红书\s*$/,'').trim();if(!title||seen.has(url.pathname))continue;seen.add(url.pathname);
 const description=chunk.match(/<span\b[^>]*\bdata-result-summary\b[^>]*>([\s\S]*?)<\/span>/i)?.[1]||chunk.match(/<p\b[^>]*class=["'][^"']*\bres-desc\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]||'';
 const summary=plain(description).slice(0,1200),displayDate=plain(chunk.match(/<span\b[^>]*class=["'][^"']*\bgray\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]||'').replace(/\s*-\s*$/,'');
 records.push({title,summary:summary||'搜索来源未提供摘要，仅保留标题与笔记原始链接。',url:url.href,published_at:'',content_type:'小红书笔记线索',tags:['小红书','公开索引',keyword],metrics:{platform:'小红书',board:'公开索引 · 笔记线索',provider:'360公开搜索索引',provider_url:indexURL(keyword,page),discovery_keyword:keyword,search_page:page,search_date_text:displayDate,checked_at:checked,snapshot_at:checked,source_time_known:false,note:'来源为搜索引擎已收录的小红书笔记标题与摘要，非站内实时笔记榜，搜索顺序不代表热度。无互动量，不推测点赞/收藏/播放。搜索页日期未核验为发布时间，发布时间留空；原始笔记链接完整保留，打开可能需要小红书登录。'}});
 }
 return records;
}
const FALLBACK_TERMS={时尚:['穿搭','服装搭配'],汽车:['买车','汽车测评'],财经:['理财','财经知识']};
export async function fetchXhsIndex(source,fetcher,{pause=ms=>new Promise(r=>setTimeout(r,ms))}={}){const keywords=indexKeywords(source.query),records=[],warnings=[];let requests=0,restricted=false;
 for(const keyword of keywords){let count=0;
  for(let page=1;page<=2;page++){if(requests++)await pause(1500);try{const found=parseXhsIndex(await fetcher(indexURL(keyword,page)),keyword,{page});count+=found.length;records.push(...found);}catch(error){warnings.push(keyword+'第'+page+'页：'+error.message);if(/HTTP (403|429)|要求验证/.test(error.message)){warnings.push('来源限制，停止后续检索');restricted=true;break;}}}
  if(!count&&!restricted)for(const term of FALLBACK_TERMS[keyword]||[]){if(requests++)await pause(1500);try{const found=parseXhsIndex(await fetcher(indexURL(term)),keyword);for(const record of found){record.metrics.discovery_keyword=term;record.metrics.provider_url=indexURL(term);record.metrics.industry_keyword=keyword;}records.push(...found);count+=found.length;if(count)break;}catch(error){warnings.push(keyword+'补检（'+term+'）：'+error.message);if(/HTTP (403|429)|要求验证/.test(error.message)){warnings.push('来源限制，停止后续检索');restricted=true;break;}}}
  if(!count&&!restricted)warnings.push(keyword+'：本次公开搜索及可用补检未找到笔记链接，请稍后重试或调整检索词');if(restricted)break;
 }
 if(!records.length)throw new Error('公开索引未取得可用笔记。'+warnings.slice(0,3).join('；'));return {records,warnings};}
