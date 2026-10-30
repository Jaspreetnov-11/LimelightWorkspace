# Limelight AI one-time setup.
#   .\setup.ps1            -> app + local LLM engine + default model
#   .\setup.ps1 -Images    -> also installs local image generation (GPU)
param([switch]$Images, [string]$Model = "qwen3:8b")
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "`n== Limelight AI setup ==" -ForegroundColor Green

if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python environment..."
    python -m venv .venv
}
$py = ".\.venv\Scripts\python.exe"
& $py -m pip install --upgrade pip -q
& $py -m pip install -r requirements.txt -q

if ($Images) {
    Write-Host "Installing PyTorch (CUDA) + diffusers for image generation..."
    & $py -m pip install torch --index-url https://download.pytorch.org/whl/cu128 -q  # cu128 covers RTX 30/40/50 series
    & $py -m pip install -r requirements-images.txt -q
}

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Ollama (local model engine)..."
    winget install --id Ollama.Ollama -e --accept-source-agreements --accept-package-agreements
    $env:Path += ";$env:LOCALAPPDATA\Programs\Ollama"
}

# Keep the model engine on localhost only.
[Environment]::SetEnvironmentVariable("OLLAMA_HOST", "127.0.0.1:11434", "User")
$env:OLLAMA_HOST = "127.0.0.1:11434"
try { Invoke-WebRequest http://127.0.0.1:11434/api/tags -UseBasicParsing -TimeoutSec 2 | Out-Null }
catch { Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden; Start-Sleep 4 }

Write-Host "Downloading model $Model (one time)..."
ollama pull $Model

Write-Host "`nSetup complete. Run .\start.ps1 to launch Limelight AI." -ForegroundColor Green
