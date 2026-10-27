export const DEFAULT_KEYWORDS='AI,人工智能,大模型,智能体,智能助手,生成式,机器学习,深度学习,ChatGPT,GPT,Claude,Gemini,DeepSeek,Kimi,豆包,通义,千问,文心,即梦,可灵,Seedance,OpenAI,Anthropic,Hugging Face,机器人,算力,提示词';
export function keywordMatches(item, keywords=DEFAULT_KEYWORDS) {
 const text=`${item.title} ${item.summary||''}`;
 return keywords.split(/[,，\n]/).map(x=>x.trim()).filter(Boolean).filter(k=>{
  const escaped=k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(/^[a-z]{1,3}$/i.test(k)?`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`:escaped,'i').test(text);
 });
}
export function mergeRadar(existing,incoming) {
 const map=new Map(existing.map(x=>[x.id,{...x}]));
 for(const item of incoming){const old=map.get(item.id);map.set(item.id,{...item,favorite:old?.favorite||false,ignored:old?.ignored||false});}
 return [...map.values()].sort((a,b)=>b.fetchedAt.localeCompare(a.fetchedAt)).slice(0,1500);
}
export function editorialScore(t) {
 const keys=['relevance','value','demoScore','novelty'];
 if(keys.some(k=>!Number.isFinite(t[k])||t[k]<1||t[k]>5))return null;
 return Math.round((t.relevance*.35+t.value*.3+t.demoScore*.2+t.novelty*.15)*20);
}
export function angleDrafts(item) {
 const common={sourceRadarId:item.id,audience:'对 AI 感兴趣的普通人',sources:`${item.sourceName} · ${item.title}\n${item.url}\n来源时间：${item.publishedAt||'未提供'}\n采集时间：${item.fetchedAt}\n${item.summary||''}\n以上仅为线索，拍摄前核验一手来源与实际功能。`,status:'待确认',sourceVerified:false,priority:'常规',effort:'待评估',deadline:''};
 return [
 {...common,title:`${item.title}：到底发生了什么？`,category:'热点解读',angle:'先用一句话说明事件，再区分已经证实的变化与仍待核验的信息。',question:'这件事到底改变了什么？',promise:'看完能区分事实、宣传和推测。',hook:'这条 AI 新闻，你真正需要知道的是什么？',demoPlan:'展示原始公告和关键原文，用画面标记能核实的事实。',risk:'标题是规则模板，不代表已读完原文。先核实事件、主体、版本和时间。'},
 {...common,title:`${item.title}：普通人怎么验证？`,category:'工具实测',angle:'围绕一项可复现的能力，设计对照实测，展示操作与限制。',question:'新闻里的能力，在真实任务里能用吗？',promise:'学会设计一次可以自己复现的验证。',hook:'先别只看宣传，我们用同一个任务验证一下。',demoPlan:'核实是否能访问相关工具；固定输入、版本和评判标准，录屏展示成功与失败。',risk:'先确认事件是否涉及可用工具；无法复现时不要发布能力结论。'},
 {...common,title:`从「${item.title}」讲懂一个 AI 概念`,category:'知识科普',angle:'从事件中挑选一个概念，解释原理、适用场景和边界。',question:'理解这条新闻，需要先弄懂哪个概念？',promise:'用 1–3 分钟讲清一个与新闻相关的基本原理。',hook:'这条新闻背后，有一个经常被误解的 AI 概念。',demoPlan:'先阅读来源确定概念，再准备一个简单图示或可核验例子。',risk:'需要人工选定具体概念，避免从标题推断新闻未提及的能力。'}
 ];
}
export function parseTopicImport(text) {
 const clean=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 let data;try{data=JSON.parse(clean);}catch{throw new Error('请粘贴 JSON 数组，可包含 Markdown 代码块。');}
 if(!Array.isArray(data)||!data.length||data.length>50)throw new Error('一次导入 1–50 条选题，最外层必须为数组。');
 return data.map((t,i)=>{
  if(!t||typeof t!=='object'||typeof t.title!=='string'||!t.title.trim()||typeof t.angle!=='string'||!t.angle.trim())throw new Error(`第 ${i+1} 条缺少 title（标题）或 angle（切入角度）。`);
  const record={};for(const key of ['title','angle','audience','sources','category','question','promise','hook','demoPlan','risk']){if(t[key]!==undefined&&typeof t[key]!=='string')throw new Error(`第 ${i+1} 条的 ${key} 必须是文本。`);record[key]=(t[key]||'').trim().slice(0,key==='title'?300:10000);}
  if(!['知识科普','工具实测','技巧分享','热点解读','案例拆解'].includes(record.category))record.category='知识科普';
  return record;
 });
}
export function topicPrompt(items,settings) {
 return `你是我的抖音 AI 科普选题编辑。视频 1–3 分钟；受众：${settings.audience}；风格：${settings.tone}。\n以下是公开来源线索，不等于事实已核验。先打开原始资料，区分事实、推断和待核验信息；无法访问就写明，不能编造来源、能力或热度。抖音热度仅代表该榜单返回值，不代表账号预期播放量。\n请给出 5 个适合我拍摄的选题，每个只讲一个核心问题，附上具体演示、观众收获与风险。\n只返回 JSON 数组，字段必须为字符串：title,category,angle,audience,question,promise,hook,demoPlan,risk,sources。category 仅限知识科普、工具实测、技巧分享、热点解读、案例拆解。sources 保留对应原始链接。返回内容将人工导入选题池。\n\n线索：\n${items.map((x,i)=>`${i+1}. ${x.title}\n来源：${x.sourceName} ${x.url}\n来源时间：${x.publishedAt||'未知'}；采集：${x.fetchedAt}\n${x.summary||''}`).join('\n\n')}`;
}
