import {DEFAULT_KEYWORDS} from './radar-core.js';
export const SCHEMA = 2;
export const uid = () => globalThis.crypto.randomUUID();
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createState() { return {version: SCHEMA, settings:{name:'张的工作台', focus:'', audience:'对 AI 感兴趣、希望提高工作效率的普通人', duration:'2分钟', tone:'通俗、准确、有实例，避免夸大',radarKeywords:DEFAULT_KEYWORDS}, inbox:[], topics:[], scripts:[], assets:[], tasks:[], reviews:[],radar:[],radarMeta:[], sampleLoaded:false}; }
export function sampleState() {
  const s=createState(), date=today();
  s.sampleLoaded=true; s.settings.focus='完成「AI 幻觉是什么」脚本，今晚按计划发布';
  s.inbox=[{id:'in1',title:'一个问题：AI 为什么会编造参考文献？',text:'想用一个现场核验来源的演示，把 AI 幻觉讲清楚。',url:'',type:'问题',created:date},{id:'in2',title:'对比 AI 搜索与传统搜索的使用体验',text:'选同一个问题，对比来源透明度、时效性与验证步骤。',url:'',type:'灵感',created:date},{id:'in3',title:'提示词是不是越长越好？',text:'设计两组对照：冗长描述与任务、背景、约束明确的简短描述。',url:'',type:'灵感',created:date}];
  s.topics=[{id:'t1',title:'AI 幻觉是什么？',category:'知识科普',angle:'为什么 AI 会一本正经地说错？用一个可核验的例子解释。',audience:'AI 初学者',sources:'拍摄前补充官方文档或研究资料，并核验示例。',status:'创作中',created:date},{id:'t2',title:'三个值得实测的 AI 搜索工具',category:'工具实测',angle:'同一道问题，比较来源、答案质量和操作成本。',audience:'职场人',sources:'待补充各工具官方说明及实测记录。',status:'待确认',created:date},{id:'t3',title:'提示词越长越好吗？',category:'技巧分享',angle:'展示任务、背景和输出格式如何影响结果。',audience:'AI 初学者',sources:'待补充可复现的提示词和输出对照。',status:'待确认',created:date},{id:'t4',title:'普通人如何用好 AI 搜索',category:'工具实测',angle:'从需求出发，展示搜索、看来源、交叉核验三个步骤。',audience:'普通用户',sources:'待补充演示录屏和来源链接。',status:'待创作',created:date}];
  s.scripts=[{id:'s1',topicId:'t1',title:'AI 为什么会一本正经地胡说八道？',category:'知识科普',duration:'2分钟',hook:'你有没有遇到过：AI 回答得特别自信，但你一查，引用的资料根本不存在？',body:'用一个经过核验的例子展示 AI 幻觉。\n解释：语言模型生成的是基于上下文的输出，自信的语气不等于事实可靠。\n区分“看起来合理”和“有证据支持”，避免把所有错误归为同一种原因。',demo:'① 准备一个可以独立核验的问题。\n② 展示模型原始回答，标出待核验的事实与来源。\n③ 打开原始资料交叉核验，说明哪些成立、哪些不成立。',ending:'你遇到过 AI 最离谱的回答是什么？评论区聊聊。重要信息，记得看原始来源。',sources:'拍摄前补充真实来源、访问日期和模型版本。',materials:'录屏演示\n原始资料截图',checks:[false,false],status:'草稿',publishAt:'',publishUrl:'',created:date,updated:new Date().toISOString()}];
  s.tasks=[{id:'task1',title:'完成「AI 幻觉是什么」口播脚本',date,time:'18:00',done:false,link:'s1'},{id:'task2',title:'确认 2 条 AI 科普新选题',date,time:'',done:false,link:''}];
  return s;
}
const limits = {inbox:10000,topics:10000,scripts:10000,assets:10000,tasks:10000,reviews:10000,radar:1500,radarMeta:20};
export function validateState(raw) {
  if (!raw || typeof raw!=='object' || ![1,SCHEMA].includes(raw.version)) throw new Error('备份版本不兼容，请选择本工作台导出的 JSON 文件。');
  const base=createState();
  for(const [key,max] of Object.entries(limits)) {
    if(raw.version===1 && ['radar','radarMeta'].includes(key) && !raw[key])continue;
    if(!Array.isArray(raw[key]) || raw[key].length>max) throw new Error(`备份中的 ${key} 数据格式不正确。`);
    const ids=new Set();
    base[key]=raw[key].map(item=>{
      if(!item || typeof item!=='object' || typeof item.id!=='string' || !item.id || ids.has(item.id)) throw new Error('备份包含无效或重复的记录 ID。');
      ids.add(item.id);
      for(const [field,value] of Object.entries(item)) {
        if(['__proto__','constructor','prototype'].includes(field)) throw new Error('备份包含不支持的字段。');
        if(typeof value==='string' && value.length>200000) throw new Error('备份中的文本过长。');
        if(typeof value==='object' && value!==null && !(field==='checks' && Array.isArray(value) && value.every(v=>typeof v==='boolean'))) throw new Error('备份包含不支持的数据格式。');
      }
      const required={inbox:['title','text','url','type','created'],topics:['title','category','angle','audience','sources','status','created'],scripts:['topicId','title','category','duration','hook','body','demo','ending','sources','materials','status','publishAt','publishUrl','created','updated'],assets:['title','type','content','url','created'],tasks:['title','date','time','link'],reviews:['scriptId','date','notes'],radar:['title','summary','url','sourceId','sourceName','kind','publishedAt','fetchedAt','dataKind'],radarMeta:['sourceName','url','status','fetchedAt','error']}[key];
      if(required.some(f=>typeof item[f]!=='string')) throw new Error(`备份中的 ${key} 记录缺少必要文本字段。`);
      if(key==='tasks' && typeof item.done!=='boolean') throw new Error('待办状态格式不正确。');
      if(key==='scripts' && (!Array.isArray(item.checks)||item.checks.length!==2)) throw new Error('脚本核查状态格式不正确。');
      if(key==='topics' && !['待确认','待创作','创作中','已完成'].includes(item.status)) throw new Error('选题状态不正确。');
      if(key==='scripts' && !['草稿','已排期','已发布'].includes(item.status)) throw new Error('脚本状态不正确。');
      if(key==='reviews' && ['views','likes','saves','comments','followers'].some(f=>!Number.isFinite(item[f])||item[f]<0)) throw new Error('复盘数据必须是非负数字。');
      if(key==='radar' && (['hotValue','rank'].some(f=>!Number.isFinite(item[f])||item[f]<0)||typeof item.favorite!=='boolean'||typeof item.ignored!=='boolean'||!['live','manual'].includes(item.dataKind)))throw new Error('热点数据格式不正确。');
      if(key==='topics' && ['relevance','value','demoScore','novelty'].some(f=>item[f]!==undefined&&(!Number.isFinite(item[f])||item[f]<1||item[f]>5)))throw new Error('选题评分应为 1–5。');
      return {...item};
    });
  }
  if (!raw.settings || typeof raw.settings!=='object') throw new Error('缺少工作台设置。');
  for(const key of Object.keys(base.settings)) if(typeof raw.settings[key]==='string' && raw.settings[key].length<10000) base.settings[key]=raw.settings[key];
  base.sampleLoaded=!!raw.sampleLoaded;
  return base;
}
export function topicToScript(topic, duration='2分钟') {
  return {id:uid(),topicId:topic.id,title:topic.title,category:topic.category,duration,hook:topic.hook||'',body:topic.question?`核心问题：${topic.question}\n观众收获：${topic.promise||'待补充'}\n切入角度：${topic.angle||''}\n\n待展开口播内容。`:'',demo:topic.demoPlan||'',ending:'',sources:[topic.sources,topic.risk?`\n待核查风险：${topic.risk}`:''].filter(Boolean).join('\n'),materials:'',checks:[false,false],status:'草稿',publishAt:'',publishUrl:'',created:today(),updated:new Date().toISOString()};
}
export function safeURL(value) { try { const url=new URL(value); return ['http:','https:'].includes(url.protocol)?url.href:''; } catch{return '';} }
export function promptFor(mode, context, settings) {
  const base=`你是我的抖音 AI 科普内容编辑。目标受众：${settings.audience}。视频时长：${context.duration||settings.duration}（限制在 1–3 分钟）。表达风格：${settings.tone}。\n不要编造事实、数据、测试结果或参考链接。把确定事实、推断、待核实事项分开标注；涉及产品功能、价格、版本时标注核验日期。\n`;
  const info=`\n选题：${context.title||'请先补充选题'}\n切入角度：${context.angle||''}\n参考资料：${context.sources||'暂无，请列出需要我补充和核验的资料，不能编造来源。'}\n现有内容：\n${[context.hook,context.body,context.demo,context.ending,context.text].filter(Boolean).join('\n')||'暂无'}\n`;
  const requests={topics:'基于以下素材提出 5 个 AI 科普短视频选题。每个给出标题、用户问题、核心价值、演示方案、需要核实的事实和制作难度。避免标题党，优先能用 1–3 分钟讲清楚的问题。',script:'输出一份可拍摄的 1–3 分钟口播脚本：开场钩子（0–5 秒）、核心讲解、屏幕演示步骤、结尾互动、素材清单、参考来源与待核实项。给每段分配时长，总时长控制在目标范围。口播语速按每分钟约 200–250 个汉字估算，标明演示停顿。',hook:'根据现有内容给出 5 个不夸大、不制造焦虑的 5 秒开场。先提出具体问题或真实反差，再让观众知道看完能学到什么。',simple:'检查现有脚本里的术语，用普通人听得懂的话改写；必要时给生活类比，并说明类比边界。保留原意，不牺牲准确性。',fact:'逐条审查脚本中的可核验主张。输出表格：原文、风险点、应查询的一手资料类型、核验步骤、建议修订。无法验证的明确写“待核实”，不要假装已经检索过。',titles:'为该抖音视频提供 8 个准确具体的标题、3 个封面短句和一段发布描述。避免绝对化、虚假收益承诺及没有证据的能力宣称。',review:'基于下面的实际发布数据给出复盘建议。区分观察与假设，不把相关性当因果。输出有效之处、待验证问题、下一条视频可执行的三个实验。'};
  return base+'\n任务：'+(requests[mode]||requests.script)+info;
}
