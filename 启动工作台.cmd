@echo off
setlocal
set "STUDIO_LAN=1"
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
echo Local and LAN URLs are printed below.
echo Use a LAN URL from another device on the same network.
echo If Windows Firewall asks, allow Node.js on Private networks.
echo Keep this window open. Press Ctrl+C to stop.
node server.mjs
if errorlevel 1 pause
endlocal
