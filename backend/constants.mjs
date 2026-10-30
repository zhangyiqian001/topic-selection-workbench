import {DEFAULT_RSSHUB_BASE} from './rsshub.mjs';
import {SCREEN_WEIGHTS} from './assessment.mjs';
export const TOPIC_STATUSES=['待验证','待选定','已入选','创作中','制作中','待发布','已发布','待复盘','已归档','已放弃'];
export const RAW_STATUSES=['待整理','已整理','已转为选题','已忽略','采集异常'];
export const DIMENSIONS=[['value','目标用户价值',25],['heat','热度与增长趋势',25],['visual','可视化演示能力',20],['difference','内容差异化',15],['timely','时效性',10],['cost','制作成本',5]];
export const DEFAULT_SETTINGS={rsshub_base_url:DEFAULT_RSSHUB_BASE,screening_weights:SCREEN_WEIGHTS,name:'内容选题工作台',audience:'对该领域感兴趣、希望看到实用内容的普通人',directions:'你的内容方向（在设置中修改）',keywords:'',frequency_minutes:240,auto_collect:true,auto_backup:true,model_provider:'local',model_url:'http://127.0.0.1:8080',model_name:'',weights:Object.fromEntries(DIMENSIONS.map(([id,,w])=>[id,w]))};
export const now=()=>new Date().toISOString();
export const json=(value,fallback=null)=>{try{return JSON.parse(value);}catch{return fallback;}};
export function originalURL(input){if(!input)return '';const u=new URL(input);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw new Error('仅支持不含账号密码的 HTTP(S) 链接');return u.href;}
export function contentIdentity(input){if(!input)return '';let u;try{u=new URL(input);}catch{return '';}const host=u.hostname.toLowerCase();if(['douyin.com','www.douyin.com','m.douyin.com','www.iesdouyin.com','iesdouyin.com'].includes(host)){const match=u.pathname.match(/^\/(?:share\/)?video\/(\d+)\/?$/);if(match)return 'douyin:'+match[1];}if(['bilibili.com','www.bilibili.com','m.bilibili.com'].includes(host)){const match=u.pathname.match(/^\/video\/(BV[a-zA-Z0-9]{10}|av\d+)\/?$/i);if(match)return 'bilibili:'+match[1].replace(/^bv/i,'BV').replace(/^AV/,'av');}if(['xiaohongshu.com','www.xiaohongshu.com','m.xiaohongshu.com'].includes(host)){const match=u.pathname.match(/^\/(?:explore|discovery\/item)\/([a-fA-F0-9]{24})\/?$/);if(match)return 'xiaohongshu:'+match[1].toLowerCase();}return '';}
export function normalizeURL(input){if(!input)return '';const u=new URL(originalURL(input)),identity=contentIdentity(u.href);if(identity.startsWith('douyin:'))return 'https://www.douyin.com/video/'+identity.slice(7);if(identity.startsWith('bilibili:'))return 'https://www.bilibili.com/video/'+identity.slice(9);if(identity.startsWith('xiaohongshu:'))return 'https://www.xiaohongshu.com/explore/'+identity.slice(12);u.hash='';for(const key of [...u.searchParams.keys()])if(/^(utm_|fbclid$|gclid$|spm$|from$)/i.test(key))u.searchParams.delete(key);u.searchParams.sort();u.hostname=u.hostname.toLowerCase();if(u.pathname.length>1)u.pathname=u.pathname.replace(/\/+$/,'');return u.href;}
export function computeScore(scores,weights){
 const current={},priority={human:3,ai:2,rule:1};
 for(const s of scores)if(!current[s.dimension]||(priority[s.actor]||0)>=(priority[current[s.dimension].actor]||0))current[s.dimension]=s;
 const contributions={},missing=[];let known=0,coverage=0;
 for(const [key,label]of DIMENSIONS){const s=current[key],weight=Number(weights[key])||0;const available=!!s&&Number.isFinite(s.value)&&s.value>=0&&s.value<=5&&!!s.reason?.trim();const points=available?s.value/5*weight:null;
  contributions[key]={label,weight,value:available?s.value:null,points:weight===0?0:points===null?null:Math.round(points*100)/100,reason:s?.reason||'信息不足',actor:s?.actor||'',excluded:weight===0};
  if(weight>0){if(available){known+=points;coverage+=weight;}else missing.push(key);}
 }
 return {total:missing.length?null:Math.round(known*10)/10,known_total:Math.round(known*10)/10,coverage:Math.round(coverage*10)/10,current,contributions,missing,complete:!missing.length};
}
