' Runs watchdog.ps1 with no window (Task Scheduler starts this every minute: "Limelight Workspace Watchdog").
CreateObject("WScript.Shell").Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""E:\Limelight Ai\limelight-workspace\watchdog.ps1""", 0, False
