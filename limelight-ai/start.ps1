# Start Limelight AI.
#   .\start.ps1                 -> only this PC  (http://127.0.0.1:8800)
#   .\start.ps1 -Lan -Password "xyz"   -> office LAN access, password protected
param([switch]$Lan, [string]$Password = "")
Set-Location $PSScriptRoot
$env:OLLAMA_HOST = "127.0.0.1:11434"
# All model engines live on D:. Ollama can't follow the old C: junction, so point it at the real folder.
$env:OLLAMA_MODELS = "D:\AI Models\ollama\models"
# Image/voice model location and offline mode are set in server\config.py.

try { Invoke-WebRequest http://127.0.0.1:11434/api/tags -UseBasicParsing -TimeoutSec 2 | Out-Null }
catch {
    Write-Host "Starting Ollama..."
    Start-Process "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep 3
}

if ($Lan) {
    if (-not $Password) { Write-Host "LAN mode needs -Password" -ForegroundColor Red; exit 1 }
    $env:LIMELIGHT_HOST = "0.0.0.0"
    $env:LIMELIGHT_PASSWORD = $Password
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } | Select-Object -First 1).IPAddress
    Write-Host "Office users can open: http://${ip}:8800" -ForegroundColor Yellow
}

Start-Process "http://127.0.0.1:8800"
& .\.venv\Scripts\python.exe server\app.py
