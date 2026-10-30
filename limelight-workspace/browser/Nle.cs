// Nle.cs - Open in Premiere / Open in DaVinci for the Limelight workspace window (taken over from Limelight Editor.exe,
// which is no longer needed: its package is kept in E:\Limelight Ai\Backups\Limelight Editor app). Edit (in the
// workspace) links limelight://nle/<premiere|resolve>?f=<xml>; Windows hands the link to this exe, which collects the
// timeline's footage onto this PC and starts the app.
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Lighthouse
{
    // 🎬 Open in Premiere / Open in DaVinci: the editor wrote the project's timeline XML in its folder (engine/nlfolder.mjs,
    // "Premiere - DaVinci\<name>.xml", footage linked on the NAS) and links here. Only an .xml that is there is opened.
    // Premiere Pro gets the file on its command line. Resolve (the free one cannot be driven from outside): our script goes
    // into its Workspace > Scripts menu, the XML's path into %APPDATA%\Limelight\resolve-next.txt for it, Resolve starts,
    // and fuscript tries the script for a minute (that opens it by itself in Resolve Studio).
    static class Nle
    {
        public static void Open(string link)
        {
            var app = link.Substring("limelight://nle/".Length).Split('?', '/')[0].ToLowerInvariant();
            var q = link.Contains("?") ? link.Substring(link.IndexOf('?') + 1) : "";
            var f = q.Split('&').Where(x => x.StartsWith("f=")).Select(x => Uri.UnescapeDataString(x.Substring(2).Replace('+', ' '))).FirstOrDefault() ?? "";
            if (!f.EndsWith(".xml", StringComparison.OrdinalIgnoreCase)) return;
            if (!File.Exists(f)) { Say("The timeline file is not reachable from this PC:\n\n" + f + "\n\nIs the NAS (Z: drive) connected here?"); return; }
            if (app != "premiere" && app != "resolve") return;
            // (the app must be on this PC before any footage is copied for it)
            if (app == "premiere" && PremiereExe() == null) { Say("Adobe Premiere Pro is not installed on this PC.\n\nOn a PC with Premiere: File > Import > \n" + f); return; }
            if (app == "resolve" && ResolveExe() == null) { Say("DaVinci Resolve is not installed on this PC.\n\nOn a PC with Resolve: File > Import > Timeline > \n" + f); return; }
            var local = Collect.Run(f, app == "resolve" ? "DaVinci Resolve" : "Premiere Pro");
            if (local == null) return; // (stopped)
            if (app == "premiere") Premiere(local);
            else Resolve(local);
            if (Collect.Missing > 0) Say(Collect.Missing + " file(s) of the timeline were not reachable from this PC and stay linked where they were (the NAS):\n\n" + Collect.MissingList);
        }

        static void Say(string text) => MessageBox.Show(text, "Limelight", MessageBoxButtons.OK, MessageBoxIcon.Information, MessageBoxDefaultButton.Button1, MessageBoxOptions.DefaultDesktopOnly);

        static string AppPath(string exe)
        {
            foreach (var hive in new[] { Microsoft.Win32.Registry.LocalMachine, Microsoft.Win32.Registry.CurrentUser })
                try { using (var k = hive.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\" + exe)) { var p = k?.GetValue("") as string; if (!string.IsNullOrEmpty(p) && File.Exists(p.Trim('"'))) return p.Trim('"'); } } catch { }
            return null;
        }

        static string PremiereExe()
        {
            var pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            return (Directory.Exists(Path.Combine(pf, "Adobe")) ? Directory.GetDirectories(Path.Combine(pf, "Adobe"), "Adobe Premiere Pro*") : new string[0])
                .OrderBy(d => d).Select(d => Path.Combine(d, "Adobe Premiere Pro.exe")).LastOrDefault(File.Exists) ?? AppPath("Adobe Premiere Pro.exe");
        }
        static string ResolveExe()
        {
            var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Blackmagic Design", "DaVinci Resolve");
            return File.Exists(Path.Combine(dir, "Resolve.exe")) ? Path.Combine(dir, "Resolve.exe") : AppPath("Resolve.exe");
        }

        static void Premiere(string xml)
        {
            var exe = PremiereExe();
            if (exe == null) { Say("Adobe Premiere Pro is not installed on this PC.\n\nOn a PC with Premiere: File > Import > \n" + xml); return; }
            Process.Start(new ProcessStartInfo(exe, "\"" + xml + "\"") { UseShellExecute = false, WorkingDirectory = Path.GetDirectoryName(xml) });
        }

        static void Resolve(string xml)
        {
            var exe = ResolveExe();
            if (exe == null) { Say("DaVinci Resolve is not installed on this PC.\n\nOn a PC with Resolve: File > Import > Timeline > \n" + xml); return; }
            var roaming = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var scripts = Path.Combine(roaming, "Blackmagic Design", "DaVinci Resolve", "Support", "Fusion", "Scripts", "Utility");
            var script = Path.Combine(scripts, "Limelight Timeline.lua");
            var next = Path.Combine(roaming, "Limelight", "resolve-next.txt");
            Directory.CreateDirectory(scripts); File.WriteAllText(script, ResolveScript.Replace("\r\n", "\n"), new UTF8Encoding(false));
            Directory.CreateDirectory(Path.GetDirectoryName(next)); File.WriteAllText(next, xml, new UTF8Encoding(false));
            try { Clipboard.SetText(xml); } catch { }
            if (Process.GetProcessesByName("Resolve").Length == 0) Process.Start(new ProcessStartInfo(exe) { UseShellExecute = false, WorkingDirectory = Path.GetDirectoryName(exe) });
            // (Resolve Studio takes scripts from outside: the timeline opens by itself once Resolve is up)
            var fuscript = Path.Combine(Path.GetDirectoryName(exe), "fuscript.exe");
            var tryIt = new System.Threading.Thread(() =>
            {
                for (var i = 0; i < 12 && File.Exists(next) && File.Exists(fuscript); i++)
                {
                    System.Threading.Thread.Sleep(5000);
                    try { using (var p = Process.Start(new ProcessStartInfo(fuscript, "-l lua \"" + script + "\"") { UseShellExecute = false, CreateNoWindow = true })) p.WaitForExit(20000); } catch { }
                }
            }) { IsBackground = false };
            tryIt.Start();
            Say("DaVinci Resolve is opening.\n\nThe free Resolve does not let other programs open a timeline in it, so one click there:\nopen any project (Untitled is fine), then\n     Workspace > Scripts > Limelight Timeline\n\nThe timeline comes in as a new project, its footage from this PC.\n(Or File > Import > Timeline - the XML's path is on the clipboard.)");
        }

        // (the same script as engine/nlfolder.mjs RESOLVE_LUA - keep the two in step)
        const string ResolveScript = @"-- Limelight Timeline: opens the timeline the Limelight editor handed over (Open in DaVinci) as a new project.
local resolve = resolve or (bmd and bmd.scriptapp and bmd.scriptapp(""Resolve"")) or (Resolve and Resolve())
if not resolve then print(""Limelight: DaVinci Resolve is not reachable"") return end
local list = os.getenv(""APPDATA"") .. ""\\Limelight\\resolve-next.txt""
local f = io.open(list, ""r"")
local xml = f and f:read(""*l"")
if f then f:close() end
if not xml or xml == """" then print(""Limelight: nothing to open - press Open in DaVinci in the editor, or the Open in DaVinci file in the project folder"") return end
xml = xml:gsub(""^\239\187\191"", """"):gsub('^%s*""?', """"):gsub('""?%s*$', """")
local x = io.open(xml, ""r"")
if not x then print(""Limelight: cannot read "" .. xml) return end
local s = x:read(""*a"")
x:close()
local name = s:match(""<sequence[^>]*><name>(.-)</name>"") or ""Limelight""
name = name:gsub(""&amp;"", ""&""):gsub(""&lt;"", ""<""):gsub(""&gt;"", "">""):gsub(""&quot;"", '""')
local tb = tonumber(s:match(""<timebase>(%d+)</timebase>"")) or 25
local fps = tostring(tb)
if s:match(""<ntsc>(%a+)</ntsc>"") == ""TRUE"" then fps = string.format(""%.3f"", tb * 1000 / 1001):gsub(""0+$"", """") end
local w, h = s:match(""<width>(%d+)</width>""), s:match(""<height>(%d+)</height>"")
local pm = resolve:GetProjectManager()
if pm:GetCurrentProject() then pm:SaveProject() end
local pname, n = name, 1
local proj = pm:CreateProject(pname)
while not proj and n < 50 do n = n + 1; pname = name .. "" "" .. n; proj = pm:CreateProject(pname) end
proj = proj or pm:GetCurrentProject()
if not proj then print(""Limelight: could not make a project"") return end
proj:SetSetting(""timelineFrameRate"", fps)
proj:SetSetting(""timelinePlaybackFrameRate"", fps)
if w and h then proj:SetSetting(""timelineResolutionWidth"", w); proj:SetSetting(""timelineResolutionHeight"", h) end
local tl = proj:GetMediaPool():ImportTimelineFromFile(xml, { timelineName = name, importSourceClips = true })
if not tl then print(""Limelight: Resolve could not import "" .. xml) return end
proj:SetCurrentTimeline(tl)
resolve:OpenPage(""edit"")
pm:SaveProject()
os.remove(list)
print(""Limelight: opened "" .. name .. "" (project "" .. pname .. "")"")
";
    }

    // 🖥 the editor opens here by default (not enforced): this PC's Desktop and Start menu shortcuts start this exe, and
    // limelight:// links open in it. Only for the user who runs it (HKCU, no administrator). An old "Limelight
    // Editor.url" Desktop shortcut that opened the editor in the browser is replaced. The PC's own browser is untouched.
    // 📦 Open in Premiere / DaVinci collects first: every file the timeline uses (footage, music, title PNGs, subtitles) is
    // copied onto this PC - <the fixed drive with the most room, C: last>\Limelight Projects\<project> - and a copy of the
    // XML points at those copies, so the edit opens with nothing offline and plays from the PC's own disk. A copy already
    // there (same size and time) is kept: opening the same project again copies only what is new or changed. A window shows
    // the progress (Stop keeps what is copied). A file this PC cannot reach stays linked where it was.
    static class Collect
    {
        public static int Missing;
        public static string MissingList = "";

        // file://localhost/Z%3a/Editor%20Projects/a.mp4 <-> Z:\Editor Projects\a.mp4 (engine/nlexport.mjs pathUrl)
        const string Pre = "file://localhost/";
        static string ToPath(string url)
        {
            if (!url.StartsWith(Pre, StringComparison.OrdinalIgnoreCase)) return null;
            var rest = WebUtility.HtmlDecode(url.Substring(Pre.Length));
            var parts = rest.Split('/').Select(Uri.UnescapeDataString).ToArray();
            return rest.StartsWith("/") ? @"\\" + string.Join(@"\", parts.Skip(2)) : string.Join(@"\", parts);
        }
        static string ToUrl(string p) => Pre + string.Join("/", Path.GetFullPath(p).Split('\\').Select((s, i) => i == 0 && Regex.IsMatch(s, "^[A-Za-z]:$") ? s.Replace(":", "%3a") : Uri.EscapeDataString(s)));
        static string Safe(string n) { var s = Regex.Replace(n ?? "", "[\\\\/:*?\"<>|]+", "_").Trim(' ', '.'); return s.Length == 0 ? "Timeline" : s.Length > 100 ? s.Substring(0, 100) : s; }

        static string Root()
        {
            var drives = DriveInfo.GetDrives().Where(d => { try { return d.IsReady && d.DriveType == DriveType.Fixed; } catch { return false; } }).ToList();
            var best = drives.Where(d => !d.Name.StartsWith("C", StringComparison.OrdinalIgnoreCase)).OrderByDescending(d => d.AvailableFreeSpace).FirstOrDefault();
            return best != null ? Path.Combine(best.RootDirectory.FullName, "Limelight Projects")
                : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyVideos), "Limelight Projects");
        }

        public static string Run(string xml, string appName)
        {
            Missing = 0; MissingList = "";
            var nleDir = Path.GetDirectoryName(xml);                                   // <project>\Premiere - DaVinci
            var project = Path.GetFileName(Path.GetDirectoryName(nleDir)) ?? Path.GetFileNameWithoutExtension(xml);
            var dest = Path.Combine(Root(), Safe(project));
            var text = File.ReadAllText(xml, Encoding.UTF8);
            var urls = Regex.Matches(text, "<pathurl>(.*?)</pathurl>").Cast<Match>().Select(m => m.Groups[1].Value).Distinct().ToList();
            // where each file goes: the hand-off's own files (titles, subtitles) keep their place under it, the rest in Media
            var plan = new System.Collections.Generic.List<Tuple<string, string, string, long>>(); // url, from, to, bytes
            var taken = new System.Collections.Generic.HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var missing = new System.Collections.Generic.List<string>();
            foreach (var u in urls)
            {
                var src = ToPath(u);
                FileInfo fi = null; try { if (src != null) fi = new FileInfo(src); } catch { }
                if (fi == null || !fi.Exists) { missing.Add(src ?? u); continue; }
                string to;
                if (src.StartsWith(nleDir + "\\", StringComparison.OrdinalIgnoreCase)) to = Path.Combine(dest, "Premiere - DaVinci", src.Substring(nleDir.Length + 1));
                else
                {
                    var name = Path.GetFileNameWithoutExtension(src); var ext = Path.GetExtension(src);
                    to = Path.Combine(dest, "Media", Safe(name) + ext);
                    for (var i = 2; taken.Contains(to); i++) to = Path.Combine(dest, "Media", Safe(name) + "_" + i + ext);
                }
                taken.Add(to);
                plan.Add(Tuple.Create(u, src, to, fi.Length));
            }
            Missing = missing.Count; MissingList = string.Join("\n", missing.Take(8)) + (missing.Count > 8 ? "\n…" : "");
            var need = plan.Where(p => !Same(p.Item2, p.Item3)).ToList();
            long bytes = need.Sum(p => p.Item4);
            // room on that drive (and 5 GB to spare)? Otherwise: open with the footage where it is
            try
            {
                var free = new DriveInfo(Path.GetPathRoot(dest)).AvailableFreeSpace;
                if (bytes + (5L << 30) > free)
                {
                    var ok = MessageBox.Show($"Copying this timeline's footage needs {Gb(bytes)} but {Path.GetPathRoot(dest)} has {Gb(free)} free.\n\nOpen it with the footage from the NAS instead?",
                        "Limelight", MessageBoxButtons.YesNo, MessageBoxIcon.Question, MessageBoxDefaultButton.Button1, MessageBoxOptions.DefaultDesktopOnly);
                    return ok == DialogResult.Yes ? xml : null;
                }
            }
            catch { }
            if (need.Count > 0 && !CopyWithProgress(need, bytes, appName, project)) return null;
            foreach (var p in plan) text = text.Replace("<pathurl>" + p.Item1 + "</pathurl>", "<pathurl>" + ToUrl(p.Item3) + "</pathurl>");
            var outXml = Path.Combine(dest, Path.GetFileName(xml));
            Directory.CreateDirectory(dest);
            File.WriteAllText(outXml, text, new UTF8Encoding(false));
            return outXml;
        }

        static bool Same(string from, string to)
        {
            try { var a = new FileInfo(from); var b = new FileInfo(to); return b.Exists && a.Length == b.Length && Math.Abs((a.LastWriteTimeUtc - b.LastWriteTimeUtc).TotalSeconds) < 2; }
            catch { return false; }
        }
        static string Gb(long n) => n >= (1L << 30) ? (n / (double)(1L << 30)).ToString("0.0") + " GB" : Math.Max(1, n >> 20) + " MB";

        // the copy, in a small window: a bar, what is being copied, how much is left; Stop ends it (nothing is opened)
        static bool CopyWithProgress(System.Collections.Generic.List<Tuple<string, string, string, long>> need, long total, string appName, string project)
        {
            var form = new Form { Text = "Limelight - getting the footage", Width = 520, Height = 190, FormBorderStyle = FormBorderStyle.FixedDialog, MaximizeBox = false, MinimizeBox = true,
                StartPosition = FormStartPosition.CenterScreen, TopMost = true, BackColor = Color.FromArgb(14, 14, 16), ForeColor = Color.White, Font = new Font("Segoe UI", 9.5f) };
            var head = new Label { Left = 18, Top = 14, Width = 470, Height = 22, Font = new Font("Segoe UI Semibold", 10.5f), Text = "Copying \"" + project + "\" to this PC for " + appName };
            var what = new Label { Left = 18, Top = 40, Width = 470, Height = 20, ForeColor = Color.FromArgb(160, 160, 168), AutoEllipsis = true };
            var bar = new ProgressBar { Left = 18, Top = 66, Width = 468, Height = 16, Maximum = 1000 };
            var left = new Label { Left = 18, Top = 90, Width = 330, Height = 20, ForeColor = Color.FromArgb(160, 160, 168) };
            var stop = new Button { Text = "Stop", Left = 396, Top = 104, Width = 90, Height = 30, FlatStyle = FlatStyle.Flat, ForeColor = Color.White };
            form.Controls.AddRange(new Control[] { head, what, bar, left, stop });
            var cancel = false; var ok = false; string error = null;
            stop.Click += (o, e) => { cancel = true; stop.Enabled = false; stop.Text = "Stopping…"; };
            form.FormClosing += (o, e) => cancel = true;
            long done = 0; var started = DateTime.UtcNow;
            form.Shown += (o, e) => Task.Run(() =>
            {
                try
                {
                    var buf = new byte[4 << 20];
                    for (var k = 0; k < need.Count && !cancel; k++)
                    {
                        var p = need[k];
                        form.BeginInvoke((Action)(() => what.Text = $"{k + 1} of {need.Count}: {Path.GetFileName(p.Item2)}"));
                        Directory.CreateDirectory(Path.GetDirectoryName(p.Item3));
                        var part = p.Item3 + ".part";
                        using (var a = new FileStream(p.Item2, FileMode.Open, FileAccess.Read, FileShare.ReadWrite, 1 << 20))
                        using (var b = new FileStream(part, FileMode.Create, FileAccess.Write, FileShare.None, 1 << 20))
                        {
                            int n;
                            while (!cancel && (n = a.Read(buf, 0, buf.Length)) > 0)
                            {
                                b.Write(buf, 0, n); done += n;
                                var secs = (DateTime.UtcNow - started).TotalSeconds; var rate = secs > 1 ? done / secs : 0;
                                var rest = rate > 0 ? TimeSpan.FromSeconds((total - done) / rate) : TimeSpan.Zero;
                                form.BeginInvoke((Action)(() => { bar.Value = (int)Math.Min(1000, done * 1000 / Math.Max(1, total)); left.Text = $"{Gb(done)} of {Gb(total)}" + (rate > 0 ? $" · about {(rest.TotalMinutes >= 1 ? (int)rest.TotalMinutes + " min" : (int)rest.TotalSeconds + " s")} left" : ""); }));
                            }
                        }
                        if (cancel) { try { File.Delete(part); } catch { } break; }
                        if (File.Exists(p.Item3)) File.Delete(p.Item3);
                        File.Move(part, p.Item3);
                        File.SetLastWriteTimeUtc(p.Item3, File.GetLastWriteTimeUtc(p.Item2)); // (so the next open sees it is the same file)
                    }
                    ok = !cancel;
                }
                catch (Exception ex) { error = ex.Message; }
                form.BeginInvoke((Action)(() => form.Close()));
            });
            Application.Run(form);
            if (error != null) MessageBox.Show("Copying the footage stopped: " + error, "Limelight", MessageBoxButtons.OK, MessageBoxIcon.Warning, MessageBoxDefaultButton.Button1, MessageBoxOptions.DefaultDesktopOnly);
            return ok;
        }
    }

}
