import fs from 'node:fs';import path from 'node:path';import {once} from 'node:events';import {chromium} from 'playwright-core';
const job=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),url=new URL(job.url);
if(url.protocol!=='https:'||!['www.douyin.com','douyin.com'].includes(url.hostname)||!/^\/video\/\d+\/?$/.test(url.pathname))throw new Error('不是有效抖音视频链接');
const id=url.pathname.split('/')[2],limit=100*1024*1024,target=path.join(job.directory,'source.media');
const chrome=process.env.STUDIO_CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined);
const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{})});
try{
 const context=await browser.newContext(),page=await context.newPage();let detail;
 page.on('response',async response=>{if(detail||!response.url().includes('/aweme/'))return;try{const doc=await response.json();if(doc.aweme_detail?.aweme_id===id)detail=doc.aweme_detail;}catch{}});
 await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:25000});
 for(let i=0;i<60&&!detail;i++)await page.waitForTimeout(250);
 if(!detail){const text=await page.locator('body').innerText().catch(()=>'');throw new Error(/验证码|安全验证|拖动滑块/.test(text)?'平台要求人工验证，请上传本地视频':'未取得公开播放信息，视频可能需要登录或已不可用');}
 const video=detail.video,duration=Number(video?.duration||0)/1000;if(duration>1200)throw new Error('视频超过20分钟，请截取后上传');
 const audio=(Array.isArray(video?.bit_rate_audio)?video.bit_rate_audio:[]).map(a=>a.audio_meta||a.play_addr||a).find(a=>a.url_list?.length);
 const media=[audio,video?.play_addr_h264,video?.play_addr].find(a=>a?.url_list?.length);
 if(!media?.url_list?.length)throw new Error('公开视频未提供可读取的媒体地址');if(Number(media.data_size)>limit)throw new Error('视频超过100MB，请截取后上传');
 const allowed=u=>u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['douyinvod.com','douyin.com','douyincdn.com','bytecdn.cn','bytecdn.com','zjcdn.com','amemv.com'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d));
 const agent=await page.evaluate(()=>navigator.userAgent);let saved=false;
 for(const source of media.url_list.slice(0,3)){
  let stream;try{let current=new URL(source),response;for(let redirects=0;redirects<5;redirects++){if(!allowed(current))throw new Error('媒体地址不在支持的公开域名范围');response=await fetch(current,{headers:{'User-Agent':agent,Referer:'https://www.douyin.com/'},redirect:'manual',signal:AbortSignal.timeout(90000)});if([301,302,303,307,308].includes(response.status)){const next=response.headers.get('location');await response.body?.cancel();current=new URL(next,current);continue;}break;}
   if(!response?.ok)throw new Error('媒体读取失败');if(Number(response.headers.get('content-length'))>limit){await response.body?.cancel();throw new Error('视频超过100MB');}
   stream=fs.createWriteStream(target);let bytes=0;for await(const chunk of response.body){bytes+=chunk.length;if(bytes>limit)throw new Error('视频超过100MB');if(!stream.write(chunk))await once(stream,'drain');}stream.end();await once(stream,'finish');if(!bytes)throw new Error('媒体为空');saved=true;console.log(JSON.stringify({file:target,duration,bytes,source:audio?'douyin_public_audio':'douyin_public_video'}));break;
  }catch{stream?.destroy();try{fs.unlinkSync(target);}catch{}}
 }
 if(!saved)throw new Error('取得播放地址，但媒体读取失败或文件超出限制，请上传本地文件');
}catch(error){console.log(JSON.stringify({error:error.message}));process.exitCode=1;}finally{await browser.close();}
