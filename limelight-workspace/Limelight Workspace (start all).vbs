' Starts every Limelight Workspace app on this PC that is not running yet, hidden (start-all.ps1).
' A copy sits in the Startup folder (Win+R, shell:startup), so a restart brings limelightcorp.net back by itself.
CreateObject("WScript.Shell").Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""E:\Limelight Ai\limelight-workspace\start-all.ps1""", 0, False
