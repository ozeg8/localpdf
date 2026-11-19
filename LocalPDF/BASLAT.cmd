@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js bulunamadi. Node.js 22.18 veya daha yeni bir surum kurun.
  echo https://nodejs.org/
  pause
  exit /b 1
)
node scripts\serve-local.mjs
if errorlevel 1 pause
