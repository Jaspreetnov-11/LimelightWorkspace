@echo off
rem MeshLink server on JASPREET.
rem   Devices (from anywhere): https://mesh.limelightcorp.net:8443   - the router forwards TCP 8443 and UDP 3478 here
rem   Dashboard (this PC only): http://127.0.0.1:8444                - password + authenticator code
rem It refuses to start without the https certificate ("Get MeshLink certificate.bat") and the first setup.
rem Log: data\server.log
setlocal
cd /d "%~dp0"
if not exist "data\admin.json" (echo Run "MeshLink first setup.bat" first. & pause & exit /b 1)
if not exist "data\tls\fullchain.pem" (echo Run "Get MeshLink certificate.bat" first. & pause & exit /b 1)
title MeshLink server
echo MeshLink server - dashboard http://127.0.0.1:8444 - close this window to stop it.
bin\meshlink-server.exe run -data data -listen :8443 -admin-listen 127.0.0.1:8444 -stun-port 3478 -tls-cert data\tls\fullchain.pem -tls-key data\tls\privkey.pem >> data\server.log 2>&1
echo The server stopped - see data\server.log
pause
