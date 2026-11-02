@echo off
rem Run weekly by the task "MeshLink certificate": renews the MeshLink https certificate when due and follows a
rem changed office address.
cd /d "%~dp0"
node mesh-cert.mjs > "%~dp0data\cert-last-run.log" 2>&1
