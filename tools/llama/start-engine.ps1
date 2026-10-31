# Limelight AI engine: llama.cpp in router mode (several models, each loaded on first use, unloaded after an idle
# hour or when another needs the room). 127.0.0.1 only, like Ollama was. Replaces Ollama on this PC.
#   Models: D:\AI Models\llama\models.ini (made by setup-models.py)
$here   = Split-Path -Parent $MyInvocation.MyCommand.Path
$models = if ($env:LIMELIGHT_LLM_MODELS) { $env:LIMELIGHT_LLM_MODELS } else { 'D:\AI Models\llama' }
$port   = if ($env:LIMELIGHT_LLM_PORT) { $env:LIMELIGHT_LLM_PORT } else { '8830' }

# its own download cache, so models other tools fetched (image models etc.) don't appear in the list
$env:LLAMA_CACHE = Join-Path $models 'cache'

if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { return }  # already running
Start-Process -WindowStyle Hidden -FilePath "$here\llama-server.exe" -ArgumentList @(
  '--host', '127.0.0.1', '--port', $port,
  '--models-dir', "`"$models`"", '--models-preset', "`"$models\models.ini`"",   # (a model dropped in its own folder appears by itself)
  '--models-max', '2', '--models-memory-margin', '1024'
) -RedirectStandardOutput "$here\engine.log" -RedirectStandardError "$here\engine.err.log"
