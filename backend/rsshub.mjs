import {parseFeed} from '../feeds.mjs';
export const DEFAULT_RSSHUB_BASE='https://rsshub.bestblogs.dev';
export const RSSHUB_PRESETS=[
 {vendor:'Anthropic',route:'/anthropic/news',kind:'官网新闻'},
 {vendor:'OpenAI',route:'/openai/news',kind:'官网新闻'},
 {vendor:'DeepSeek',route:'/deepseek/news',kind:'官网新闻'},
 {vendor:'豆包',route:'/github/repos/ByteDance-Seed/all/updated',kind:'Seed 官方开源项目',note:'订阅 ByteDance-Seed 官方组织的开源仓库动态；不等同豆包 App 公告。'},
 {vendor:'Kimi',route:'/github/repos/MoonshotAI/all/updated',kind:'官方开源项目',note:'订阅 MoonshotAI 官方组织的开源仓库动态；不等同 Kimi 产品公告。'},
 {vendor:'xAI',route:'/github/repos/xai-org/all/updated',kind:'官方开源项目',note:'订阅 xai-org 官方组织的开源仓库动态；不等同 xAI 官网新闻。'},
 {vendor:'Meta',route:'/meta/ai/blog',kind:'AI 官方博客'}
];
export function rsshubBase(value){const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('RSSHub实例地址必须为不含账号、参数和片段的HTTP(S)地址');return url.href.replace(/\/+$/,'');}
export function rsshubURL(base,route){const root=rsshubBase(base);if(typeof route!=='string'||!/^\/(?!\/)[a-zA-Z0-9_/%=+.,@~-]+(?:\/[a-zA-Z0-9_/%=+.,@~-]+)*$/.test(route)||route.split('/').some(x=>x==='.'||x==='..'))throw new Error('RSSHub路由应为 /anthropic/news 等绝对路径，不含查询参数');return root+route;}
export function parseRSSHub(body,source){const preset=RSSHUB_PRESETS.find(p=>p.route===source.query),vendor=preset?.vendor||source.name,kind=preset?.kind||'自定义订阅';
 return parseFeed(body,{...source,kind:'rss'}).map(r=>({title:r.title,summary:r.summary,url:r.url,published_at:kind.includes('开源')?'':r.publishedAt,content_type:'RSSHub · '+kind,tags:['AI','RSSHub',vendor,kind],metrics:{platform:'RSSHub',board:vendor+' · '+kind,manufacturer:vendor,subscription_kind:kind,feed_url:source.url,repository_updated_at:kind.includes('开源')?r.publishedAt:undefined,provider:'RSSHub',checked_at:r.fetchedAt,note:(preset?.note||'RSSHub转发官网公开内容，保留原始链接和来源日期。')+' 仓库动态中的日期是仓库更新时间，不是产品发布日。采集时间不代表发布时间；不提供播放量、热度或增长数据。'}}));
}
