import pathlib
from huggingface_hub import snapshot_download
target=pathlib.Path(__file__).resolve().parent.parent/'data'/'asr-models'/'base'
print('Downloading multilingual Whisper base model to',target,flush=True)
snapshot_download('Systran/faster-whisper-base',local_dir=str(target),allow_patterns=['*.json','*.bin','*.txt'],max_workers=3)
print('Speech recognition model is ready.',flush=True)
