# Limelight Workspace watchdog - runs every minute (Task Scheduler: "Limelight Workspace Watchdog", via watchdog.vbs).
# If an app on this PC has stopped, it runs start-all.ps1, which starts only what is down. If Lighthouse (:3350) is up
# but has stopped answering for 2 checks in a row, it is stopped and started again. If the Cloudflare tunnel is not
# running, "Limelight AI Tunnel.vbs" is started. It writes to watchdog.log only when it does something.
$here = $PSScriptRoot
$log = Join-Path $here 'watchdog.log'
$state = Join-Path $here 'Data\watchdog.state'
function Note($m) { Add-Content -Path $log -Value ("{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $m) }
function Listener($port) { Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 }

# apps that start-all.ps1 looks after (Limelight AI only where it is installed)
$ports = @{ 3350 = 'Lighthouse'; 3300 = 'Office'; 3330 = 'Design' }
if (Test-Path (Join-Path (Split-Path -Parent $here) 'limelight-ai\.venv\Scripts\python.exe')) { $ports[8800] = 'Limelight AI (local)' }

# Lighthouse is listening but hung: 2 failed health checks in a row -> stop it, so start-all brings it back
$lh = Listener 3350
if ($lh) {
  $ok = $false
  try { $ok = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 'http://127.0.0.1:3350/api/health').StatusCode -eq 200 } catch {}
  $fails = if ($ok) { 0 } else { 1 + [int](Get-Content $state -ErrorAction SilentlyContinue) }
  Set-Content -Path $state -Value $fails
  if ($fails -ge 2) {
    Note "Lighthouse not answering for $fails checks - stopping pid $($lh.OwningProcess)"
    Stop-Process -Id $lh.OwningProcess -Force -ErrorAction SilentlyContinue
    Set-Content -Path $state -Value 0
    Start-Sleep 2
  }
}

$down = @($ports.Keys | Where-Object { -not (Listener $_) } | ForEach-Object { $ports[$_] })
if ($down) {
  Note ("down: " + ($down -join ', ') + " - running start-all.ps1")
  & (Join-Path $here 'start-all.ps1')
}

if (-not (Get-Process cloudflared -ErrorAction SilentlyContinue)) {
  $tunnel = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup\Limelight AI Tunnel.vbs'
  if (Test-Path $tunnel) { Note 'tunnel not running - starting it'; Start-Process wscript.exe -ArgumentList "`"$tunnel`"" }
}
