# Lets Studio (generative fill) and Lighthouse use NAYA B's Limelight AI with the office key instead of the password.
# Puts app-office-key.py (B's own app.py + the office-key check) and the key on NAYA B over SSH, keeps a backup
# (app.py.bak-<time>) and restarts B's AI app (its own loop starts it again in a few seconds).
# Undo: on NAYA B copy the .bak file back over D:\LimelightAI\app\server\app.py.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Start-Transcript -Path (Join-Path $here 'deploy-log.txt') -Force | Out-Null
$a = [Convert]::ToBase64String([IO.File]::ReadAllBytes("$here\app-office-key.py"))
$k = (Get-Content 'E:\Limelight Ai\limelight-workspace\Data\ai.key' -Raw).Trim()
$remote = "`r`n" + @"
`$s = 'D:\LimelightAI\app\server'; `$t = Get-Date -Format 'yyyyMMdd-HHmm'
Copy-Item "`$s\app.py" "`$s\app.py.bak-`$t"
[IO.File]::WriteAllBytes("`$s\app.py", [Convert]::FromBase64String('$a'))
[IO.File]::WriteAllText('D:\LimelightAI\app\data\workspace.key', '$k')
Get-CimInstance Win32_Process | Where-Object { `$_.CommandLine -like '*LimelightAI\app\server\app.py*' } | ForEach-Object { try { Stop-Process -Id `$_.ProcessId -Force -ErrorAction Stop; 'stopped ' + `$_.ProcessId } catch { 'could not stop ' + `$_.ProcessId + ': ' + `$_.Exception.Message } }
'Done on NAYA B (backup: app.py.bak-' + `$t + ') - the AI app restarts by itself in a few seconds.'
"@
$ErrorActionPreference = 'Continue'  # (ssh's own messages on stderr must not stop the script)
$remote | ssh -o BatchMode=yes limelight-b "powershell -NoProfile -Command -" 2>&1 | ForEach-Object { "$_" }
"ssh exit code: $LASTEXITCODE"
$ok = $false
foreach ($i in 1..30) {
  Start-Sleep 3
  try { Invoke-WebRequest http://192.168.0.205:8800/api/conversations -Headers @{ 'x-lh-key' = $k; 'x-lh-user' = 'check' } -UseBasicParsing -TimeoutSec 4 | Out-Null; $ok = $true; break } catch {}
}
if ($ok) { 'OK - Limelight AI opens without the password now.' } else { 'NOT working yet - send Claude this window (or deploy-log.txt).' }
Stop-Transcript | Out-Null
Read-Host 'Press Enter to close'
