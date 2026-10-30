@echo off
rem Puts Lighthouse on the internet at https://limelightcorp.net (and www.) through the Cloudflare tunnel on this PC
rem (the same tunnel that already serves ai.limelightcorp.net and editor.limelightcorp.net).
rem   1. adds the Lighthouse hostnames that are missing to C:\Users\%USERNAME%\.cloudflared\config.yml (backup kept next to it)
rem   2. creates their DNS records in Cloudflare (limelightcorp.net)
rem   3. restarts the tunnel (ai / editor links pause for a few seconds)
rem Safe to run again: hostnames already there are left as they are.
rem Everything stays behind the Lighthouse login. Office opens from outside for admins only.
title Publish Lighthouse online
set CF="E:\Limelight Ai\tools\cloudflared.exe"
set CFG=%USERPROFILE%\.cloudflared\config.yml

copy /y "%CFG%" "%CFG%.bak-%RANDOM%" >nul
powershell -NoProfile -Command "$p=$env:CFG; $s=Get-Content $p -Raw; $want=[ordered]@{'limelightcorp.net'=3350;'www.limelightcorp.net'=3350;'lh-edit.limelightcorp.net'=3341;'lh-office.limelightcorp.net'=3342;'lh-team.limelightcorp.net'=3343;'lh-ai.limelightcorp.net'=3344;'lh-design.limelightcorp.net'=3345}; $add=''; foreach($h in $want.Keys){ if($s -notmatch ('hostname: ' + [regex]::Escape($h) + '\s')){ $add += \"  - hostname: $h`n    service: http://127.0.0.1:$($want[$h])`n\" } }; if($add){ $s=$s.Replace('  - service: http_status:404', $add + '  - service: http_status:404'); [IO.File]::WriteAllText($p, $s); 'Added:'; $add } else { 'Tunnel config already complete.' }"
%CF% tunnel ingress validate || (echo Config problem - restore the .bak file next to %CFG% & pause & exit /b 1)

rem limelightcorp.net and www had an old record that only gave error 525 (checked 29 Oct 2026): replace them
%CF% tunnel route dns --overwrite-dns limelight-ai limelightcorp.net
%CF% tunnel route dns --overwrite-dns limelight-ai www.limelightcorp.net
for %%h in (lh-edit lh-office lh-team lh-ai lh-design) do %CF% tunnel route dns limelight-ai %%h.limelightcorp.net

echo Restarting the tunnel...
taskkill /im cloudflared.exe /f >nul 2>nul
wscript "E:\Limelight Ai\tools\Limelight AI Tunnel.vbs"

rem the Lighthouse server must keep running on this PC
powershell -NoProfile -Command "try { Invoke-RestMethod http://127.0.0.1:3350/api/health -TimeoutSec 2 | Out-Null } catch { exit 1 }" || wscript "E:\Limelight Ai\limelight-workspace\Lighthouse Server (no window).vbs"

echo.
echo Done. Open https://limelightcorp.net (DNS can take a minute).
pause
