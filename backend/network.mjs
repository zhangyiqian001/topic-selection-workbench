import os from 'node:os';
import net from 'node:net';
export function privateIPv4(address){if(net.isIP(address)!==4)return false;const [a,b]=address.split('.').map(Number);return a===10||a===192&&b===168||a===172&&b>=16&&b<=31||a===169&&b===254;}
export function networkPolicy({lan=false,port=4173,interfaces=os.networkInterfaces()}={}){
 const ips=[...new Set(Object.values(interfaces).flat().filter(Boolean).filter(i=>(i.family==='IPv4'||i.family===4)&&!i.internal&&privateIPv4(i.address)).map(i=>i.address))];
 ips.sort((a,b)=>(a.startsWith('192.168.')?0:a.startsWith('10.')?1:2)-(b.startsWith('192.168.')?0:b.startsWith('10.')?1:2));
 const hostnames=new Set(['127.0.0.1','localhost','[::1]',...(lan?ips:[])]),localURL='http://127.0.0.1:'+port;
 return {lan_enabled:lan,listen_host:lan?'0.0.0.0':'127.0.0.1',local_url:localURL,lan_urls:lan?ips.map(ip=>'http://'+ip+':'+port):[],check(headers,remoteAddress){
  const remote=String(remoteAddress||'').replace(/^::ffff:/,'');const loopback=remote==='::1'||net.isIP(remote)===4&&remote.startsWith('127.');
  if(!loopback&&(!lan||!privateIPv4(remote)))return '仅允许本机或局域网设备访问';
  let address;try{address=new URL('http://'+headers.host);if(address.username||address.password||address.pathname!=='/'||address.search||address.hash||!hostnames.has(address.hostname)||Number(address.port||80)!==port)return '访问地址不在本机或已启用的局域网地址范围内';}catch{return '访问地址无效';}
  if(headers.origin&&headers.origin!==address.origin)return '不允许跨来源操作';return '';
 }};
}
export function printNetwork(network){console.log('Local: '+network.local_url);for(const url of network.lan_urls)console.log('LAN:   '+url);if(network.lan_enabled&&!network.lan_urls.length)console.log('LAN mode is enabled. No private IPv4 address was found. Check your network connection.');}
