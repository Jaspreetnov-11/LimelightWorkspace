# NAYA B: keeps the Limelight AI engine (llama.cpp router, 127.0.0.1:8830) running - except while the standby editor
# holds port 3100 (it needs the GPU), as with the AI before. Scheduled task "Limelight AI Engine", at sign-in, hidden.
#   D:\LimelightAI\llama\bin\      llama-server.exe + dlls (from JASPREET's E:\Limelight Ai\tools\llama)
#   D:\LimelightAI\llama\models\   models.ini + models (setup-models.py; Ollama's models hard-linked, no extra space)
$bin = 'D:\LimelightAI\llama\bin'; $models = 'D:\LimelightAI\llama\models'; $log = 'D:\LimelightAI\engine.log'
$env:LLAMA_CACHE = Join-Path $models 'cache'
function Up($port) { [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) }
function Note($m) { Add-Content $log ("{0:s}  {1}" -f (Get-Date), $m) }

while ($true) {
  $engine = Get-Process -Name 'llama-server' -ErrorAction SilentlyContinue
  if (Up 3100) {
    if ($engine) { $engine | Stop-Process -Force; Note 'standby editor on 3100: AI engine stopped' }
  } elseif (-not (Up 8830)) {
    Start-Process -WindowStyle Hidden -FilePath "$bin\llama-server.exe" -ArgumentList @(
      '--host', '127.0.0.1', '--port', '8830',
      '--models-dir', "`"$models`"", '--models-preset', "`"$models\models.ini`"",
      '--models-max', '2', '--models-memory-margin', '1024'
    ) -RedirectStandardOutput 'D:\LimelightAI\engine.out.log' -RedirectStandardError 'D:\LimelightAI\engine.err.log'
    Note 'AI engine started (:8830)'
  }
  Start-Sleep -Seconds 10
}
