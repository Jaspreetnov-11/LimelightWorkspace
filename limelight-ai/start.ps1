# Start Limelight AI.
#   .\start.ps1                 -> only this PC  (http://127.0.0.1:8800)
#   .\start.ps1 -Lan -Password "xyz"   -> office LAN access, password protected
param([switch]$Lan, [string]$Password = "")
Set-Location $PSScriptRoot
# Language models: the Limelight AI engine (llama.cpp, tools\llama, :8830, this PC only).
# Image/voice model location and offline mode are set in server\config.py.
# The Limelight AI engine (llama.cpp, tools\llama): starts it hidden when it isn't running yet.
& (Join-Path (Split-Path -Parent $PSScriptRoot) 'tools\llama\start-engine.ps1')

if ($Lan) {
    if (-not $Password) { Write-Host "LAN mode needs -Password" -ForegroundColor Red; exit 1 }
    $env:LIMELIGHT_HOST = "0.0.0.0"
    $env:LIMELIGHT_PASSWORD = $Password
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } | Select-Object -First 1).IPAddress
    Write-Host "Office users can open: http://${ip}:8800" -ForegroundColor Yellow
}

Start-Process "http://127.0.0.1:8800"
& .\.venv\Scripts\python.exe server\app.py
