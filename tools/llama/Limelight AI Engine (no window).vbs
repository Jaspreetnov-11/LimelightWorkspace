' Starts the Limelight AI engine (llama.cpp) hidden. Put a shortcut to this file in shell:startup.
Set sh = CreateObject("WScript.Shell")
here = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & here & "\start-engine.ps1""", 0, False
