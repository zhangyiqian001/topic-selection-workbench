import {ScoreBatch} from './score-batch.mjs';
import {Transcriber} from './transcription.mjs';
import {monitorState,monitorAction} from './model-monitor.mjs';
import {networkPolicy,printNetwork} from './network.mjs';
import {RSSHUB_PRESETS} from './rsshub.mjs';
import {SCREEN_DIMENSIONS} from './assessment.mjs';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store} from './store.mjs';
import {Collector} from './collector.mjs';
import {analyze,testModel,generateCreation,prepareCreation,scoreMaterial} from './model.mjs';
import {PLATFORM_PRESETS,parsePlatformImport} from './platforms.mjs';
import {RUNTIME} from './runtime.mjs';
import {TOPIC_STATUSES,RAW_STATUSES,DIMENSIONS} from './constants.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),port=Number(process.env.PORT||4173),dataDir=process.env.STUDIO_DATA_DIR||path.join(root,'data');
const network=networkPolicy({lan:process.env.STUDIO_LAN==='1',port});
const store=new Store(dataDir),collector=new Collector(store),transcriber=new Transcriber(store),scoreBatch=new ScoreBatch(store);let restoring=false;
function send(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
async function body(req){let bytes=0,parts=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>30*1024*1024)throw new Error('请求超过 30MB 限制');parts.push(chunk);}try{return JSON.parse(Buffer.concat(parts).toString('utf8')||'{}');}catch{throw new Error('请求内容必须为有效 JSON');}}
const server=http.createServer(async(req,res)=>{try{
 const networkError=network.check(req.headers,req.socket.remoteAddress);if(networkError){send(res,{error:networkError},403);return;}
 const url=new URL(req.url,'http://127.0.0.1'),p=url.pathname;
 if(p.startsWith('/api/')){
  if(restoring){send(res,{error:'正在恢复备份，请稍后'},409);return;}
  const transcription=p.match(/^\/api\/raw\/([^/]+)\/transcript(?:\/(upload|cancel))?$/);
  if(transcription){const [,id,action]=transcription;if(req.method==='GET'&&!action)send(res,transcriber.state(id));else if(req.method==='POST'&&action==='upload')send(res,await transcriber.start(id,req));else if(req.method==='POST'&&action==='cancel'){req.resume();send(res,transcriber.cancel(id));}else if(req.method==='POST'&&!action){req.resume();send(res,await transcriber.start(id));}else send(res,{error:'不支持的方法'},405);return;}
  const data=req.method==='GET'?{}:await body(req);
  if(p==='/api/state'&&req.method==='GET'){send(res,{...store.bundle(),runtime:{...RUNTIME,network:{lan_enabled:network.lan_enabled,listen_host:network.listen_host,local_url:network.local_url,lan_urls:network.lan_urls}},constants:{topic_statuses:TOPIC_STATUSES,raw_statuses:RAW_STATUSES,dimensions:DIMENSIONS,screening_dimensions:SCREEN_DIMENSIONS,rsshub_presets:RSSHUB_PRESETS,platform_presets:PLATFORM_PRESETS}});return;}
  if(p==='/api/raw'&&req.method==='POST'){send(res,store.addRaw(data));return;}
  const raw=p.match(/^\/api\/raw\/([^/]+)$/);
  if(raw){if(req.method==='GET')send(res,store.rawDetail(raw[1]));else if(req.method==='PUT'){store.updateRaw(raw[1],data);send(res,{ok:true});}else if(req.method==='DELETE'){transcriber.cancel(raw[1]);store.run('DELETE FROM raw_items WHERE id=?',raw[1]);send(res,{ok:true});}else send(res,{error:'不支持的方法'},405);return;}
  if(p==='/api/raw-link'&&req.method==='POST'){store.linkRaw(data.left_id,data.right_id,data.reason);send(res,{ok:true});return;}
  if(p==='/api/topics'&&req.method==='POST'){send(res,{id:store.saveTopic(data)});return;}
  const topic=p.match(/^\/api\/topics\/([^/]+)$/);
  if(topic){if(req.method==='GET')send(res,store.topicDetail(topic[1]));else if(req.method==='PUT')send(res,{id:store.saveTopic(data,topic[1])});else if(req.method==='DELETE')send(res,store.removeTopic(topic[1]));else send(res,{error:'不支持的方法'},405);return;}
  const status=p.match(/^\/api\/topics\/([^/]+)\/status$/);if(status&&req.method==='POST'){store.changeStatus(status[1],data.status,data.reason);send(res,{ok:true});return;}
  const score=p.match(/^\/api\/topics\/([^/]+)\/scores$/);if(score&&req.method==='POST'){store.saveScores(score[1],data.scores);send(res,{ok:true});return;}
  const unlink=p.match(/^\/api\/topics\/([^/]+)\/evidence\/([^/]+)$/);if(unlink&&req.method==='DELETE'){store.run('DELETE FROM topic_evidence WHERE topic_id=? AND raw_id=?',unlink[1],unlink[2]);send(res,{ok:true});return;}
  if(p==='/api/sources'&&req.method==='POST'){if(store.sourceList().length>=30)throw new Error('第一版最多配置 30 个来源');send(res,store.saveSource(data));return;}
  const source=p.match(/^\/api\/sources\/([^/]+)$/);if(source&&req.method==='PUT'){send(res,store.saveSource(data,source[1]));return;}
  if(p==='/api/platform/legacy-preview'&&req.method==='GET'){const file='E:/codex/张的选题/抖音榜单/创作指南一日榜最新.json';const stat=await fs.stat(file);if(stat.size>20*1024*1024)throw new Error('原一日榜文件超过20MB');const payload=JSON.parse(await fs.readFile(file,'utf8'));const parsed=parsePlatformImport(payload,'douyin_daily');send(res,{payload,platform:'douyin_daily',count:parsed.records.length,boards:parsed.boards,stats_date:parsed.stats_date,collected:parsed.collected,preview:parsed.records.slice(0,5)});return;}
  if(p==='/api/platform/import-preview'&&req.method==='POST'){const parsed=parsePlatformImport(data.payload,data.platform);send(res,{count:parsed.records.length,boards:parsed.boards,stats_date:parsed.stats_date,collected:parsed.collected,warnings:parsed.warnings,preview:parsed.records.slice(0,5)});return;}
  if(p==='/api/platform/import'&&req.method==='POST'){const parsed=parsePlatformImport(data.payload,data.platform);let source=store.one('SELECT * FROM sources WHERE type=?',data.platform);if(!source)source=store.saveSource(PLATFORM_PRESETS.find(x=>x.type===data.platform));const result=store.transaction(()=>{let added=0,duplicates=0;for(const record of parsed.records){const row=store.addRaw(record,{sourceId:source.id,metrics:record.metrics});row.duplicate?duplicates++:added++;}const id=crypto.randomUUID(),stamp=new Date().toISOString();store.run('INSERT INTO collection_runs(id,source_id,source_name,started_at,finished_at,status,fetched_count,new_count,duplicate_count,trigger,error) VALUES (?,?,?,?,?,?,?,?,?,?,?)',id,source.id,source.name,stamp,stamp,'success',parsed.records.length,added,duplicates,'import',parsed.warnings.join('；'));return {added,duplicates,total:parsed.records.length};});send(res,result);return;}
  if(p==='/api/collect'&&req.method==='POST'){send(res,{runs:await collector.scoped({source_id:data.source_id,platform:data.platform})});return;}
  if(p==='/api/settings'&&req.method==='PUT'){send(res,store.updateSettings(data));return;}
  if(p==='/api/model-monitor/state'&&req.method==='GET'){send(res,await monitorState());return;}
  if(['/api/model-monitor/models','/api/model-monitor/test'].includes(p)&&req.method==='POST'){send(res,await monitorAction(p.endsWith('/models')?'models':'test',data.platform,data.model));return;}
  if(p==='/api/model/score-batch'&&req.method==='GET'){send(res,scoreBatch.state());return;}
  if(p==='/api/model/score-batch'&&req.method==='POST'){send(res,scoreBatch.start());return;}
  if(p==='/api/model/score-batch/stop'&&req.method==='POST'){send(res,scoreBatch.stop());return;}
  if(p==='/api/model/score'&&req.method==='POST'){send(res,await scoreMaterial(store,data.id));return;}
  if(p==='/api/model/prompt'&&req.method==='POST'){send(res,prepareCreation(store,data.id,data.draft));return;}
  if(p==='/api/model/create'&&req.method==='POST'){if(data.confirmed!==true||!data.prompt)throw new Error('请先预览、确认提示词后再生成');send(res,await generateCreation(store,data.id,data.draft,data.prompt));return;}
  if(p==='/api/model/test'&&req.method==='POST'){send(res,await testModel({...store.settings(),...data}));return;}
  if(p==='/api/model/analyze'&&req.method==='POST'){if(!['raw','topic'].includes(data.kind))throw new Error('分析类型无效');send(res,await analyze(store,data.kind,data.id));return;}
  if(p==='/api/backup'&&req.method==='GET'){send(res,store.export());return;}
  if(p==='/api/backup/create'&&req.method==='POST'){send(res,{filename:store.backup('manual')});return;}
  if(p==='/api/restore/validate'&&req.method==='POST'){store.validateBackup(data);send(res,{raw:data.tables.raw_items.length,topics:data.tables.topics.length,sources:data.tables.sources.length});return;}
  if(p==='/api/restore'&&req.method==='POST'){if(collector.running.size||transcriber.jobs.size||scoreBatch.running)throw new Error('采集进行中，请完成后再恢复');restoring=true;try{const restored=store.restore(data);scoreBatch.reload();send(res,restored);}finally{restoring=false;}return;}
  if(p==='/api/migrate'&&req.method==='POST'){send(res,store.migrateLegacy(data));return;}
  if(p==='/api/legacy'&&req.method==='GET'){send(res,store.q('SELECT * FROM legacy_data'));return;}
  if(p==='/api/search'&&req.method==='GET'){const q=(url.searchParams.get('q')||'').trim().toLowerCase();const raw=q?store.rawList().filter(r=>[r.title,r.summary,r.source_name,r.tags.join(' '),r.notes,r.url].join(' ').toLowerCase().includes(q)):[],topics=q?store.topicList().filter(t=>[t.title,t.question,t.angle,t.tags.join(' '),t.notes].join(' ').toLowerCase().includes(q)||store.topicDetail(t.id).evidence.some(r=>[r.title,r.source_name,r.url,r.summary].join(' ').toLowerCase().includes(q))):[];send(res,{raw,topics});return;}
  send(res,{error:'接口不存在，请重启本机服务后重试'},404);return;
 }
 const pathname=decodeURIComponent(p),name=pathname.startsWith('/assets/')?pathname.slice(1):'index.html';
 if(name!=='index.html'&&!/^assets\/[a-zA-Z0-9_.-]+$/.test(name)){res.writeHead(404);res.end();return;}
 const file=path.join(root,'dist',name);try{const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':{'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(content);}catch{res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8'});res.end('Please run npm run build, then restart the studio.');}
 }catch(error){if(!res.headersSent)send(res,{error:error.message},400);else res.end();}});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port is in use. Close the previous studio window first.':error.message);process.exitCode=1;});
server.listen(port,network.listen_host,()=>{printNetwork(network);if(process.env.STUDIO_NO_SCHEDULE!=='1')collector.start();if(store.settings().auto_backup){const last=store.one("SELECT value FROM settings WHERE key='last_auto_backup'");if(!last||JSON.parse(last.value)!==new Date().toISOString().slice(0,10)){store.backup();store.run('INSERT OR REPLACE INTO settings VALUES (?,?)','last_auto_backup',JSON.stringify(new Date().toISOString().slice(0,10)));}}});
function shutdown(){collector.stop();server.close(()=>{store.close();process.exit(0);});setTimeout(()=>process.exit(0),3000).unref();}process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
