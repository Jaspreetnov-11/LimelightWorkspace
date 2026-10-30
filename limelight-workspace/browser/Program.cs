// Lighthouse.exe - Limelight's own window for the Lighthouse workspace (all apps, one login), like Limelight Editor.exe
// is for the editor. WebView2 with its own data folder (%LOCALAPPDATA%\Limelight Lighthouse): the sign-in and theme stay
// in this window. When the workspace does not answer on this PC it starts server.mjs (hidden) and waits for it.
// Links to other sites open in the PC's normal browser. Settings: Lighthouse.json next to the exe.
// No Windows title bar: the page's own glass top bar is the title bar (CSS app-region: drag, WebView2 non-client
// regions) and draws the minimise / maximise / close buttons, which post "min" / "max" / "close" here.
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Runtime.InteropServices;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Lighthouse
{
    [DataContract]
    class Settings
    {
        [DataMember(Name = "url")] public string Url = "http://localhost:3350/";
        [DataMember(Name = "serverDir")] public string ServerDir = @"E:\Limelight Ai\limelight-workspace";
        // the newest app, on the NAS: every start looks there and updates itself (no reinstall on any PC)
        [DataMember(Name = "updateDir")] public string UpdateDir = @"\\192.168.0.99\Team Editing\Limelight Apps\Limelight Workspace";
        // 🏢 in the office: the hub straight over the office network (Edit's video does not go out to the internet and back).
        // Tried first when url is the online address; not answering (outside the office) = url. "" = never.
        [DataMember(Name = "officeUrl")] public string OfficeUrl;
        public const string DefaultOfficeUrl = "http://192.168.0.210:3350/";
        // 🔒 the same hub over https (real certificate for office.limelightcorp.net -> 192.168.0.210): tried before the
        // plain address, so passwords and chats are encrypted on the office Wi-Fi too
        public const string DefaultOfficeSecureUrl = "https://office.limelightcorp.net:3350/";

        public static Settings Load()
        {
            var f = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Lighthouse.json");
            try { using (var s = File.OpenRead(f)) return (Settings)new DataContractJsonSerializer(typeof(Settings)).ReadObject(s); }
            catch { return new Settings(); }
        }
    }

    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            // 🎬 limelight:// links (Edit's Open in Premiere / Open in DaVinci) come to this exe now - Limelight Editor.exe is
            // not needed any more. Pointed at wherever this exe is, on every start.
            try
            {
                var exe = Application.ExecutablePath;
                using (var k = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(@"Software\Classes\limelight"))
                {
                    k.SetValue("", "URL:Limelight"); k.SetValue("URL Protocol", "");
                    using (var i = k.CreateSubKey("DefaultIcon")) i.SetValue("", "\"" + exe + "\",0");
                    using (var c = k.CreateSubKey(@"shell\open\command")) c.SetValue("", "\"" + exe + "\" \"%1\"");
                }
            }
            catch { }
            foreach (var a in args)
                if (a.StartsWith("limelight://nle/", StringComparison.OrdinalIgnoreCase)) { Nle.Open(a); return; }
            var settings = Settings.Load();
            if (!args.Contains("--no-update") && Updater.Start(settings.UpdateDir)) return; // (a newer copy on the NAS: it takes over)
            // (the json does not set fields it leaves out: no officeUrl at all = the office hub)
            var office = settings.OfficeUrl ?? Settings.DefaultOfficeUrl;
            var online = Uri.TryCreate(settings.Url, UriKind.Absolute, out var su) && su.Host != "localhost" && su.Host != "127.0.0.1";
            if (online && office != "")
            {
                // (only the default office address gets the https try; a custom officeUrl is used as written)
                if (settings.OfficeUrl == null && MainWindow.Answers(Settings.DefaultOfficeSecureUrl, 1200)) settings.Url = Settings.DefaultOfficeSecureUrl;
                else if (MainWindow.Answers(office, 1200)) settings.Url = office;
            }
            Application.Run(new MainWindow(settings));
        }
    }

    class MainWindow : Form
    {
        readonly Settings s;
        readonly WebView2 web = new WebView2 { Dock = DockStyle.Fill };

        public MainWindow(Settings settings)
        {
            s = settings;
            Text = "Limelight";
            BackColor = Color.FromArgb(7, 7, 12);
            WindowState = FormWindowState.Maximized;
            MinimumSize = new Size(1024, 640);
            // (every size of the icon, so the taskbar shows the sharp one)
            try { var ico = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app.ico"); Icon = File.Exists(ico) ? new Icon(ico) : Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            KeyPreview = true;
            KeyDown += (o, e) => { if (e.KeyCode == Keys.F11) ToggleFullScreen(); };
            Controls.Add(web);
            Load += async (o, e) => await Start();
            Resize += (o, e) =>
            {
                // a thin edge stays outside the page so the window can still be resized by its borders
                Padding = WindowState == FormWindowState.Maximized || full ? new Padding(0) : new Padding(Edge);
                try { web.CoreWebView2?.PostWebMessageAsString(WindowState == FormWindowState.Maximized ? "max:1" : "max:0"); } catch { }
            };
        }

        const int Edge = 5;
        [DllImport("user32.dll")] static extern int GetSystemMetrics(int i);
        [StructLayout(LayoutKind.Sequential)] struct RECT { public int left, top, right, bottom; }

        protected override void WndProc(ref Message m)
        {
            const int WM_NCCALCSIZE = 0x83, WM_NCHITTEST = 0x84;
            if (m.Msg == WM_NCCALCSIZE && m.WParam != IntPtr.Zero)
            {
                // the whole window is client area (no caption); maximised, keep it inside the screen
                if (WindowState == FormWindowState.Maximized && !full)
                {
                    var r = Marshal.PtrToStructure<RECT>(m.LParam);
                    int b = GetSystemMetrics(32) + GetSystemMetrics(92); // SM_CXFRAME + SM_CXPADDEDBORDER
                    r.left += b; r.top += b; r.right -= b; r.bottom -= b;
                    Marshal.StructureToPtr(r, m.LParam, false);
                }
                m.Result = IntPtr.Zero;
                return;
            }
            base.WndProc(ref m);
            if (m.Msg == WM_NCHITTEST && WindowState == FormWindowState.Normal && !full)
            {
                var pt = PointToClient(new Point((short)(m.LParam.ToInt64() & 0xFFFF), (short)((m.LParam.ToInt64() >> 16) & 0xFFFF)));
                bool l = pt.X < Edge, r = pt.X >= ClientSize.Width - Edge, t = pt.Y < Edge, b = pt.Y >= ClientSize.Height - Edge;
                int hit = t && l ? 13 : t && r ? 14 : b && l ? 16 : b && r ? 17 : l ? 10 : r ? 11 : t ? 12 : b ? 15 : 0;
                if (hit != 0) m.Result = (IntPtr)hit;
            }
        }

        // dark title bar (Windows 10/11), same near-black as the workspace
        [System.Runtime.InteropServices.DllImport("dwmapi.dll")]
        static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);
        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            void set(int attr, int v) { try { DwmSetWindowAttribute(Handle, attr, ref v, 4); } catch { } }
            set(20, 1);          // DWMWA_USE_IMMERSIVE_DARK_MODE
            set(35, 0x000C0707); // DWMWA_CAPTION_COLOR (0x00BBGGRR) = #07070C
            set(34, 0x000C0707); // DWMWA_BORDER_COLOR
            set(36, 0x00F7F7F7); // DWMWA_TEXT_COLOR
        }

        bool full; FormWindowState before;
        void ToggleFullScreen()
        {
            full = !full;
            // (the Windows taskbar stays: full screen fills the screen's working area, not the whole screen)
            if (full) { before = WindowState; MaximizedBounds = Screen.FromHandle(Handle).WorkingArea; FormBorderStyle = FormBorderStyle.None; WindowState = FormWindowState.Normal; WindowState = FormWindowState.Maximized; }
            else { FormBorderStyle = FormBorderStyle.Sizable; WindowState = before; }
        }

        public static bool Answers(string url, int timeout = 2000)
        {
            try
            {
                // (localhost may resolve to ::1 first, but the server listens on 127.0.0.1)
                var b = new UriBuilder(new Uri(new Uri(url), "/api/health"));
                if (b.Host == "localhost") b.Host = "127.0.0.1";
                var r = (HttpWebRequest)WebRequest.Create(b.Uri);
                r.Timeout = timeout;
                using (var res = (HttpWebResponse)r.GetResponse()) return res.StatusCode == HttpStatusCode.OK;
            }
            catch { return false; }
        }

        // nothing on this PC answers: start the workspace server hidden (only for a localhost address)
        bool StartServer()
        {
            var host = new Uri(s.Url).Host;
            if (host != "localhost" && host != "127.0.0.1") return false;
            if (!File.Exists(Path.Combine(s.ServerDir, "server.mjs"))) return false;
            try
            {
                Process.Start(new ProcessStartInfo("node", "server.mjs") { WorkingDirectory = s.ServerDir, UseShellExecute = false, CreateNoWindow = true });
                return true;
            }
            catch { return false; }
        }

        const string Waiting = "<html><body style='margin:0;height:100vh;display:grid;place-content:center;background:#07070c;color:#ffffffa6;font:15px Segoe UI'>" +
            "<div style='text-align:center'><div style='color:#fff;font-size:22px;font-weight:600;margin-bottom:6px'>Limelight</div>{0}</div></body></html>";

        async Task Start()
        {
            // own data folder per address, so the hub's local window and an online copy can run side by side
            var host = new Uri(s.Url).Host;
            var data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                host == "localhost" || host == "127.0.0.1" ? "Limelight Lighthouse" : "Limelight Lighthouse (" + host + ")");
            var env = await CoreWebView2Environment.CreateAsync(null, data);
            await web.EnsureCoreWebView2Async(env);
            var cw = web.CoreWebView2;
            cw.Settings.IsStatusBarEnabled = false;
            cw.Settings.AreDevToolsEnabled = false;
            cw.Settings.IsNonClientRegionSupportEnabled = true; // the page's top bar drags the window (app-region: drag)
            cw.WebMessageReceived += (o, e) =>
            {
                string msg; try { msg = e.TryGetWebMessageAsString(); } catch { return; }
                if (msg == "min") WindowState = FormWindowState.Minimized;
                if (msg == "max") WindowState = WindowState == FormWindowState.Maximized ? FormWindowState.Normal : FormWindowState.Maximized;
                if (msg == "close") Close();
                if (msg == "full") ToggleFullScreen();
            };
            cw.NavigationCompleted += (o, e) => { try { cw.PostWebMessageAsString(WindowState == FormWindowState.Maximized ? "max:1" : "max:0"); } catch { } };
            cw.DocumentTitleChanged += (o, e) => Text = string.IsNullOrEmpty(cw.DocumentTitle) ? "Limelight" : cw.DocumentTitle;
            var home = new Uri(s.Url);
            // the workspace and its app hosts (www.limelightcorp.net -> limelightcorp.net, lh-*.limelightcorp.net) stay in here
            var root = home.Host.StartsWith("www.") ? home.Host.Substring(4) : home.Host;
            bool local(Uri u) => u.Host == root || u.Host.EndsWith("." + root) || u.Host == "localhost" || u.Host == "127.0.0.1"
                || u.Host == "limelightcorp.net" || u.Host.EndsWith(".limelightcorp.net");   // (office.* over https, www.* online)
            // other sites (and "Alag window" popups) open in the PC's normal browser
            cw.NewWindowRequested += (o, e) => { e.Handled = true; try { Process.Start(e.Uri); } catch { } };
            cw.NavigationStarting += (o, e) =>
            {
                if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var u) || u.Scheme == "about" || u.Scheme == "data") return;
                if (!local(u)) { e.Cancel = true; try { Process.Start(e.Uri); } catch { } }
            };

            if (!await Task.Run(() => Answers(s.Url)))
            {
                cw.NavigateToString(string.Format(Waiting, "Limelight chalu ho raha hai…"));
                var started = StartServer();
                for (var i = 0; i < 40 && !await Task.Run(() => Answers(s.Url)); i++) await Task.Delay(500);
                if (!await Task.Run(() => Answers(s.Url)))
                {
                    cw.NavigateToString(string.Format(Waiting, started ? "Server shuru nahi hua. Node.js aur server.mjs check karein." :
                        "Limelight server nahi mila (" + WebUtility.HtmlEncode(s.Url) + ")."));
                    return;
                }
            }
            cw.Navigate(s.Url);
        }
    }
}
