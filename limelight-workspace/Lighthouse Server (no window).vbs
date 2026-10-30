' Starts the Lighthouse server (http://localhost:3350 and the app ports 3341-3345) hidden, if it is not running yet.
' Runs for the office LAN as well (--lan): other PCs open http://192.168.0.210:3350 (Windows Firewall must allow 3341-3345, 3350).
' To start it at sign-in, copy this file into the Startup folder (Win+R, shell:startup).
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "E:\Limelight Ai\limelight-workspace"
sh.Run "cmd /c node server.mjs --lan >> server.log 2>&1", 0, False
