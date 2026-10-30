@echo off
title Limelight Studio - keep this window open
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Install it from https://nodejs.org and try again. & pause & exit /b 1)
rem Already running? Just open it in the browser.
powershell -NoProfile -Command "try { Invoke-RestMethod http://127.0.0.1:3330/api/health -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 (start "" http://localhost:3330 & exit /b 0)
node server.mjs --open %*
if errorlevel 1 pause
