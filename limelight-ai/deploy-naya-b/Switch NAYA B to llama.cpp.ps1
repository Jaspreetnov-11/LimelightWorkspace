# Switches NAYA B's Limelight AI from Ollama to the Limelight AI engine (llama.cpp), like JASPREET on 31 Oct.
# The owner runs it on JASPREET (double-click "Switch NAYA B to llama.cpp.bat"). Safe to run again; models already on
# B are not sent again. Log: switch-log.txt here.
#   1. JASPREET -> B over SSH (scp): the engine, the downloaded models (gpt-oss-20b, gemma3-12b), the app's code.
#      (Not through the NAS: an SSH session on B has no rights on the NAS share - the 31 Oct first try failed there.)
#   2. on B (SSH): put them in place, hard-link B's own Ollama models (no extra space), back up and update the app,
#      start the engine with its standby-editor guard (task "Limelight AI Engine"), restart the app
# Ollama stays installed on B for now (idle, nothing uses it); removing it is a separate step after a few good days.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$ai = Split-Path -Parent $here
$root = Split-Path -Parent $ai
Start-Transcript -Path (Join-Path $here 'switch-log.txt') -Force | Out-Null
$B = 'limelight-b'; $drop = 'D:/LimelightAI/llama-switch'
function OnB($cmd) { $cmd | ssh -o BatchMode=yes $B "powershell -NoProfile -Command -" 2>&1 | ForEach-Object { "$_" } }
function Send($files, $to) { scp -q -B -r @($files) "${B}:$drop/$to/"; if ($LASTEXITCODE) { throw "copy to NAYA B failed: $to" } }
foreach ($m in 'gpt-oss-20b', 'gemma3-12b') {
  if (-not (Test-Path "D:\AI Models\llama\$m")) { throw "D:\AI Models\llama\$m is missing - download it on JASPREET first" }
}

"1/2  sending to NAYA B over SSH (first run: ~20 GB of models, a few minutes on the office network)"
OnB "foreach (`$d in 'bin','models','app\server','app\web') { New-Item -ItemType Directory -Force (Join-Path 'D:\LimelightAI\llama-switch' `$d) | Out-Null }" | Out-Null
# what B already has (name|size), so models are sent once
$have = OnB "Get-ChildItem -Recurse -File 'D:\LimelightAI\llama\models' -ErrorAction SilentlyContinue | ForEach-Object { `$_.Name + '|' + `$_.Length }"
Send (Get-ChildItem "$root\tools\llama" -File | Where-Object { $_.Extension -in '.exe', '.dll' -or $_.Name -like 'LICENSE*' }).FullName 'bin'
Send @("$root\tools\llama\setup-models.py", "$here\engine-guard.ps1") ''
foreach ($m in 'gpt-oss-20b', 'gemma3-12b') {
  $missing = Get-ChildItem "D:\AI Models\llama\$m" -File -Filter *.gguf | Where-Object { "$($_.Name)|$($_.Length)" -notin $have }
  if ($missing) {
    OnB "New-Item -ItemType Directory -Force 'D:\LimelightAI\llama-switch\models\$m' | Out-Null" | Out-Null
    Send $missing.FullName "models/$m"; "     sent $m"
  } else { "     $m already on NAYA B" }
}
Send (Get-ChildItem "$ai\server" -File -Filter *.py).FullName 'app/server'
Send (Get-ChildItem "$ai\web").FullName 'app/web'
"     done"

"2/2  switching NAYA B"
$remote = "`r`n" + @'
$ErrorActionPreference = 'Continue'
$drop = 'D:\LimelightAI\llama-switch'; $app = 'D:\LimelightAI\app'; $t = Get-Date -Format 'yyyyMMdd-HHmm'
robocopy "$drop\bin" 'D:\LimelightAI\llama\bin' /E /NFL /NDL /NJH /NP | Out-Null
robocopy "$drop\models" 'D:\LimelightAI\llama\models' /E /MOVE /NFL /NDL /NJH /NP | Out-Null
Copy-Item "$drop\setup-models.py", "$drop\engine-guard.ps1" 'D:\LimelightAI\llama\' -Force
"--- models (B's Ollama models hard-linked; gpt-oss-20b and gemma3-12b sent):"
& "$app\.venv\Scripts\python.exe" 'D:\LimelightAI\llama\setup-models.py' --ollama 'D:\LimelightAI\ollama\models' --models 'D:\LimelightAI\llama\models'
"--- app: backup app-$t, then the new code"
robocopy "$app\server" "D:\LimelightAI\backup\app-$t\server" *.py /NFL /NDL /NJH /NP | Out-Null
robocopy "$app\web" "D:\LimelightAI\backup\app-$t\web" /E /NFL /NDL /NJH /NP | Out-Null
robocopy "$drop\app\server" "$app\server" *.py /NFL /NDL /NJH /NP | Out-Null
robocopy "$drop\app\web" "$app\web" /E /NFL /NDL /NJH /NP | Out-Null
"--- engine task (at sign-in, hidden, with the standby-editor guard)"
$act = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File D:\LimelightAI\llama\engine-guard.ps1'
Register-ScheduledTask -TaskName 'Limelight AI Engine' -Action $act -Trigger (New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME) -Force | Out-Null
if (-not (Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*engine-guard.ps1*' })) { Start-ScheduledTask -TaskName 'Limelight AI Engine' }
foreach ($i in 1..30) { Start-Sleep 2; try { $m = Invoke-RestMethod http://127.0.0.1:8830/models -TimeoutSec 3; break } catch {} }
if ($m) { "engine up, models: " + (($m.data | ForEach-Object { $_.id }) -join ', ') } else { 'ENGINE NOT UP (standby editor running? see D:\LimelightAI\engine.log)' }
"--- restart the app (its loop starts it again)"
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*LimelightAI\app\server\app.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; 'stopped app ' + $_.ProcessId }
Remove-Item -Recurse -Force $drop -ErrorAction SilentlyContinue
'@
$ErrorActionPreference = 'Continue'
OnB $remote
"ssh exit code: $LASTEXITCODE"

$k = (Get-Content "$root\limelight-workspace\Data\ai.key" -Raw).Trim()
$ok = $false
foreach ($i in 1..40) {
  Start-Sleep 3
  try { $s = Invoke-RestMethod http://192.168.0.205:8800/api/status -Headers @{ 'x-lh-key' = $k; 'x-lh-user' = 'check' } -TimeoutSec 4
        if ($s.engine.running) { $ok = $true; break } } catch {}
}
if ($ok) { "OK - NAYA B's Limelight AI runs on llama.cpp. Models: $($s.engine.models -join ', ')" }
else { 'NOT confirmed yet - tell Claude (switch-log.txt has the details). Undo: the old app is in D:\LimelightAI\backup\.' }
Stop-Transcript | Out-Null
Read-Host 'Press Enter to close'
