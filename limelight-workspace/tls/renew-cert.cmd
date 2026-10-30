@echo off
rem Run weekly by the task "Limelight office certificate": renews the office https certificate when it is due.
cd /d "%~dp0"
node office-cert.mjs > "%~dp0last-run.log" 2>&1
