export const SCREEN_DIMENSIONS=[['relevance','领域匹配',35],['practical','实用内容线索',25],['attention','平台关注度',15],['freshness','内容时效',15],['evidence','资料完整度',10]];
export const SCREEN_WEIGHTS=Object.fromEntries(SCREEN_DIMENSIONS.map(([k,,w])=>[k,w]));
const hits=(text,re)=>[...new Set(text.match(re)||[])];
// 通用内容形态词：不绑定具体行业，只识别"这条内容是否具体、可参考"
const PRACTICAL_RE=/教程|实测|对比|步骤|怎么|如何|避坑|免费|省钱|效率|录屏|总结|案例|指南|方法|清单|tutorial|demo|how to|guide|checklist|tips/gi;
export function assessRaw(raw,allRaw,settings,clock=Date.now()){
 const title=String(raw.title||''),summary=String(raw.summary||''),text=[title,summary,...(raw.tags||[])].join(' '),m=raw.metrics||{};
 const keywords=String(settings.keywords||'').split(/[,，\n]/).map(k=>k.trim()).filter(Boolean);
 const matched=[];
 for(const kw of keywords){
  if(!kw) continue;
  const re=/^[a-z]{1,3}$/i.test(kw)?new RegExp('(?:^|[^a-z])'+kw+'(?:[^a-z]|$)','i'):new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');
  const found=hits(text,re);
  if(found.length) matched.push(kw);
 }
 const practical=hits(text,PRACTICAL_RE);
 const scores=[],add=(dimension,value,reason,observed=true)=>scores.push({dimension,value,reason,observed,actor:'rule',model:'screen-generic-v1'});
 if(matched.length){
  const v=Math.min(5,3+Math.min(2,matched.length-1));
  add('relevance',v,`领域关键词命中：${matched.slice(0,6).join('、')}。这是文本方向匹配，不代表事实已核验。`);
 }else{
  add('relevance',1,keywords.length?`未命中设置中的领域关键词（${keywords.slice(0,5).join('、')}${keywords.length>5?'等':''}）。可在设置中补充领域词。`:'未配置领域关键词，领域匹配使用最低分。请到设置页填写你的关注方向。');
 }
 add('practical',practical.length?Math.min(5,2+practical.length):1,practical.length?`可转为具体内容的文本线索：${practical.join('、')}。按线索丰富度计分，不冒称已实测或已验证用户需求。`:'未识别到具体用法、教程、对比或问题线索，低分表示当前材料不够具体。');
 const peers=allRaw.filter(r=>{const x=r.metrics||{};return x.platform===m.platform&&x.board===m.board&&(x.stats_date||x.snapshot_at?.slice(0,10)||'')===(m.stats_date||m.snapshot_at?.slice(0,10)||'');});
 const n=Math.max(0,...peers.map(r=>Number(r.metrics?.rank)||0));
 if(m.platform&&Number.isInteger(m.rank)&&m.rank>0&&n>=3)add('attention',Math.round((1+4*(1-(m.rank-1)/(n-1)))*10)/10,`同平台同榜同日期，返回位置 ${m.rank}/${n}。${m.rank_kind==='provider_order'?'第三方页面顺序':m.rank_kind==='list_order'?'热门列表顺序':'榜单位置'}仅作关注信号，不代表增速。来源：${m.provider_url||raw.url}`);
 else {const key=['plays','hot_value','likes','stars','downloads'].find(k=>Number.isFinite(m[k])&&peers.filter(r=>Number.isFinite(r.metrics?.[k])).length>=3);if(key){const valid=peers.filter(r=>Number.isFinite(r.metrics?.[key])),percentile=valid.filter(r=>r.metrics[key]<m[key]).length/Math.max(1,valid.length-1);add('attention',Math.round((1+4*percentile)*10)/10,`同平台同榜日期 ${valid.length} 条材料比较 ${key}=${m[key]}；累计快照不代表增长。`);}else add('attention',2.5,'估计：缺少可比热度样本，使用中性先验 2.5/5，不冒称真实热度；数据充分度降低。',false);}
 const published=Date.parse(raw.published_at||''),snapshot=Date.parse(m.snapshot_at||'');
 if(Number.isFinite(published)&&published<=clock+300000){const h=(clock-published)/3600000;add('freshness',h<=24?5:h<=72?4:h<=168?3:h<=720?2:1,`依据来源发布时间 ${new Date(published).toISOString()}；超过30天仍保留长青内容基础分。`);}
 else if(Number.isFinite(snapshot)&&snapshot<=clock+300000)add('freshness',2.5,`估计：仅有榜单快照时间 ${new Date(snapshot).toISOString()}，不能证明内容刚发布；时效使用中性先验。`,false);
 else add('freshness',2.5,'估计：缺少可信发布时间，时效使用中性先验，不使用入库时间冒充发布时间。');
 let url=false;try{url=['https:','http:'].includes(new URL(raw.url).protocol);}catch{}
 const detail=summary.replace(/<[^>]*>/g,'').trim().length;
 add('evidence',Math.min(5,(url?2:0)+(detail>=120?2:detail>=30?1:0)+(Number.isFinite(published)?1:0)),`资料完整度：${url?'有原始链接':'无原始链接'}、摘要${detail}字、${Number.isFinite(published)?'有发布时间':'无发布时间'}。只评价可追溯材料齐备程度，不认证来源真实性。`);
 const weights=settings.screening_weights||SCREEN_WEIGHTS,contributions={};let base=0,coverage=0;
 for(const [key,label]of SCREEN_DIMENSIONS){const s=scores.find(x=>x.dimension===key),weight=weights[key];const points=Math.round(s.value/5*weight*100)/100;base+=points;if(s.observed)coverage+=weight;contributions[key]={label,weight,value:s.value,points,reason:s.reason,estimated:!s.observed,excluded:weight===0};}
 base=Math.round(base*10)/10;
 return {total:base,known_total:base,base_total:base,coverage,contributions,scores,complete:true,missing:[],method:'领域优先分 v1（通用版）',version:3,needs_review:true,confidence:coverage>=85?'数据较充分':coverage>=60?'数据一般':'数据较少',recommendation:base>=75?'优先查看':base>=55?'值得查看':'留作备选',adjustment:'',explanation:'总分用于素材筛选，不是爆款概率；领域匹配由设置中的关键词决定；估计项采用中性先验，数据充分度单独展示。'};
}
