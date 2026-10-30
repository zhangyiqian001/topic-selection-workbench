@echo off
setlocal
cd /d "%~dp0"
if not exist "work\asr-env\Scripts\python.exe" python -m venv "work\asr-env"
if errorlevel 1 goto failed
"work\asr-env\Scripts\python.exe" -m pip install -r "scripts\asr-requirements.txt"
if errorlevel 1 goto failed
set "HF_HUB_DISABLE_XET=1"
"work\asr-env\Scripts\python.exe" "scripts\download-asr-model.py"
if errorlevel 1 goto failed
echo Video transcription is ready. Restart the workbench if needed.
pause
exit /b 0
:failed
echo Setup failed. Check Python and network connectivity, then retry.
pause
exit /b 1
