@echo off
rem Sign policy.json (who may reach what) with the owner key and send it. Everything not listed stays blocked.
cd /d "%~dp0"
bin\meshlink-server.exe policy -admin http://127.0.0.1:8444 -file policy.json
pause
