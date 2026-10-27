export const SCREEN_DIMENSIONS=[['relevance','AI 方向匹配',35],['practical','实用内容线索',25],['attention','平台关注度',15],['freshness','内容时效',15],['evidence','资料完整度',10]];
export const SCREEN_WEIGHTS=Object.fromEntries(SCREEN_DIMENSIONS.map(([k,,w])=>[k,w]));
const hits=(text,re)=>[...new Set(text.match(re)||[])];
export function assessRaw(raw,allRaw,settings,clock=Date.now()){
 const title=String(raw.title||''),summary=String(raw.summary||''),text=[title,summary,...(raw.tags||[])].join(' '),m=raw.metrics||{};
 const core=hits(text,/\b(?:AI|LLM|GPT\w*|ChatGPT|Claude|Gemini|DeepSeek|Qwen|Kimi|ComfyUI|Ollama|RAG)\b|人工智能|大模型|智能体|提示词|豆包|通义|千问|文心|机器学习|生成式|人工智慧/gi);
 const custom=String(settings.keywords||'').split(/[,，\n]/).map(k=>k.trim()).filter(k=>k&&(/^[a-z]{1,3}$/i.test(k)?new RegExp('(?:^|[^a-z])'+k+'(?:[^a-z]|$)','i').test(text):text.toLowerCase().includes(k.toLowerCase())));
 const practical=hits(text,/教程|实测|对比|步骤|怎么|如何|避坑|免费|省钱|效率|办公|学习|录屏|部署|提示词|总结|文档|编程|工作流|tutorial|demo|how to/gi);
 const scores=[],add=(dimension,value,reason,observed=true)=>scores.push({dimension,value,reason,observed,actor:'rule',model:'screen-v2'});
 add('relevance',core.length?Math.min(5,3+Math.min(2,core.length-1)):custom.length?2:0,core.length?`AI 实体/主题命中：${core.join('、')}。这是文本方向匹配，不代表事实已核验。`:custom.length?`仅命中自定义词：${custom.slice(0,5).join('、')}，未发现明确 AI 主题。`:'未发现明确 AI 主题或定位关键词，降低筛选优先级。');
 add('practical',practical.length?Math.min(5,2+practical.length):1,practical.length?`可转为实用科普的文本线索：${practical.join('、')}。按线索丰富度计分，不冒称已实测或已验证用户需求。`:'未识别到具体用法、教程、对比或问题线索，低分表示当前材料不够具体。');
 const peers=allRaw.filter(r=>{const x=r.metrics||{};return x.platform===m.platform&&x.board===m.board&&(x.stats_date||x.snapshot_at?.slice(0,10)||'')===(m.stats_date||m.snapshot_at?.slice(0,10)||'');});
 const n=Math.max(0,...peers.map(r=>Number(r.metrics?.rank)||0));
 if(m.platform&&Number.isInteger(m.rank)&&m.rank>0&&n>=3)add('attention',Math.round((1+4*(1-(m.rank-1)/(n-1)))*10)/10,`同平台同榜同日期，返回位置 ${m.rank}/${n}。${m.rank_kind==='provider_order'?'第三方页面顺序':m.rank_kind==='list_order'?'热门列表顺序':'榜单位置'}仅作关注信号，不代表增速。来源：${m.provider_url||raw.url}`);
 else {const key=['plays','hot_value','likes','stars','downloads'].find(k=>Number.isFinite(m[k])&&peers.filter(r=>Number.isFinite(r.metrics?.[k])).length>=3);if(key){const valid=peers.filter(r=>Number.isFinite(r.metrics?.[key])),percentile=valid.filter(r=>r.metrics[key]<m[key]).length/Math.max(1,valid.length-1);add('attention',Math.round((1+4*percentile)*10)/10,`同平台同榜日期 ${valid.length} 条材料比较 ${key}=${m[key]}；累计快照不代表增长。`);}else add('attention',2.5,'估计：缺少可比热度样本，使用中性先验 2.5/5，不冒称真实热度；数据充分度降低。',false);}
 const published=Date.parse(raw.published_at||''),snapshot=Date.parse(m.snapshot_at||'');
 if(Number.isFinite(published)&&published<=clock+300000){const h=(clock-published)/3600000;add('freshness',h<=24?5:h<=72?4:h<=168?3:h<=720?2:1,`依据来源发布时间 ${new Date(published).toISOString()}；超过30天仍保留长青内容基础分。`);}
 else if(Number.isFinite(snapshot)&&snapshot<=clock+300000)add('freshness',2.5,`估计：仅有榜单快照时间 ${new Date(snapshot).toISOString()}，不能证明内容刚发布；时效使用中性先验。`,false);
 else add('freshness',2.5,'估计：缺少可信发布时间，时效使用中性先验，不使用入库时间冒充发布时间。',false);
 let url=false;try{url=['https:','http:'].includes(new URL(raw.url).protocol);}catch{}
 const detail=summary.replace(/<[^>]*>/g,'').trim().length;
 add('evidence',Math.min(5,(url?2:0)+(detail>=120?2:detail>=30?1:0)+(Number.isFinite(published)?1:0)),`资料完整度：${url?'有原始链接':'无原始链接'}、摘要${detail}字、${Number.isFinite(published)?'有发布时间':'无发布时间'}。只评价可追溯材料齐备程度，不认证来源真实性。`);
 const weights=settings.screening_weights||SCREEN_WEIGHTS,contributions={};let base=0,coverage=0;
 for(const [key,label]of SCREEN_DIMENSIONS){const s=scores.find(x=>x.dimension===key),weight=weights[key];const points=Math.round(s.value/5*weight*100)/100;base+=points;if(s.observed)coverage+=weight;contributions[key]={label,weight,value:s.value,points,reason:s.reason,estimated:!s.observed,excluded:weight===0};}
 base=Math.round(base*10)/10;const gate=!core.length,cap=gate?(custom.length?50:25):100,total=Math.min(base,cap);
 return {total,known_total:total,base_total:base,coverage,contributions,scores,complete:true,missing:[],method:'AI 科普优先分 v2',version:2,needs_review:true,confidence:coverage>=85?'数据较充分':coverage>=60?'数据一般':'数据较少',recommendation:!core.length?'低匹配，暂缓':total>=75?'优先查看':total>=55?'值得查看':'留作备选',adjustment:gate?`未识别明确 AI 主题，匹配门槛将总分上限设为 ${cap} 分。`:'',explanation:'总分用于素材筛选，不是爆款概率；估计项采用中性先验，数据充分度单独展示。'};
}
