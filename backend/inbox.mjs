import {json} from './constants.mjs';
import {industryOf,contentKind,inboxFacets,materialTime,inPublicationWindow,platformBucketOf} from '../src/inbox-filters.js';

export function queryInbox(store, params) {
 const {industry='all',scoreFloor='all',platform='all',source='all',status='all',type='all',time='all',q='',sort='weighted'}=Object.fromEntries(params);
 const aiOnly=params.get('aiOnly')==='true', clock=Date.now();
 const keywords=store.settings().keywords;
 store.refreshScreening();
 const columns=q||aiOnly?'r.summary,':"'' summary,";
 const inboxRaw=store.q(`SELECT r.id,r.title,${columns} r.source_id,s.type source_type,r.status,r.tags,r.metrics,r.content_type,r.created_at,r.published_at,
   json_extract(r.rule_assessment,'$.total') AS total,json_extract(r.rule_assessment,'$.known_total') AS known_total,
   json_extract(r.rule_assessment,'$.coverage') AS coverage,coalesce(s.name,'') source_name
   FROM raw_items r LEFT JOIN sources s ON s.id=r.source_id
   WHERE NOT EXISTS(SELECT 1 FROM topic_evidence e WHERE e.raw_id=r.id)`)
   .map(r=>({...r,tags:json(r.tags,[]),metrics:json(r.metrics,{}),assessment:{total:r.total,known_total:r.known_total,coverage:r.coverage}}));
 const facets=inboxFacets(inboxRaw,store.sourceList(),{platform,source,type});
 const counts=Object.assign(Object.create(null),{all:inboxRaw.length});
 for(const row of inboxRaw){const key=platformBucketOf(row,row.source_type);counts[key]=(counts[key]||0)+1;}
 const domainKeywords=String(keywords||'').split(/[,，\n]/).map(k=>k.trim()).filter(Boolean);const domainRe=domainKeywords.length?new RegExp('(?:'+domainKeywords.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','i'):null;const items=inboxRaw.filter(r=>(industry==='all'||industryOf(r)===industry)&&(scoreFloor==='all'||(r.assessment?.total??0)>=Number(scoreFloor))&&(platform==='all'||platformBucketOf(r,r.source_type)===platform)&&(!aiOnly||!domainRe||[r.title,r.summary,r.tags.join(' ')].join(' ').match(domainRe))&&(source==='all'||r.source_id===source)&&(status==='all'||r.status===status)&&(type==='all'||contentKind(r)===type)&&inPublicationWindow(r,time,clock)&&(!q||[r.title,r.summary,r.tags.join(' '),r.source_name].join(' ').toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>{if(sort==='weighted')return (b.assessment?.known_total??-1)-(a.assessment?.known_total??-1)||(b.assessment?.coverage??0)-(a.assessment?.coverage??0)||b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id);if(sort==='recent')return (materialTime(b).timestamp??0)-(materialTime(a).timestamp??0)||b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id);const order={'抖音':0,'B站':1,'小红书':2,'GitHub':3,'文章':4},am=a.metrics||{},bm=b.metrics||{};return (order[platformBucketOf(a,a.source_type)]??5)-(order[platformBucketOf(b,b.source_type)]??5)||(bm.stats_date||bm.snapshot_at||b.created_at).slice(0,10).localeCompare((am.stats_date||am.snapshot_at||a.created_at).slice(0,10))||(am.board||'').localeCompare(bm.board||'')||(am.rank??1e9)-(bm.rank??1e9)||b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id);});
 const requested=Number(params.get('page'))||0;
 const page=Math.max(0,Math.min(Math.floor(requested),Math.ceil(items.length/50)-1));
 return {items:items.slice(page*50,(page+1)*50).map(r=>store.rawOne(r.id)),total:items.length,page,counts,facets};
}

export function materialChoices(store, query) {
 return store.q(`SELECT r.id,r.title,r.status,coalesce(s.name,'') source_name
   FROM raw_items r LEFT JOIN sources s ON s.id=r.source_id
   WHERE instr(lower(r.title || ' ' || coalesce(s.name,'')),lower(?))>0
   ORDER BY r.created_at DESC,r.id LIMIT 100`,query.trim());
}
