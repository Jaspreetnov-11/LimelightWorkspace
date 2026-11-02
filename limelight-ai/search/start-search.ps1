# Starts Limelight Search on JASPREET (hidden; start-all.ps1 runs it at sign-in): SearXNG on 127.0.0.1:8888 and the LAN relay on :8890.
# SearXNG's code and Python live in E:\Limelight Ai\tools\searxng (git clone + .venv); its secret key in
# tools\searxng-limelight\secret.txt (made on first start, never shared). Logs go to tools\searxng-limelight\.
$here = $PSScriptRoot
$tools = Join-Path (Split-Path -Parent (Split-Path -Parent $here)) 'tools'
$sx = Join-Path $tools 'searxng'
$py = Join-Path $sx '.venv\Scripts\python.exe'
$state = Join-Path $tools 'searxng-limelight'
New-Item -ItemType Directory -Force $state | Out-Null

function Listening($port) { [bool](Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) }

$secretFile = Join-Path $state 'secret.txt'
if (-not (Test-Path $secretFile)) {
    & $py -c "import secrets,sys; open(sys.argv[1],'w').write(secrets.token_hex(32))" $secretFile
}
$env:SEARXNG_SECRET = (Get-Content $secretFile -Raw).Trim()
$env:SEARXNG_SETTINGS_PATH = Join-Path $here 'settings.yml'

if (-not (Listening 8888)) {
    Start-Process -WindowStyle Hidden -WorkingDirectory $sx -FilePath $py -ArgumentList '-m', 'searx.webapp' `
        -RedirectStandardOutput (Join-Path $state 'searxng.log') -RedirectStandardError (Join-Path $state 'searxng.err.log')
}
if (-not (Listening 8890)) {
    Start-Process -WindowStyle Hidden -WorkingDirectory $here -FilePath $py -ArgumentList "`"$(Join-Path $here 'relay.py')`"" `
        -RedirectStandardOutput (Join-Path $state 'relay.log') -RedirectStandardError (Join-Path $state 'relay.err.log')
}
