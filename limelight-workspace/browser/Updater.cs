// Updater.cs - the Limelight workspace app keeps itself up to date from the NAS. The pages always come live from the
// workspace server; only this window's own code needs an update, and it is put in one place (Settings.UpdateDir, the
// NAS). Every start compares that copy's version with this one: a newer one is copied over this folder by a small
// script once this exe has closed, and started again - a second or two, no reinstall. The NAS out of reach (or slow):
// the app starts as it is.
using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Lighthouse
{
    static class Updater
    {
        public static bool Start(string dir)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dir)) return false;
                var here = Path.GetDirectoryName(Application.ExecutablePath);
                if (string.Equals(Path.GetFullPath(here).TrimEnd('\\'), Path.GetFullPath(dir).TrimEnd('\\'), StringComparison.OrdinalIgnoreCase)) return false; // (running from the NAS copy itself)
                var exe = Path.GetFileName(Application.ExecutablePath);
                // (a missing or sleeping NAS must not hold up the start: 3 s at most)
                var look = Task.Run(() => File.Exists(Path.Combine(dir, exe)) ? FileVersionInfo.GetVersionInfo(Path.Combine(dir, exe)).FileVersion : null);
                if (!look.Wait(3000) || look.Result == null) return false;
                if (!Version.TryParse(look.Result, out var there) || !Version.TryParse(FileVersionInfo.GetVersionInfo(Application.ExecutablePath).FileVersion, out var mine)) return false;
                if (there <= mine) return false;
                var script = Path.Combine(Path.GetTempPath(), "limelight-update.cmd");
                File.WriteAllText(script,
                    "@echo off\r\n" +
                    "rem Limelight workspace app: update from the NAS, then start again\r\n" +
                    $"for /l %%i in (1,1,20) do (tasklist /fi \"pid eq {Process.GetCurrentProcess().Id}\" | find \"{Process.GetCurrentProcess().Id}\" >nul || goto copy\r\n  timeout /t 1 /nobreak >nul)\r\n" +
                    ":copy\r\n" +
                    $"robocopy \"{dir}\" \"{here}\" /E /R:3 /W:1 /XF Lighthouse.json /NFL /NDL /NJH /NJS /NP >nul\r\n" +
                    $"start \"\" \"{Application.ExecutablePath}\" --no-update\r\n");
                Process.Start(new ProcessStartInfo("cmd.exe", "/c \"" + script + "\"") { CreateNoWindow = true, UseShellExecute = false, WindowStyle = ProcessWindowStyle.Hidden });
                return true;
            }
            catch { return false; }
        }
    }
}
