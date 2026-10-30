"""Public captions first, then local audio recognition. JSON-lines worker protocol."""
import sys,json,pathlib,re,html,os,subprocess
def emit(**data): print(json.dumps(data,ensure_ascii=False),flush=True)
def caption_text(text):
    try:
        d=json.loads(text)
        rows=d.get('body') or d.get('events') or []
        lines=[r.get('content') or ''.join(s.get('utf8','') for s in r.get('segs',[])) for r in rows]
    except (ValueError,AttributeError):
        if '-->' not in text:return ''
        lines=[]
        for line in text.splitlines():
            line=line.strip()
            if not line or '-->' in line or line.isdigit() or line.startswith(('WEBVTT','NOTE','Kind:','Language:','STYLE')):continue
            line=html.unescape(re.sub(r'<[^>]+>','',line)).strip()
            if line and (not lines or line!=lines[-1]):lines.append(line)
    return '\n'.join(x for x in lines if x).strip()
def main():
    job=json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
    folder=pathlib.Path(job['directory']);media=job.get('file');source=job.get('url')
    if not media and 'douyin.com/video/' in (source or ''):
        emit(stage='reading',message='正在用全新未登录浏览器读取抖音公开播放信息与媒体')
        helper=pathlib.Path(__file__).resolve().parent/'resolve-douyin-media.mjs'
        run=subprocess.run([job['node'],str(helper),sys.argv[1]],capture_output=True,text=True,encoding='utf-8',timeout=330)
        result=None
        for line in run.stdout.splitlines():
            try: result=json.loads(line)
            except ValueError:pass
        if not result or not result.get('file'):raise RuntimeError((result or {}).get('error','抖音公开媒体读取未完成，请上传本地视频'))
        media=result['file']
    if not media:
        import yt_dlp
        emit(stage='reading',message='正在读取公开视频与字幕')
        class Quiet:
            def debug(self,*a):pass
            def warning(self,*a):pass
            def error(self,*a):pass
        options={'quiet':True,'no_warnings':True,'logger':Quiet(),'noplaylist':True,'socket_timeout':15,'retries':1,'extractor_retries':1,'max_filesize':100*1024*1024,'outtmpl':str(folder/'source.%(ext)s')}
        try:
            with yt_dlp.YoutubeDL(options) as y:
                info=y.extract_info(source,download=False)
                if not info or info.get('_type')=='playlist':raise RuntimeError('不是单个视频')
                if (info.get('duration') or 0)>1200:raise RuntimeError('视频超过20分钟，请上传截取后的文件')
                subtitles=info.get('subtitles') or info.get('automatic_captions') or {}
                for language in sorted(subtitles,key=lambda x:(not x.lower().startswith('zh'),not x.lower().startswith('en'),x)):
                    entries=sorted(subtitles[language],key=lambda x:x.get('ext') not in ('json','json3','vtt','srt'))
                    for entry in entries[:2]:
                        try:
                            response=y.urlopen(entry['url']);text=response.read(2*1024*1024+1)
                            if len(text)>2*1024*1024:continue
                            content=caption_text(text.decode('utf-8-sig'))
                            if content:
                                emit(result={'text':content[:200000],'method':'public_subtitles','language':language,'segments':[]});return
                        except Exception:continue
            emit(stage='downloading',message='没有可用公开字幕，正在读取视频音频')
            options.update({'format':'bestaudio[ext=m4a]/bestaudio/best','match_filter':lambda info,**kw:'视频超过20分钟' if (info.get('duration') or 0)>1200 else None})
            with yt_dlp.YoutubeDL(options) as y:
                info=y.extract_info(source,download=True)
                media=y.prepare_filename(info)
            if not pathlib.Path(media).is_file():raise RuntimeError('未取得音频文件')
        except Exception:
            raise RuntimeError('平台未提供可直接读取的字幕或音频，可能需要登录或链接已失效；请上传你保存的视频/音频文件进行本机转写。')
    import av
    with av.open(media) as container:
        duration=(container.duration or 0)/av.time_base
        if duration>1200:raise RuntimeError('文件超过20分钟，请截取后上传')
        if not any(s.type=='audio' for s in container.streams):raise RuntimeError('文件没有音轨，无法提取口播文案')
    emit(stage='transcribing',message='正在本机识别语音，首次加载模型可能稍慢')
    if not (pathlib.Path(job['model'])/'model.bin').is_file():raise RuntimeError('本机识别模型尚未下载完成，请先安装语音模型')
    from faster_whisper import WhisperModel
    model=WhisperModel(job['model'],device='cpu',compute_type='int8',local_files_only=True)
    segments,info=model.transcribe(media,beam_size=3,vad_filter=True,condition_on_previous_text=False)
    rows=[]
    for s in segments:
        if s.text.strip():rows.append({'start':round(s.start,2),'end':round(s.end,2),'text':s.text.strip()})
        emit(stage='transcribing',message='正在本机识别语音',seconds=round(s.end,1),duration=duration)
        if len(rows)>5000:raise RuntimeError('视频内容过长，请分段提取')
    text='\n'.join(s['text'] for s in rows)
    if not text:raise RuntimeError('未识别到清晰语音，视频可能无口播或背景音乐过强')
    emit(result={'text':text[:200000],'method':'local_whisper','language':info.language,'segments':rows})
if __name__=='__main__':
    try:main()
    except Exception as e:
        emit(error=str(e)[:500]);sys.exit(1)
