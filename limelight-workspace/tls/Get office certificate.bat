@echo off
rem Owner runs this: DNS name + https certificate for the workspace on the office network.
rem Also adds a weekly task that renews the certificate before it runs out.
rem Everything it prints is also kept in tls\last-run.log (no token in it).
cd /d "%~dp0"
echo Working... this takes 1-2 minutes.
node office-cert.mjs > "%~dp0last-run.log" 2>&1
set rc=%errorlevel%
type "%~dp0last-run.log"
if not "%rc%"=="0" goto :end
schtasks /Query /TN "Limelight office certificate" >nul 2>&1 || schtasks /Create /SC WEEKLY /D SUN /ST 10:00 /TN "Limelight office certificate" /TR "\"%~dp0renew-cert.cmd\"" /F >nul && echo   Weekly renewal task added.
:end
pause
