# Limelight AI one-time setup.
#   .\setup.ps1            -> app + the local LLM engine's model folder
#   .\setup.ps1 -Images    -> also installs local image generation (GPU)
# The engine itself is llama.cpp in ..\tools\llama (llama-server.exe from github.com/ggml-org/llama.cpp releases,
# Windows CUDA 12.4 build + its cudart zip). Language models live in D:\AI Models\llama.
param([switch]$Images)
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

$engine = Join-Path (Split-Path -Parent $PSScriptRoot) 'tools\llama'
if (-not (Test-Path "$engine\llama-server.exe")) {
    Write-Host "Put llama.cpp's Windows build in $engine first (see the top of this file)." -ForegroundColor Red; exit 1
}
# The model folder: models Ollama downloaded earlier are reused (hard links, no extra space) + models.ini
& $py "$engine\setup-models.py"
& "$engine\start-engine.ps1"
Write-Host "More models: Limelight AI > Models > Download, or put a .gguf in D:\AI Models\llama."

Write-Host "`nSetup complete. Run .\start.ps1 to launch Limelight AI." -ForegroundColor Green
