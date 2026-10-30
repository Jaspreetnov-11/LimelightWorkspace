@echo off
rem Builds Lighthouse.exe into browser\app (run again after changing Program.cs; Lighthouse.json can be edited without a rebuild).
cd /d "%~dp0"
dotnet publish Lighthouse.csproj -c Release -o app --nologo
