@echo off
rem Owner runs this: points mesh.limelightcorp.net at the office's public address (DNS only) and gets its https
rem certificate. Also adds a weekly task that renews it and follows a changed office address.
rem Everything it prints is also kept in data\cert-last-run.log (no token in it).
cd /d "%~dp0"
if not exist data mkdir data
echo Working... this takes 1-2 minutes.
node mesh-cert.mjs > "%~dp0data\cert-last-run.log" 2>&1
set rc=%errorlevel%
type "%~dp0data\cert-last-run.log"
if not "%rc%"=="0" goto :end
schtasks /Query /TN "MeshLink certificate" >nul 2>&1 || schtasks /Create /SC WEEKLY /D SUN /ST 10:10 /TN "MeshLink certificate" /TR "\"%~dp0renew-mesh-cert.cmd\"" /F >nul && echo   Weekly renewal task added.
:end
pause
