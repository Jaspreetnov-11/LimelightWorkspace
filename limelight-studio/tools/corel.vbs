' corel.vbs - Limelight Studio's CorelDRAW bridge (server.mjs /api/convert). Opens a design's SVG in CorelDRAW on this PC
' (hidden) and saves it as a real CorelDRAW file, an Illustrator file and a vector PDF: text stays text in its font,
' shapes stay shapes, photos stay photos. The page is sized to the design (the SVG carries its size in inches).
'   cscript //nologo corel.vbs <design.svg | pages.list> <out base path, no extension> <cdr,ai,pdf>
' A .list file (UTF-16, one SVG path per line) makes one document with a page for each SVG - a book.
' Prints one line per format: "ok <ext> <file>" or "fail <ext> <why>".
Option Explicit
Dim src, base, want, app, doc, so, eo, po, ex, fso, lf, svgs, n
src = WScript.Arguments(0) : base = WScript.Arguments(1) : want = "," & LCase(WScript.Arguments(2)) & ","
Set fso = CreateObject("Scripting.FileSystemObject")
If LCase(Right(src, 5)) = ".list" Then
  Set lf = fso.OpenTextFile(src, 1, False, -1)
  svgs = Split(Replace(lf.ReadAll, vbCr, ""), vbLf) : lf.Close
Else
  svgs = Array(src)
End If
Set app = CreateObject("CorelDRAW.Application")
app.Visible = False
On Error Resume Next
Set doc = app.CreateDocument()
doc.Unit = 3 ' (millimetres)
For n = 0 To UBound(svgs)
  If svgs(n) <> "" Then
    If n > 0 Then doc.AddPages 1 : doc.Pages(doc.Pages.Count).Activate
    If Not PlacePage(svgs(n)) Then WScript.Echo "fail all CorelDRAW could not read page " & (n + 1) & ": " & Err.Description : doc.Close : WScript.Quit 1
  End If
Next
doc.Pages(1).Activate
Err.Clear

If InStr(want, ",cdr,") Then
  Set so = app.CreateStructSaveAsOptions
  doc.SaveAs CStr(base & ".cdr"), so
  Report "cdr", base & ".cdr"
End If
If InStr(want, ",ai,") Then
  Set eo = app.CreateStructExportOptions : Set po = app.CreateStructPaletteOptions
  Set ex = doc.ExportEx(CStr(base & ".ai"), 1305, 1, eo, po) ' (1305: Adobe Illustrator)
  If Err.Number = 0 Then ex.Finish
  Report "ai", base & ".ai"
End If
If InStr(want, ",pdf,") Then
  doc.PublishToPDF CStr(base & ".pdf")
  Report "pdf", base & ".pdf"
End If
doc.Close

' one SVG onto the active page: imported, taken apart, fonts set, the page sized to the design's background
Function PlacePage(svg)
  Dim io, ix, bg, dx, dy, k, ff, fl, texts, t, parts, i, pg
  Set pg = doc.ActivePage
  Set io = app.CreateStructImportOptions
  Set ix = doc.ActiveLayer.ImportEx(CStr(svg), 0, io)
  If Err.Number = 0 Then ix.Finish
  If Err.Number <> 0 Then PlacePage = False : Exit Function
  ' (the import comes as groups in groups - the design, then one around every object: all taken apart, so each object
  ' is its own in CorelDRAW / Illustrator; the empty helpers the import leaves are deleted)
  pg.Shapes.All.UngroupAll
  For k = pg.Shapes.Count To 1 Step -1
    If pg.Shapes(k).Type = 0 Then pg.Shapes(k).Locked = False : pg.Shapes(k).Delete
  Next
  ' fonts: CorelDRAW's SVG reader knows only normal / bold - each text gets its own weight's font after the import, from
  ' <design.svg>.fonts.txt (server.mjs corelFonts: "font|bold|italic" per text, in the SVG's order - the last on top)
  If fso.FileExists(svg & ".fonts.txt") Then
    Set ff = fso.OpenTextFile(svg & ".fonts.txt", 1, False, -1)
    fl = Split(Replace(ff.ReadAll, vbCr, ""), vbLf) : ff.Close
    Set texts = CreateObject("Scripting.Dictionary")
    For k = pg.Shapes.Count To 1 Step -1
      If pg.Shapes(k).Type = 6 Then texts.Add texts.Count, pg.Shapes(k)
    Next
    If texts.Count = UBound(fl) + 1 Then
      For i = 0 To texts.Count - 1
        If fl(i) <> "" Then
          parts = Split(fl(i), "|") : Set t = texts(i).Text.Story
          t.Font = parts(0) : t.Bold = (parts(1) = "1") : t.Italic = (parts(2) = "1")
        End If
      Next
    End If
  End If
  Err.Clear
  ' the page: the design's own background (the bottom-most object) - sized to it, everything moved onto it
  Set bg = pg.Shapes(pg.Shapes.Count)
  pg.SetSize bg.SizeWidth, bg.SizeHeight
  dx = -bg.LeftX : dy = bg.SizeHeight - bg.TopY
  pg.Shapes.All.Move dx, dy
  Err.Clear
  PlacePage = True
End Function

Sub Report(e, f)
  If Err.Number <> 0 Then WScript.Echo "fail " & e & " " & Err.Description Else WScript.Echo "ok " & e & " " & f
  Err.Clear
End Sub
