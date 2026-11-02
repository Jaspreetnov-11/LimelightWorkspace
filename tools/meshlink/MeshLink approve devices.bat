@echo off
rem Approve new devices (and renew approvals that end within 7 days). Runs on JASPREET, where the server is.
rem Approve a device only if you know it is yours: it then gets what the access rules allow its tags.
cd /d "%~dp0"
bin\meshlink-server.exe approve -admin http://127.0.0.1:8444 -days 30
pause
