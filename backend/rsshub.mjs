import {parseFeed} from '../feeds.mjs';
export const DEFAULT_RSSHUB_BASE='https://rsshub.bestblogs.dev';
export const RSSHUB_PRESETS=[
 {vendor:'Anthropic',route:'/anthropic/news',kind:'官网新闻'},
 {vendor:'OpenAI',route:'/openai/news',kind:'官网新闻'},
 {vendor:'DeepSeek',route:'/deepseek/news',kind:'官网新闻'},
 {vendor:'豆包',route:'/github/repos/ByteDance-Seed/all/updated',kind:'Seed 官方开源项目',note:'订阅 ByteDance-Seed 官方组织的开源仓库动态；不等同豆包 App 公告。'},
 {vendor:'Kimi',route:'/github/repos/MoonshotAI/all/updated',kind:'官方开源项目',note:'订阅 MoonshotAI 官方组织的开源仓库动态；不等同 Kimi 产品公告。'},
 {vendor:'xAI',route:'/github/repos/xai-org/all/updated',kind:'官方开源项目',note:'订阅 xai-org 官方组织的开源仓库动态；不等同 xAI 官网新闻。'},
 {vendor:'Meta',route:'/meta/ai/blog',kind:'AI 官方博客'},
 {vendor:'知乎',route:'/zhihu/hot',kind:'热榜',note:'知乎全站热榜，问题与回答线索，非视频播放量。'},
 {vendor:'百度',route:'/baidu/top',kind:'热搜榜',note:'百度搜索风云榜，反映搜索热度。'},
 {vendor:'Hacker News',route:'/hackernews/news',kind:'国际科技社区',note:'Y Combinator 社区热帖，偏创业、工程、国际科技。'},
 {vendor:'36氪',route:'/36kr/newsflashes',kind:'科技快讯',note:'国内科技创投快讯，更新快。'},
 {vendor:'虎嗅',route:'/huxiu/article',kind:'科技商业',note:'国内科技商业深度文章。'},
 {vendor:'The Verge',route:'/theverge',kind:'国际科技媒体',note:'国际科技、消费电子、AI 产品评测。'},
 {vendor:'TechCrunch',route:'/techcrunch/news',kind:'国际创投媒体',note:'国际创业公司、融资、科技新闻。'},
 {vendor:'澎湃新闻',route:'/thepaper/featured',kind:'国内综合',note:'澎湃热榜深度报道，覆盖社会、时政、财经。'},
 {vendor:'华尔街见闻',route:'/wallstreetcn/live/global',kind:'财经快讯',note:'全球市场、A股、美股、加密货币实时快讯。'},
 {vendor:'财联社',route:'/cls/telegraph',kind:'财经电报',note:'A股盘中电报，政策、公司公告、行业动态。'},
 {vendor:'果壳',route:'/guokr/scientific',kind:'科普文化',note:'科学、健康、生活方式科普文章。'},
 {vendor:'知乎日报',route:'/zhihu/daily',kind:'每日精选',note:'知乎编辑精选回答，覆盖知识、生活、文化。'}
];
export function rsshubBase(value){const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('RSSHub实例地址必须为不含账号、参数和片段的HTTP(S)地址');return url.href.replace(/\/+$/,'');}
export function rsshubURL(base,route){const root=rsshubBase(base);if(typeof route!=='string'||!/^\/(?!\/)[a-zA-Z0-9_/%=+.,@~-]+(?:\/[a-zA-Z0-9_/%=+.,@~-]+)*$/.test(route)||route.split('/').some(x=>x==='.'||x==='..'))throw new Error('RSSHub路由应为 /anthropic/news 等绝对路径，不含查询参数');return root+route;}
export function parseRSSHub(body,source){const preset=RSSHUB_PRESETS.find(p=>p.route===source.query),vendor=preset?.vendor||source.name,kind=preset?.kind||'自定义订阅';
 return parseFeed(body,{...source,kind:'rss'}).map(r=>({title:r.title,summary:r.summary,url:r.url,published_at:kind.includes('开源')?'':r.publishedAt,content_type:'RSSHub · '+kind,tags:['AI','RSSHub',vendor,kind],metrics:{platform:'RSSHub',board:vendor+' · '+kind,manufacturer:vendor,subscription_kind:kind,feed_url:source.url,repository_updated_at:kind.includes('开源')?r.publishedAt:undefined,provider:'RSSHub',checked_at:r.fetchedAt,note:(preset?.note||'RSSHub转发官网公开内容，保留原始链接和来源日期。')+' 仓库动态中的日期是仓库更新时间，不是产品发布日。采集时间不代表发布时间；不提供播放量、热度或增长数据。'}}));
}
