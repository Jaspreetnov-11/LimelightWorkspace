@echo off
rem Joins this PC / laptop to Limelight's private mesh (MeshLink), so the workspace opens from anywhere at
rem http://<JASPREET's mesh address>:3350 without going through Cloudflare.
rem Copy this whole folder (with bin\ and wintun.dll) to the PC, e.g. C:\MeshLink, then right-click > Run as administrator.
rem   Join MeshLink (run as Administrator).bat              join and stay connected while the window is open
rem   Join MeshLink (run as Administrator).bat autostart    also start it with Windows (a scheduled task, as SYSTEM)
rem   Join MeshLink (run as Administrator).bat remove       stop starting it with Windows
rem After joining, the device WAITS until the owner approves it on JASPREET.
setlocal
net session >nul 2>&1 || (echo Right-click this file and choose "Run as administrator". & pause & exit /b 1)
set "BIN=%~dp0bin"
if not exist "%BIN%\meshlink.exe" (echo %BIN%\meshlink.exe is missing. & pause & exit /b 1)
if not exist "%BIN%\wintun.dll" (echo %BIN%\wintun.dll is missing - the owner gets it from https://www.wintun.net ^(amd64 folder^). & pause & exit /b 1)
if /i "%~1"=="remove" (schtasks /Delete /TN "MeshLink" /F & pause & exit /b 0)
if exist "%ProgramData%\MeshLink\state.json" goto known
echo First time on this PC.
set "SERVER=https://mesh.limelightcorp.net:8443"
set /p "KEY=Invite from the owner (mlk-....mll-...): "
"%BIN%\meshlink.exe" up --server "%SERVER%" --authkey "%KEY%" --hostname "%COMPUTERNAME%" & goto end
:known
if /i "%~1"=="autostart" (
  schtasks /Create /TN "MeshLink" /TR "\"%BIN%\meshlink.exe\" up" /SC ONSTART /RU SYSTEM /RL HIGHEST /F
  schtasks /Run /TN "MeshLink"
  echo MeshLink now starts with Windows. Status: http://127.0.0.1:41112
  pause & exit /b 0
)
title MeshLink
"%BIN%\meshlink.exe" up
:end
pause
