@echo off
title Limelight Office - keep this window open
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Install it from https://nodejs.org and try again. & pause & exit /b 1)
node server.mjs --open
if errorlevel 1 pause
