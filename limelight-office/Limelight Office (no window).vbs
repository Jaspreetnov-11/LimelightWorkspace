' Starts Limelight Office without a console window and opens it in the browser.
Set sh = CreateObject("WScript.Shell")
dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
sh.Run "cmd /c node server.mjs --open >> data\server.log 2>&1", 0, False
