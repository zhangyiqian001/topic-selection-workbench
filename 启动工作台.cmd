@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 24 LTS and try again.
  pause
  exit /b 1
)
node -e "require('node:sqlite')" >nul 2>nul
if errorlevel 1 (
  echo This version needs Node.js 24 with built-in SQLite support.
  pause
  exit /b 1
)
if not exist "node_modules\react\package.json" (
  echo Installing application packages...
  call npm ci
  if errorlevel 1 (
    echo Installation failed. Check the network and try again.
    pause
    exit /b 1
  )
)
if not exist "dist\index.html" (
  echo Building application...
  call npm run build
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
node scripts/check-service.mjs
if errorlevel 20 (
  pause
  exit /b 1
)
if errorlevel 10 (
  pause
  exit /b 0
)
echo Zhang AI Topic Studio - SQLite Edition
echo Open http://127.0.0.1:4173 in your browser.
echo Keep this window open. Press Ctrl+C to stop.
node server.mjs
if errorlevel 1 pause
endlocal
