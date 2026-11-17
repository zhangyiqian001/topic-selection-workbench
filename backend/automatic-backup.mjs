import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { TABLES } from './store.mjs';

const read = file => JSON.parse(gunzipSync(fs.readFileSync(file)));
function write(file, value) {
 const temp = file + '.tmp';
 fs.writeFileSync(temp, gzipSync(JSON.stringify(value), {level: 3}));
 fs.renameSync(temp, file);
}
function dayKey(date) {
 return date.toLocaleDateString('sv-SE', {timeZone:'Asia/Shanghai'});
}
function filesIn(folder) {
 return fs.readdirSync(folder).filter(name => /^\d{4}-\d{2}-\d{2}-(full|delta)\.json\.gz$/.test(name)).sort();
}
function primaryKey(db, table) {
 return db.prepare(`PRAGMA table_info(${table})`).all().filter(col => col.pk).sort((a,b)=>a.pk-b.pk).map(col=>col.name);
}
function rowKey(row, columns) {
 return JSON.stringify(columns.map(key=>row[key]));
}

export function automaticBackup(directory, date = new Date()) {
 const folder = path.join(directory, 'backups', 'automatic');
 fs.mkdirSync(folder, {recursive:true});
 const today = dayKey(date);
 const files = filesIn(folder);
 if (files.some(name => name.startsWith(today))) return;
 const lastFull = files.findLast(name => name.endsWith('-full.json.gz'));
 const manifestPath = path.join(folder,'manifest.json.gz');
 const last = files.at(-1);
 let manifest;
 try { manifest = read(manifestPath); }
 catch (error) {
  if(error.code!=='ENOENT')console.error('自动备份索引无法读取，本次将建立新全量备份：'+error.message);
 }
 const full = !lastFull || manifest?.file !== last || date.getTime()-Date.parse(lastFull.slice(0,10)+'T00:00:00+08:00') >= 7*86400000;
 const name = today + (full?'-full':'-delta') + '.json.gz';
 const db = new DatabaseSync(path.join(directory,'studio.sqlite'),{readOnly:true});
 const tables = {}, hashes = {}, keys = {};
 try {
  db.exec('BEGIN');
  for (const table of TABLES) {
   const pk = keys[table] = primaryKey(db,table);
   const previous = manifest?.hashes[table] || {};
   const current = hashes[table] = Object.create(null);
   const upsert = [];
   for (const row of db.prepare(`SELECT * FROM ${table}`).iterate()) {
    const key = rowKey(row,pk);
    const hash = createHash('sha256').update(JSON.stringify(row)).digest('base64');
    current[key] = hash;
    if (full || previous[key] !== hash) upsert.push(row);
   }
   tables[table] = full ? upsert : {upsert, remove:Object.keys(previous).filter(key=>!Object.hasOwn(current,key))};
  }
 } finally { db.close(); }
 write(path.join(folder,name),{
  format:full?'zhang-studio-sqlite':'zhang-studio-delta',
  schema:1, exported_at:date.toISOString(), previous:full?null:last, keys, tables
 });
 write(manifestPath,{file:name,hashes});
 const bases = filesIn(folder).filter(file=>file.endsWith('-full.json.gz'));
 const oldest = bases.at(-2);
 if(oldest)for(const file of filesIn(folder))if(file<oldest)fs.unlinkSync(path.join(folder,file));
 return name;
}

export function automaticBackupNames(directory) {
 const folder=path.join(directory,'backups','automatic');
 return fs.existsSync(folder)?filesIn(folder).reverse():[];
}

export function readAutomaticBackup(directory, name) {
 const folder=path.join(directory,'backups','automatic');
 const files=filesIn(folder);
 const end=files.indexOf(name);
 const start=files.slice(0,end+1).findLastIndex(file=>file.endsWith('-full.json.gz'));
 if(end<0||start<0)throw new Error('未找到完整的自动备份链');
 const base=read(path.join(folder,files[start]));
 if(start===end)return base;
 const data=Object.fromEntries(TABLES.map(table=>[table,new Map((base.tables[table]||[]).map(row=>[rowKey(row,base.keys[table]),row]))]));
 let exported_at=base.exported_at;
 for(let i=start+1;i<=end;i++){
  const delta=read(path.join(folder,files[i]));
  if(delta.previous!==files[i-1])throw new Error('自动备份链缺少中间文件');
  for(const table of TABLES){
   for(const key of delta.tables[table].remove)data[table].delete(key);
   for(const row of delta.tables[table].upsert)data[table].set(rowKey(row,base.keys[table]),row);
  }
  exported_at=delta.exported_at;
 }
 return {format:base.format,schema:base.schema,exported_at,tables:Object.fromEntries(TABLES.map(table=>[table,[...data[table].values()]]))};
}
