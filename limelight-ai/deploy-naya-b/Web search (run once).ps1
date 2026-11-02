# Puts web search on NAYA B's Limelight AI (D:\LimelightAI\app): agent.py, tools.py, config.py, llm.py, app.js
# and index.html from E:\Limelight Ai\limelight-ai, over SSH. Keeps B's old files as *.bak-<time>, then restarts B's AI
# app (its own loop starts it again in a few seconds). Searches go to Limelight Search on JASPREET (:8890).
# What it did is kept in deploy-log.txt next to this file.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$app = Split-Path -Parent $here
Start-Transcript -Path (Join-Path $here 'deploy-log.txt') -Force | Out-Null
$files = 'server\agent.py', 'server\tools.py', 'server\config.py', 'server\llm.py', 'web\app.js', 'web\index.html'
$remote = "`r`n`$root = 'D:\LimelightAI\app'; `$t = Get-Date -Format 'yyyyMMdd-HHmm'`r`n"
foreach ($f in $files) {
  $b = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $app $f)))
  $remote += "Copy-Item `"`$root\$f`" `"`$root\$f.bak-`$t`"; [IO.File]::WriteAllBytes(`"`$root\$f`", [Convert]::FromBase64String('$b')); 'updated $f'`r`n"
}
$remote += @"
try { 'search relay: ' + (Invoke-RestMethod -TimeoutSec 10 'http://192.168.0.210:8890/healthz').ok } catch { 'search relay NOT reachable: ' + `$_.Exception.Message }
Get-CimInstance Win32_Process | Where-Object { `$_.CommandLine -like '*LimelightAI\app\server\app.py*' } | ForEach-Object { try { Stop-Process -Id `$_.ProcessId -Force -ErrorAction Stop; 'stopped ' + `$_.ProcessId } catch { 'could not stop ' + `$_.ProcessId + ': ' + `$_.Exception.Message } }
'Done on NAYA B (backups: *.bak-' + `$t + ') - the AI app restarts by itself in a few seconds.'
"@
$ErrorActionPreference = 'Continue'  # (ssh's own messages on stderr must not stop the script)
$remote | ssh -o BatchMode=yes limelight-b "powershell -NoProfile -Command -" 2>&1 | ForEach-Object { "$_" }
"ssh exit code: $LASTEXITCODE"
$ok = $false
foreach ($i in 1..30) {
  Start-Sleep 3
  try { Invoke-WebRequest http://192.168.0.205:8800/api/status -UseBasicParsing -TimeoutSec 4 | Out-Null; $ok = $true; break } catch {}
}
if ($ok) { 'OK - Limelight AI is up with web search.' } else { 'NOT working yet - tell Claude (deploy-log.txt has the details).' }
Stop-Transcript | Out-Null
if (-not $env:LL_NO_PAUSE) { Read-Host 'Press Enter to close' }
