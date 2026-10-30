# Restarts NAYA B's Limelight AI app (its own loop, run-ai.ps1, starts it again in a few seconds) and checks that
# the office key works (Studio's generative fill, no password). What it did is kept in restart-log.txt next to this file.
Start-Transcript -Path (Join-Path $PSScriptRoot 'restart-log.txt') -Force | Out-Null
"started " + (Get-Date)
$remote = "`r`n" + @'
$p = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*LimelightAI\app\server\app.py*' }
"found: " + (($p | ForEach-Object { $_.ProcessId }) -join ', ')
$p | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop; "stopped $($_.ProcessId)" } catch { "could not stop $($_.ProcessId): $($_.Exception.Message)" } }
'@
$remote | ssh -o BatchMode=yes limelight-b "powershell -NoProfile -Command -" 2>&1 | ForEach-Object { "$_" }
"ssh exit code: $LASTEXITCODE"
$k = (Get-Content 'E:\Limelight Ai\limelight-workspace\Data\ai.key' -Raw).Trim()
foreach ($i in 1..30) {
  Start-Sleep 3
  try { Invoke-WebRequest http://192.168.0.205:8800/api/conversations -Headers @{ 'x-lh-key' = $k; 'x-lh-user' = 'studio' } -UseBasicParsing -TimeoutSec 4 | Out-Null; 'OK - Limelight AI works without the password now.'; break }
  catch { if ($i -eq 30) { 'Not answering yet: ' + $_.Exception.Message } }
}
Stop-Transcript | Out-Null
Read-Host 'Press Enter to close'
