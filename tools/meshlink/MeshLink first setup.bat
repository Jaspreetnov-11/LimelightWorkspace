@echo off
rem MeshLink on JASPREET - first setup (the owner runs this once, in this window, typing the secrets himself).
rem   1. Dashboard sign-in: a password (12+ characters) + an authenticator app (6-digit codes)
rem   2. The owner key: signs every device and the access rules. Saved in %USERPROFILE%\.meshlink\owner.key,
rem      sealed with its own passphrase. Copy that file to a USB stick and keep the passphrase safe.
rem Nothing here is sent anywhere. Safe to run again: it never overwrites an existing owner key.
setlocal
cd /d "%~dp0"
if not exist "bin\meshlink-server.exe" (echo bin\meshlink-server.exe is missing. & pause & exit /b 1)
if not exist data mkdir data
if exist "data\admin.json" (
  echo Dashboard sign-in already set. To replace it, delete data\admin.json first.
) else (
  echo === 1. Dashboard password and authenticator app ===
  bin\meshlink-server.exe setup-admin -data data || (pause & exit /b 1)
)
echo.
if exist "data\lock.pub" (
  echo Owner lock already set:
  type data\lock.pub
) else (
  echo === 2. Owner key ^(use a different passphrase from the dashboard password^) ===
  bin\meshlink-server.exe init-lock -data data || (pause & exit /b 1)
)
echo.
echo Next: "Get MeshLink certificate.bat", then "MeshLink Server.bat".
pause
