import fs from 'node:fs/promises';import vm from 'node:vm';
// Run only the website's response-format decoder; no browser, login/signature code or application startup.
const factories={},cache={};
const sandbox={Uint8Array,ArrayBuffer,TextDecoder,TextEncoder,atob,btoa,Promise,console,window:{crypto:globalThis.crypto,atob,btoa,TextDecoder,TextEncoder,Uint8Array,JSON},self:{__LOADABLE_LOADED_CHUNKS__:{push:chunk=>Object.assign(factories,chunk[1])}}};
vm.createContext(sandbox);vm.runInContext(await fs.readFile(new URL('./index-polyfill.js',import.meta.url),'utf8'),sandbox,{timeout:5000});
function req(id){if(cache[id])return cache[id].exports;if(!factories[id])throw Error('Missing helper '+id);const m=cache[id]={exports:{}};factories[id](m,m.exports,req);return m.exports;}
req.d=(o,defs)=>{for(const k in defs)Object.defineProperty(o,k,{enumerable:true,get:defs[k]});};req.r=o=>Object.defineProperty(o,'__esModule',{value:true});req.n=o=>{const f=()=>o?.__esModule?o.default:o;req.d(f,{a:f});return f;};req.o=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const source=await fs.readFile(new URL('./trendinsight.js',import.meta.url),'utf8');const start=source.indexOf('!function(e,t,n){',source.indexOf('7434:function'));const end=source.indexOf(';n(62862)',start);if(start<0||end<0)throw Error('Response parser changed');
sandbox.a=req(23563);sandbox.c=req(95067);vm.runInContext('var r;'+source.slice(start,end)+';globalThis.decode=r;',sandbox,{timeout:5000});
const input=JSON.parse(await fs.readFile(process.argv[2],'utf8'));const output=await sandbox.decode(input.data,input.encrypted);await fs.writeFile(process.argv[3],JSON.stringify(output));
