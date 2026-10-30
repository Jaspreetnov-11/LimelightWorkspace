' Starts Limelight Studio without a console window (used by Limelight Workspace's Start button).
Set sh = CreateObject("WScript.Shell")
dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
sh.Run "cmd /c node server.mjs >> server.log 2>&1", 0, False
