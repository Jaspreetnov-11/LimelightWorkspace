# Limelight Workspace - starts every app on this PC (JASPREET) that is not already running, hidden.
# Run at sign-in from the Startup folder ("Limelight Workspace (start all).vbs"), so a restart or a power cut
# brings limelightcorp.net back by itself. Safe to run any time: an app that already answers is left alone.
#   Lighthouse  :3350 (+ app ports 3341-3345)   Office :3300   Design (Studio) :3330   Limelight AI (local fallback) :8800
# The Cloudflare tunnel and Ollama have their own Startup entries ("Limelight AI Tunnel.vbs", "Ollama.lnk").
$root = Split-Path -Parent $PSScriptRoot
$log = Join-Path $PSScriptRoot 'start-all.log'
function Note($m) { Add-Content -Path $log -Value ("{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $m) }
function Up($port) { [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) }
function Start-Hidden($name, $port, $dir, $cmd) {
  if (Up $port) { Note "$name already running on :$port"; return }
  Start-Process cmd.exe -ArgumentList "/c $cmd" -WorkingDirectory $dir -WindowStyle Hidden
  Note "$name started (:$port)"
}

Start-Hidden 'Lighthouse' 3350 (Join-Path $root 'limelight-workspace') 'node server.mjs --lan >> server.log 2>&1'
# (no --open: nothing pops up in a browser at sign-in)
Start-Hidden 'Office' 3300 (Join-Path $root 'limelight-office') 'node server.mjs >> data\server.log 2>&1'
Start-Hidden 'Design' 3330 (Join-Path $root 'limelight-studio') 'node server.mjs >> server.log 2>&1'
# Limelight AI here is the fallback while NAYA B is busy or off (Ollama on this PC only, never on NAYA A)
$ai = Join-Path $root 'limelight-ai'
if (Test-Path (Join-Path $ai '.venv\Scripts\python.exe')) {
  $env:OLLAMA_HOST = '127.0.0.1:11434'; $env:OLLAMA_MODELS = 'D:\AI Models\ollama\models'
  $ollama = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'
  if (-not (Up 11434) -and (Test-Path $ollama)) { Start-Process $ollama -ArgumentList 'serve' -WindowStyle Hidden; Note 'Ollama started (:11434, this PC only)' }
  Start-Hidden 'Limelight AI (local)' 8800 $ai '.venv\Scripts\python.exe server\app.py >> data\server.log 2>&1'
}
