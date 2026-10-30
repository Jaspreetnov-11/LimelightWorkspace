# Puts the per-person chats change on NAYA B's Limelight AI (D:\LimelightAI\app): app.py + db.py from this folder,
# and the workspace key, over SSH (JASPREET's key). Keeps a backup of B's files and database (*.bak-<time>), then
# restarts B's AI app (its own loop starts it again in a few seconds). The office key also replaces the password.
# What it did is kept in deploy-log.txt next to this file.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Start-Transcript -Path (Join-Path $here 'deploy-log.txt') -Force | Out-Null
$a = [Convert]::ToBase64String([IO.File]::ReadAllBytes("$here\app.py"))
$d = [Convert]::ToBase64String([IO.File]::ReadAllBytes("$here\db.py"))
$k = (Get-Content 'E:\Limelight Ai\limelight-workspace\Data\ai.key' -Raw).Trim()
$remote = "`r`n" + @"
`$s = 'D:\LimelightAI\app\server'; `$t = Get-Date -Format 'yyyyMMdd-HHmm'
Copy-Item "`$s\app.py" "`$s\app.py.bak-`$t"; Copy-Item "`$s\db.py" "`$s\db.py.bak-`$t"
Copy-Item 'D:\LimelightAI\app\data\limelight.db' "D:\LimelightAI\app\data\limelight.db.bak-`$t"
[IO.File]::WriteAllBytes("`$s\app.py", [Convert]::FromBase64String('$a'))
[IO.File]::WriteAllBytes("`$s\db.py", [Convert]::FromBase64String('$d'))
[IO.File]::WriteAllText('D:\LimelightAI\app\data\workspace.key', '$k')
Get-CimInstance Win32_Process | Where-Object { `$_.CommandLine -like '*LimelightAI\app\server\app.py*' } | ForEach-Object { try { Stop-Process -Id `$_.ProcessId -Force -ErrorAction Stop; 'stopped ' + `$_.ProcessId } catch { 'could not stop ' + `$_.ProcessId + ': ' + `$_.Exception.Message } }
'Done on NAYA B (backups: *.bak-' + `$t + ') - the AI app restarts by itself in a few seconds.'
"@
$ErrorActionPreference = 'Continue'  # (ssh's own messages on stderr must not stop the script)
$remote | ssh -o BatchMode=yes limelight-b "powershell -NoProfile -Command -" 2>&1 | ForEach-Object { "$_" }
"ssh exit code: $LASTEXITCODE"
$ok = $false
foreach ($i in 1..30) {
  Start-Sleep 3
  try { Invoke-WebRequest http://192.168.0.205:8800/api/conversations -Headers @{ 'x-lh-key' = $k; 'x-lh-user' = 'check' } -UseBasicParsing -TimeoutSec 4 | Out-Null; $ok = $true; break } catch {}
}
if ($ok) { 'OK - Limelight AI is up: no password, each person sees only their own chats.' } else { 'NOT working yet - tell Claude (deploy-log.txt has the details).' }
Stop-Transcript | Out-Null
Read-Host 'Press Enter to close'
