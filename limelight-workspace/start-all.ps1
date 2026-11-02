# Limelight Workspace - starts every app on this PC (JASPREET) that is not already running, hidden.
# Run at sign-in from the Startup folder ("Limelight Workspace (start all).vbs"), so a restart or a power cut
# brings limelightcorp.net back by itself. Safe to run any time: an app that already answers is left alone.
#   Lighthouse  :3350 (+ app ports 3341-3345)   Office :3300   Design (Studio) :3330   Limelight AI (local fallback) :8800
#   AI engine (llama.cpp, 127.0.0.1:8830) - used by Office's Agent and the local Limelight AI
# The Cloudflare tunnel has its own Startup entry ("Limelight AI Tunnel.vbs").
$root = Split-Path -Parent $PSScriptRoot
$log = Join-Path $PSScriptRoot 'start-all.log'
function Note($m) { Add-Content -Path $log -Value ("{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $m) }
function Up($port) { [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) }
function Start-Hidden($name, $port, $dir, $cmd) {
  if (Up $port) { Note "$name already running on :$port"; return }
  Start-Process cmd.exe -ArgumentList "/c $cmd" -WorkingDirectory $dir -WindowStyle Hidden
  Note "$name started (:$port)"
}

# the AI engine first: Office's Agent and Limelight AI ask it
if (-not (Up 8830)) { & (Join-Path $root 'tools\llama\start-engine.ps1'); Note 'AI engine started (:8830, this PC only)' }
Start-Hidden 'Lighthouse' 3350 (Join-Path $root 'limelight-workspace') 'node server.mjs --lan >> server.log 2>&1'
# (no --open: nothing pops up in a browser at sign-in)
Start-Hidden 'Office' 3300 (Join-Path $root 'limelight-office') 'node server.mjs >> data\server.log 2>&1'
Start-Hidden 'Design' 3330 (Join-Path $root 'limelight-studio') 'node server.mjs >> server.log 2>&1'
# Limelight AI here is the fallback while NAYA B is busy or off (its AI engine on this PC only, never on NAYA A)
$ai = Join-Path $root 'limelight-ai'
if (Test-Path (Join-Path $ai '.venv\Scripts\python.exe')) {
  Start-Hidden 'Limelight AI (local)' 8800 $ai '.venv\Scripts\python.exe server\app.py >> data\server.log 2>&1'
}
# Limelight Search (SearXNG :8888 here only + LAN relay :8890): the web search of Limelight AI on NAYA B and here
if (Test-Path (Join-Path $root 'tools\searxng\.venv\Scripts\python.exe')) {
  if (Up 8890) { Note 'Limelight Search already running on :8890' }
  else { & (Join-Path $ai 'search\start-search.ps1'); Note 'Limelight Search started (:8890)' }
}
