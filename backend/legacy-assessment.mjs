import {DIMENSIONS,computeScore} from './constants.mjs';
const tokens=value=>String(value||'').split(/[,，\n]/).map(x=>x.trim()).filter(Boolean);
export function assessRaw(raw,allRaw,settings){
 const text=[raw.title,raw.summary,...(raw.tags||[])].join(' '),matches=tokens(settings.keywords).filter(k=>{const escaped=k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(/^[a-z]{1,3}$/i.test(k)?`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`:escaped,'i').test(text);});
 const scores=DIMENSIONS.map(([dimension])=>({dimension,value:null,reason:'信息不足：需要人工或本地模型进一步研判。',actor:'rule',model:'evidence-rules-v1'})),set=(dimension,value,reason)=>Object.assign(scores.find(s=>s.dimension===dimension),{value,reason});
 set('value',matches.length?Math.min(5,3+Math.min(2,matches.length-1)):0,matches.length?`规则初筛：标题、摘要或标签命中内容关键词“${matches.slice(0,5).join('、')}”，仅表示方向匹配，真实用户价值待核验。`:'规则初筛：标题、摘要和标签未命中当前内容关键词，方向匹配暂记0分；不等于正文没有价值。');
 const m=raw.metrics||{},rank=m.rank,peers=allRaw.filter(r=>{const rm=r.metrics||{};return rm.platform===m.platform&&rm.board===m.board&&(rm.stats_date||rm.snapshot_at?.slice(0,10))===(m.stats_date||m.snapshot_at?.slice(0,10));});
 if(m.platform&&Number.isInteger(rank)&&rank>0){const n=Math.max(rank,...peers.map(r=>r.metrics?.rank||0)),value=Math.max(1,Math.ceil((1-(rank-1)/Math.max(n,1))*5));set('heat',value,`规则初筛：${m.provider||m.platform}“${m.board}”返回顺序第${rank}/${n}；${m.rank_kind==='list_order'?'这是热门列表顺序，不是全站排名':m.rank_kind==='provider_order'?'这是第三方页面顺序，不冒称官方名次':'保留原始榜单位置'}。只反映当前快照，无增长趋势证据。来源：${m.provider_url||raw.url}`);}
 else if(m.platform){const key=['plays','hot_value','likes'].find(k=>Number.isFinite(m[k]));if(key&&peers.filter(r=>Number.isFinite(r.metrics?.[key])).length>=3){const valid=peers.filter(r=>Number.isFinite(r.metrics?.[key])),below=valid.filter(r=>r.metrics[key]<=m[key]).length;set('heat',Math.max(1,Math.ceil(below/valid.length*5)),`规则初筛：仅在同平台、同口径、同日期的${valid.length}条记录中比较${key}=${m[key]}，不跨平台比热度，也不把累计值当增长趋势。来源：${raw.url}`);}}
 if(/教程|步骤|录屏|实测|演示|对比|操作|tutorial|how to|demo/i.test(text))set('visual',4,'规则初筛：文本包含教程、步骤、实测、演示或对比线索；暂估可展示，实际操作可行性需要人工核验。');
 else set('visual',null,'信息不足：当前标题与摘要没有具体演示方案，未凭空估计可视化能力。');
 set('difference',null,'信息不足：缺少对标内容与差异化论据，需要人工补充，不能仅凭标题新鲜就给高分。');
 const time=Date.parse(m.snapshot_at||raw.published_at||'');if(Number.isFinite(time)&&time<=Date.now()+300000){const hours=(Date.now()-time)/3600000;set('timely',hours<=24?5:hours<=72?4:hours<=168?3:hours<=720?1:0,`规则初筛：依据${m.snapshot_at?'数据快照':'来源发布'}时间${new Date(time).toISOString()}评估时效；不把入库时间当新闻发布时间。`);}else set('timely',null,'信息不足：没有可信来源时间，不能用刚入库冒充刚发布。');
 set('cost',null,'信息不足：未提供实测、录屏和剪辑耗时或费用，制作成本待人工估算；高分代表成本低。');
 return {...computeScore(scores,settings.weights),scores,method:'证据规则初筛',needs_review:true};
}
