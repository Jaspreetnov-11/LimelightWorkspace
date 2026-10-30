# office.ps1 - drives the installed Microsoft Word / Excel / PowerPoint (COM) for Limelight Office.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File office.ps1 <job.json> <result.json>
# job.action: word | excel | ppt | pdf | read   (see engine/office.mjs for the fields)
param([string]$JobFile, [string]$ResultFile)
$ErrorActionPreference = 'Stop'
$job = [IO.File]::ReadAllText($JobFile, [Text.Encoding]::UTF8) | ConvertFrom-Json
$result = @{ ok = $true }
# Excel / Word started here can stay alive in the background after Quit (COM references); they are closed at the end
$before = @(Get-Process EXCEL, WINWORD, POWERPNT -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })

function Release($o) { if ($o) { try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($o) } catch {} } }
function Bgr([string]$hex) { $h = $hex.TrimStart('#'); return [Convert]::ToInt32($h.Substring(4,2) + $h.Substring(2,2) + $h.Substring(0,2), 16) }

function Do-Word {
  $w = New-Object -ComObject Word.Application
  $w.Visible = $false; $w.DisplayAlerts = 0
  try {
    $doc = $w.Documents.Add()
    $normal = $doc.Styles.Item(-1)
    $normal.Font.Name = 'Calibri'; $normal.Font.Size = 11; $normal.Font.NameBi = 'Nirmala UI'
    $sel = $w.Selection
    # built-in style ids (language independent): Title -63, H1 -2, H2 -3, H3 -4, Normal -1, List Bullet -49, List Number -50, Quote -181
    $styles = @{ title = -63; h1 = -2; h2 = -3; h3 = -4; p = -1; bullet = -49; number = -50; quote = -181 }
    if ($job.title) { $sel.Style = $doc.Styles.Item(-63); $sel.TypeText([string]$job.title); $sel.TypeParagraph() }
    foreach ($b in $job.blocks) {
      if ($b.type -eq 'table' -and $b.rows) {
        $rows = @($b.rows); $cols = @($rows[0]).Count
        $sel.Style = $doc.Styles.Item(-1)
        $t = $doc.Tables.Add($sel.Range, $rows.Count, $cols)
        $t.Borders.Enable = $true
        for ($r = 0; $r -lt $rows.Count; $r++) { for ($c = 0; $c -lt $cols; $c++) { $t.Cell($r + 1, $c + 1).Range.Text = [string](@($rows[$r])[$c]) } }
        $t.Rows.Item(1).Range.Font.Bold = $true
        $t.Rows.Item(1).Shading.BackgroundPatternColor = (Bgr 'F2F2F2')
        $sel.EndKey(6) | Out-Null; $sel.TypeParagraph()
        continue
      }
      $id = $styles[[string]$b.type]; if (-not $id) { $id = -1 }
      $sel.Style = $doc.Styles.Item($id)
      $sel.TypeText([string]$b.text); $sel.TypeParagraph()
    }
    $doc.SaveAs2([string]$job.out, 16)
    if ($job.pdf) { $pdf = [IO.Path]::ChangeExtension($job.out, '.pdf'); $doc.ExportAsFixedFormat($pdf, 17); $result.pdf = $pdf }
    $doc.Close($false); Release $doc
  } finally { if ($w.Documents.Count -eq 0) { $w.Quit() }; Release $w }
  $result.file = $job.out
}

function Do-Excel {
  $x = New-Object -ComObject Excel.Application
  $x.Visible = $false; $x.DisplayAlerts = $false
  try {
    $wb = $x.Workbooks.Add()
    $sheets = @($job.sheets)
    while ($wb.Worksheets.Count -lt $sheets.Count) { [void]$wb.Worksheets.Add([Type]::Missing, $wb.Worksheets.Item($wb.Worksheets.Count)) }
    for ($i = 0; $i -lt $sheets.Count; $i++) {
      $s = $sheets[$i]; $ws = $wb.Worksheets.Item($i + 1)
      if ($s.name) { $ws.Name = ([string]$s.name).Substring(0, [Math]::Min(31, ([string]$s.name).Length)) }
      $rows = @($s.rows); if ($rows.Count -eq 0) { continue }
      $cols = ($rows | ForEach-Object { @($_).Count } | Measure-Object -Maximum).Maximum
      $arr = New-Object 'object[,]' $rows.Count, $cols
      for ($r = 0; $r -lt $rows.Count; $r++) {
        $row = @($rows[$r])
        for ($c = 0; $c -lt $row.Count; $c++) { $arr[$r, $c] = $row[$c] }
      }
      $rng = $ws.Range($ws.Cells.Item(1, 1), $ws.Cells.Item($rows.Count, $cols))
      $rng.Value2 = $arr
      $rng.Font.Name = 'Calibri'
      $head = $ws.Range($ws.Cells.Item(1, 1), $ws.Cells.Item(1, $cols))
      $head.Font.Bold = $true; $head.Interior.Color = (Bgr '111111'); $head.Font.Color = (Bgr 'FFC21A')
      if ($rows.Count -gt 1) { [void]$rng.AutoFilter() }
      $rng.Borders.Color = (Bgr 'D9D9D9')
      [void]$ws.UsedRange.Columns.AutoFit()
    }
    [void]$wb.Worksheets.Item(1).Activate()
    $wb.SaveAs([string]$job.out, 51)
    if ($job.pdf) { $pdf = [IO.Path]::ChangeExtension($job.out, '.pdf'); $wb.ExportAsFixedFormat(0, $pdf); $result.pdf = $pdf }
    $wb.Close($false); Release $wb
  } finally { if ($x.Workbooks.Count -eq 0) { $x.Quit() }; Release $x }
  $result.file = $job.out
}

function Do-Ppt {
  $p = New-Object -ComObject PowerPoint.Application
  try {
    $pres = $p.Presentations.Add(0)   # no window
    $pres.PageSetup.SlideSize = 15    # 16:9 widescreen
    $dark = ($job.theme -ne 'plain')
    $bg = Bgr '0A0A0A'; $fg = Bgr 'F7F7F8'; $acc = Bgr 'FFC21A'
    function Style-Slide($s, $isTitle) {
      if (-not $dark) { return }
      $s.FollowMasterBackground = 0
      $s.Background.Fill.Solid(); $s.Background.Fill.ForeColor.RGB = $bg
      $n = 0
      foreach ($sh in $s.Shapes) {
        $n++
        if ($sh.HasTextFrame) {
          $tr = $sh.TextFrame.TextRange; $tr.Font.Name = 'Segoe UI'; $tr.Font.NameComplexScript = 'Nirmala UI'
          if ($n -eq 1) { $tr.Font.Color.RGB = $acc; $tr.Font.Bold = $true } else { $tr.Font.Color.RGB = $fg }
        }
      }
    }
    $i = 1
    if ($job.title) {
      $s = $pres.Slides.Add($i, 1); $i++
      $s.Shapes.Item(1).TextFrame.TextRange.Text = [string]$job.title
      $s.Shapes.Item(2).TextFrame.TextRange.Text = [string]$job.subtitle
      Style-Slide $s $true
    }
    foreach ($sl in $job.slides) {
      $s = $pres.Slides.Add($i, 2); $i++
      $s.Shapes.Item(1).TextFrame.TextRange.Text = [string]$sl.title
      $s.Shapes.Item(2).TextFrame.TextRange.Text = (@($sl.bullets) | ForEach-Object { [string]$_ }) -join "`r"
      if ($sl.notes) { $s.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text = [string]$sl.notes }
      Style-Slide $s $false
    }
    $pres.SaveAs([string]$job.out, 24)
    if ($job.pdf) { $pdf = [IO.Path]::ChangeExtension($job.out, '.pdf'); $pres.SaveAs($pdf, 32); $result.pdf = $pdf }
    $pres.Close(); Release $pres
  } finally { if ($p.Presentations.Count -eq 0) { $p.Quit() }; Release $p }
  $result.file = $job.out
}

function Do-Pdf {
  $in = [string]$job.in; $out = [IO.Path]::ChangeExtension($in, '.pdf')
  $ext = [IO.Path]::GetExtension($in).ToLower()
  if ($ext -in '.doc', '.docx', '.rtf', '.odt', '.txt') {
    $w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0
    try { $d = $w.Documents.Open($in, $false, $true); $d.ExportAsFixedFormat($out, 17); $d.Close($false) } finally { if ($w.Documents.Count -eq 0) { $w.Quit() }; Release $w }
  } elseif ($ext -in '.xls', '.xlsx', '.xlsm', '.csv') {
    $x = New-Object -ComObject Excel.Application; $x.Visible = $false; $x.DisplayAlerts = $false
    try { $b = $x.Workbooks.Open($in, 0, $true); $b.ExportAsFixedFormat(0, $out); $b.Close($false) } finally { if ($x.Workbooks.Count -eq 0) { $x.Quit() }; Release $x }
  } elseif ($ext -in '.ppt', '.pptx') {
    $p = New-Object -ComObject PowerPoint.Application
    try { $pr = $p.Presentations.Open($in, -1, 0, 0); $pr.SaveAs($out, 32); $pr.Close() } finally { if ($p.Presentations.Count -eq 0) { $p.Quit() }; Release $p }
  } else { throw "Cannot convert $ext to PDF" }
  $result.file = $out
}

function Do-Read {
  $in = [string]$job.in; $ext = [IO.Path]::GetExtension($in).ToLower(); $text = ''
  if ($ext -in '.doc', '.docx', '.rtf', '.odt') {
    $w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0
    try { $d = $w.Documents.Open($in, $false, $true); $text = $d.Content.Text; $d.Close($false) } finally { if ($w.Documents.Count -eq 0) { $w.Quit() }; Release $w }
  } elseif ($ext -in '.xls', '.xlsx', '.xlsm') {
    $x = New-Object -ComObject Excel.Application; $x.Visible = $false; $x.DisplayAlerts = $false
    try {
      $b = $x.Workbooks.Open($in, 0, $true); $sb = New-Object Text.StringBuilder
      foreach ($ws in $b.Worksheets) {
        [void]$sb.AppendLine("## $($ws.Name)")
        $v = $ws.UsedRange.Value2
        if ($v -is [array]) {
          # Value2 is a 1-based [object[,]]: GetValue with its own bounds
          $r0 = $v.GetLowerBound(0); $c0 = $v.GetLowerBound(1)
          $rMax = [Math]::Min($v.GetUpperBound(0), $r0 + 499); $cMax = $v.GetUpperBound(1)
          for ($r = $r0; $r -le $rMax; $r++) { $cells = for ($c = $c0; $c -le $cMax; $c++) { [string]$v.GetValue($r, $c) }; [void]$sb.AppendLine(($cells -join "`t")) }
        } elseif ($v) { [void]$sb.AppendLine([string]$v) }
      }
      $text = $sb.ToString(); $b.Close($false)
    } finally { if ($x.Workbooks.Count -eq 0) { $x.Quit() }; Release $x }
  } elseif ($ext -in '.ppt', '.pptx') {
    $p = New-Object -ComObject PowerPoint.Application
    try {
      $pr = $p.Presentations.Open($in, -1, 0, 0); $sb = New-Object Text.StringBuilder
      foreach ($s in $pr.Slides) {
        [void]$sb.AppendLine("## Slide $($s.SlideIndex)")
        foreach ($sh in $s.Shapes) { if ($sh.HasTextFrame -and $sh.TextFrame.HasText) { [void]$sb.AppendLine($sh.TextFrame.TextRange.Text) } }
      }
      $text = $sb.ToString(); $pr.Close()
    } finally { if ($p.Presentations.Count -eq 0) { $p.Quit() }; Release $p }
  } else { $text = [IO.File]::ReadAllText($in, [Text.Encoding]::UTF8) }
  $result.text = (($text -replace "`r`n", "`n") -replace "`r", "`n")
}

# ---------- the in-app editors: Office file <-> editor data ----------
function Hex($bgr) { $n = [int]$bgr; return ('#{0:x2}{1:x2}{2:x2}' -f ($n -band 255), (($n -shr 8) -band 255), (($n -shr 16) -band 255)) }
function ColName([int]$n) { $s = ''; while ($n -gt 0) { $m = ($n - 1) % 26; $s = [char](65 + $m) + $s; $n = [int][Math]::Floor(($n - 1) / 26) }; return $s }

# Word: document -> filtered HTML (UTF-8) for the Document editor
function Do-DocOpen {
  $w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0
  try {
    $d = $w.Documents.Open([string]$job.in, $false, $true)
    $sec = $d.Sections.Item(1); $ps = $d.PageSetup
    $meta = @{ header = ''; footer = ''; pageNumbers = 0; columns = 1; landscape = 0; margin = '' }
    try { $meta.header = ([string]$sec.Headers.Item(1).Range.Text).Trim() } catch {}
    try { $f = $sec.Footers.Item(1); $meta.pageNumbers = [int]($f.PageNumbers.Count -gt 0); if (-not $meta.pageNumbers) { $meta.footer = ([string]$f.Range.Text).Trim() } } catch {}
    try { $meta.columns = [int]$ps.TextColumns.Count } catch {}
    if ($ps.Orientation -eq 1) { $meta.landscape = 1 }
    if ($ps.LeftMargin -lt 50) { $meta.margin = 'narrow' } elseif ($ps.LeftMargin -gt 100) { $meta.margin = 'wide' }
    $result.meta = $meta
    $d.WebOptions.Encoding = 65001
    $d.SaveAs2([string]$job.html, 10)
    $d.Close($false); Release $d
  } finally { if ($w.Documents.Count -eq 0) { $w.Quit() }; Release $w }
  $result.html = $job.html
}
# Word: editor HTML -> .docx (pictures embedded, A4, print layout)
function Do-DocSave {
  $w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0
  try {
    $d = $w.Documents.Open([string]$job.html, $false, $false, $false)
    foreach ($s in @($d.InlineShapes)) { try { if ($s.LinkFormat) { $s.LinkFormat.SavePictureWithDocument = $true; $s.LinkFormat.BreakLink() } } catch {} }
    $m = $job.meta
    $ps = $d.PageSetup; $ps.PageWidth = 595.3; $ps.PageHeight = 841.9
    if ($m -and $m.landscape) { $ps.Orientation = 1 }
    $lr = 72; $tb = 72; if ($m.margin -eq 'narrow') { $lr = 36; $tb = 36 } elseif ($m.margin -eq 'wide') { $lr = 144 }
    $ps.TopMargin = $tb; $ps.BottomMargin = $tb; $ps.LeftMargin = $lr; $ps.RightMargin = $lr
    if ($m -and [int]$m.columns -gt 1) { try { $ps.TextColumns.SetCount([int]$m.columns) } catch {} }
    $sec = $d.Sections.Item(1)
    if ($m -and $m.header) { $hr = $sec.Headers.Item(1).Range; $hr.Text = [string]$m.header; $hr.Font.Size = 9; $hr.Font.Color = 8421504 }
    if ($m -and $m.footer) { $fr = $sec.Footers.Item(1).Range; $fr.Text = [string]$m.footer; $fr.Font.Size = 9; $fr.Font.Color = 8421504 }
    if ($m -and $m.pageNumbers) { [void]$sec.Footers.Item(1).PageNumbers.Add(1, $true) }
    try { $d.ActiveWindow.View.Type = 3 } catch {}
    $d.SaveAs2([string]$job.out, 16)
    if ($job.pdf) { $pdf = [IO.Path]::ChangeExtension($job.out, '.pdf'); $d.ExportAsFixedFormat($pdf, 17); $result.pdf = $pdf }
    $d.Close($false); Release $d
  } finally { if ($w.Documents.Count -eq 0) { $w.Quit() }; Release $w }
  $result.file = $job.out
}

# Excel: workbook -> { sheets: [{ name, cells: { A1: { v, f, b, i, u, color, bg, al, nf } }, cols: { A: px } }] }
function Do-GridOpen {
  $x = New-Object -ComObject Excel.Application; $x.Visible = $false; $x.DisplayAlerts = $false
  try {
    $b = $x.Workbooks.Open([string]$job.in, 0, $true)
    $sheets = @()
    foreach ($ws in $b.Worksheets) {
      $ur = $ws.UsedRange; $top = $ur.Row; $left = $ur.Column
      $rowN = [Math]::Min($ur.Rows.Count, 2000); $colN = [Math]::Min($ur.Columns.Count, 80)
      $rng = $ws.Range($ws.Cells.Item($top, $left), $ws.Cells.Item($top + $rowN - 1, $left + $colN - 1))
      $fAll = $rng.Formula; $vAll = $rng.Value2
      $one = -not ($fAll -is [array])
      $readFmt = ($rowN * $colN) -le 6000
      $cells = @{}
      for ($ri = 1; $ri -le $rowN; $ri++) {
        for ($ci = 1; $ci -le $colN; $ci++) {
          if ($one) { $f = [string]$fAll; $v = $vAll } else { $f = [string]$fAll.GetValue($ri, $ci); $v = $vAll.GetValue($ri, $ci) }
          if ($f -eq '' -and $null -eq $v) { continue }
          $row = $top + $ri - 1; $col = $left + $ci - 1
          $c = @{}
          if ($f.StartsWith('=')) { $c.f = $f }
          if ($null -ne $v) { $c.v = $v }
          if ($readFmt) {
            $cl = $ws.Cells.Item($row, $col)
            if ($cl.Font.Bold) { $c.b = 1 }; if ($cl.Font.Italic) { $c.i = 1 }; if ($cl.Font.Underline -ne -4142 -and $cl.Font.Underline -ne $false) { $c.u = 1 }
            $fc = [int]$cl.Font.Color; if ($fc -ne 0) { $c.color = Hex $fc }
            if ($cl.Interior.ColorIndex -ne -4142) { $c.bg = Hex ([int]$cl.Interior.Color) }
            $ha = $cl.HorizontalAlignment; if ($ha -eq -4108) { $c.al = 'center' } elseif ($ha -eq -4152) { $c.al = 'right' } elseif ($ha -eq -4131) { $c.al = 'left' }
            if ($cl.NumberFormat -ne 'General') { $c.nf = [string]$cl.NumberFormat }
            $fn = [string]$cl.Font.Name; if ($fn -ne 'Calibri' -and $fn -ne 'Aptos Narrow') { $c.ff = $fn }
            if ([double]$cl.Font.Size -ne 11) { $c.fs = [double]$cl.Font.Size }
            if ($cl.WrapText -eq $true) { $c.wr = 1 }
            if ($cl.Borders.Item(9).LineStyle -ne -4142 -or $cl.Borders.Item(7).LineStyle -ne -4142) { $c.bd = 1 }
            if ($cl.MergeCells -eq $true -and $cl.MergeArea.Cells.Item(1, 1).Address($false, $false) -eq $cl.Address($false, $false)) { $c.mg = [string]$cl.MergeArea.Address($false, $false) }
          }
          $cells[(ColName $col) + $row] = $c
        }
      }
      $cols = @{}
      for ($ci = 1; $ci -le [Math]::Max($left + $colN - 1, 1); $ci++) {
        $wd = [double]$ws.Columns.Item($ci).ColumnWidth
        if ([Math]::Abs($wd - 8.43) -gt 0.2) { $cols[(ColName $ci)] = [int]($wd * 7 + 5) }
      }
      $extras = 0; try { $extras = [int]$ws.Shapes.Count } catch {}
      $sheets += @{ name = $ws.Name; cells = $cells; cols = $cols; extras = $extras }
    }
    $b.Close($false); Release $b
  } finally { if ($x.Workbooks.Count -eq 0) { $x.Quit() }; Release $x }
  $result.sheets = $sheets
}
# Excel: editor sheets -> .xlsx
function Do-GridSave {
  $x = New-Object -ComObject Excel.Application; $x.Visible = $false; $x.DisplayAlerts = $false
  try {
    $wb = $x.Workbooks.Add()
    $sheets = @($job.sheets)
    while ($wb.Worksheets.Count -lt $sheets.Count) { [void]$wb.Worksheets.Add([Type]::Missing, $wb.Worksheets.Item($wb.Worksheets.Count)) }
    while ($wb.Worksheets.Count -gt [Math]::Max(1, $sheets.Count)) { $wb.Worksheets.Item($wb.Worksheets.Count).Delete() }
    for ($si = 0; $si -lt $sheets.Count; $si++) {
      $s = $sheets[$si]; $ws = $wb.Worksheets.Item($si + 1)
      if ($s.name) { $ws.Name = ([string]$s.name).Substring(0, [Math]::Min(31, ([string]$s.name).Length)) }
      if ($s.cells) {
        foreach ($p in $s.cells.PSObject.Properties) {
          $c = $p.Value; $rg = $ws.Range($p.Name)
          if ($c.f) { $rg.Formula = [string]$c.f } elseif ($null -ne $c.v -and [string]$c.v -ne '') { if ($c.v -is [string]) { $rg.Value2 = [string]$c.v } elseif ($c.v -is [bool]) { $rg.Value2 = [bool]$c.v } else { $rg.Value2 = [double]$c.v } }
          if ($c.b) { $rg.Font.Bold = $true }; if ($c.i) { $rg.Font.Italic = $true }; if ($c.u) { $rg.Font.Underline = 2 }
          if ($c.color) { $rg.Font.Color = (Bgr $c.color) }
          if ($c.bg) { $rg.Interior.Color = (Bgr $c.bg) }
          if ($c.al -eq 'center') { $rg.HorizontalAlignment = -4108 } elseif ($c.al -eq 'right') { $rg.HorizontalAlignment = -4152 } elseif ($c.al -eq 'left') { $rg.HorizontalAlignment = -4131 }
          if ($c.nf) { $rg.NumberFormat = [string]$c.nf }
          if ($c.ff) { $rg.Font.Name = [string]$c.ff }; if ($c.fs) { $rg.Font.Size = [double]$c.fs }
          if ($c.wr) { $rg.WrapText = $true }
          if ($c.bd) { $rg.Borders.LineStyle = 1; $rg.Borders.Color = 10921638 }
          if ($c.mg) { $mr = $ws.Range([string]$c.mg); $mr.Merge(); $mr.HorizontalAlignment = -4108; $mr.VerticalAlignment = -4108 }
        }
      }
      foreach ($cf in @($s.cf)) {
        if (-not $cf) { continue }
        $op = @{ gt = 5; lt = 6; eq = 3; ge = 7; le = 8 }[[string]$cf.op]
        try { $fc = $ws.Range([string]$cf.range).FormatConditions.Add(1, $op, [string]$cf.value); $fc.Interior.Color = (Bgr ([string]$cf.color)) } catch {}
      }
      foreach ($ch in @($s.charts)) {
        if (-not $ch) { continue }
        $t = @{ bar = 51; hbar = 57; line = 4; pie = 5 }[[string]$ch.type]
        try {
          $co = $ws.Shapes.AddChart2(-1, $t, [double]$ch.x * 0.75, [double]$ch.y * 0.75, [double]$ch.w * 0.75, [double]$ch.h * 0.75).Chart
          $co.SetSourceData($ws.Range([string]$ch.range))
          if ($ch.title) { $co.HasTitle = $true; $co.ChartTitle.Text = [string]$ch.title }
        } catch {}
      }
      if ($s.filter) { try { [void]$ws.UsedRange.AutoFilter() } catch {} }
      if ($s.freeze) { try { [void]$ws.Activate(); $win = $wb.Windows.Item(1); $win.FreezePanes = $false; $win.SplitRow = [int]$s.freeze.r; $win.SplitColumn = [int]$s.freeze.c; $win.FreezePanes = $true } catch {} }
      if ($s.cols) { foreach ($p in $s.cols.PSObject.Properties) { $ws.Columns.Item([string]$p.Name).ColumnWidth = [Math]::Max(1, ([double]$p.Value - 5) / 7) } }
    }
    [void]$wb.Worksheets.Item(1).Activate()
    $wb.SaveAs([string]$job.out, 51)
    if ($job.pdf) { $pdf = [IO.Path]::ChangeExtension($job.out, '.pdf'); $wb.ExportAsFixedFormat(0, $pdf); $result.pdf = $pdf }
    $wb.Close($false); Release $wb
  } finally { if ($x.Workbooks.Count -eq 0) { $x.Quit() }; Release $x }
  $result.file = $job.out
}

# PowerPoint: deck -> { slides: [{ bg, notes, items: [{ type: text|shape|image, x, y, w, h, ... }] }] } on a 960x540 canvas
function Do-SlidesOpen {
  $p = New-Object -ComObject PowerPoint.Application
  try {
    $pr = $p.Presentations.Open([string]$job.in, -1, 0, 0)
    $sx = 960 / $pr.PageSetup.SlideWidth; $sy = 540 / $pr.PageSetup.SlideHeight
    $slides = @(); $n = 0
    foreach ($s in $pr.Slides) {
      $n++; $items = @(); $k = 0
      foreach ($sh in $s.Shapes) {
        $k++
        $it = @{ x = [Math]::Round($sh.Left * $sx); y = [Math]::Round($sh.Top * $sy); w = [Math]::Round($sh.Width * $sx); h = [Math]::Round($sh.Height * $sy) }
        $isPic = ($sh.Type -eq 13)
        try { if ($sh.Type -eq 14 -and $sh.PlaceholderFormat.ContainedType -eq 13) { $isPic = $true } } catch {}
        $simple = (-not $isPic) -and $sh.HasTextFrame -and ($sh.Type -in 1, 14, 17)
        $isTable = $false; try { $isTable = [bool]$sh.HasTable } catch {}
        if ($isTable) {
          $tb = $sh.Table; $rows = @()
          for ($ri = 1; $ri -le $tb.Rows.Count; $ri++) { $row = @(); for ($ci = 1; $ci -le $tb.Columns.Count; $ci++) { $row += ([string]$tb.Cell($ri, $ci).Shape.TextFrame.TextRange.Text) }; $rows += ,$row }
          $it.type = 'table'; $it.rows = $rows; $it.size = [Math]::Round([double]$tb.Cell(1, 1).Shape.TextFrame.TextRange.Font.Size * $sx)
          $items += $it; continue
        }
        if ($sh.Type -eq 9) {
          $it.type = 'line'; $it.color = Hex ([int]$sh.Line.ForeColor.RGB); $it.weight = [double]$sh.Line.Weight
          if ($sh.HorizontalFlip) { $it.flip = 1 }
          $items += $it; continue
        }
        if ($simple) {
          $tr = $sh.TextFrame.TextRange
          $fillOn = $false; try { $fillOn = ($sh.Type -eq 1 -and $sh.Fill.Visible -eq -1) } catch {}
          if (-not $sh.TextFrame.HasText -and -not $fillOn) { continue }
          $it.type = if ($fillOn) { 'shape' } else { 'text' }
          $it.text = ([string]$tr.Text) -replace "`r", "`n" -replace [char]11, "`n"
          $f = $tr.Font; if ($sh.TextFrame.HasText) { $f = $tr.Characters(1, 1).Font }
          $it.size = [Math]::Round([double]$f.Size * $sx); $it.font = [string]$f.Name
          if ($f.Bold -eq -1) { $it.bold = 1 }; if ($f.Italic -eq -1) { $it.italic = 1 }
          $it.color = Hex ([int]$f.Color.RGB)
          $al = $tr.ParagraphFormat.Alignment; $it.align = if ($al -eq 2) { 'center' } elseif ($al -eq 3) { 'right' } else { 'left' }
          try { if ($tr.ParagraphFormat.Bullet.Visible -eq -1) { $it.bullets = 1 } } catch {}
          if ($fillOn) { $it.fill = Hex ([int]$sh.Fill.ForeColor.RGB); $ast = $sh.AutoShapeType; $it.shape = if ($ast -eq 9) { 'oval' } elseif ($ast -eq 5) { 'round' } elseif ($ast -eq 7) { 'tri' } elseif ($ast -eq 33) { 'arrow' } elseif ($ast -eq 92) { 'star' } else { 'rect' } }
          try { if ($f.Underline -eq -1) { $it.underline = 1 } } catch {}
        } else {
          # pictures, tables, charts, groups: kept as a picture of the shape
          $png = Join-Path ([string]$job.media) "s$n-$k.png"
          try { $sh.Export($png, 2); $it.type = 'image'; $it.file = $png } catch { continue }
        }
        $items += $it
      }
      $bg = '#ffffff'; try { $bg = Hex ([int]$s.Background.Fill.ForeColor.RGB) } catch {}
      $notes = ''; try { $notes = [string]$s.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text } catch {}
      $slides += @{ bg = $bg; notes = $notes; items = $items }
    }
    $pr.Close(); Release $pr
  } finally { if ($p.Presentations.Count -eq 0) { $p.Quit() }; Release $p }
  $result.slides = $slides
}
# PowerPoint: editor slides -> .pptx (16:9, 960x540 pt)
function Do-SlidesSave {
  $p = New-Object -ComObject PowerPoint.Application
  try {
    $pres = $p.Presentations.Add(0)
    $pres.PageSetup.SlideWidth = 960; $pres.PageSetup.SlideHeight = 540
    $i = 0
    foreach ($sl in @($job.slides)) {
      $i++; $s = $pres.Slides.Add($i, 12)
      $s.FollowMasterBackground = 0; $s.Background.Fill.Solid(); $s.Background.Fill.ForeColor.RGB = (Bgr ([string]$sl.bg))
      if ($sl.bgFile) { try { $s.Background.Fill.UserPicture([string]$sl.bgFile) } catch {} }
      foreach ($it in @($sl.items)) {
        $x = [double]$it.x; $y = [double]$it.y; $wd = [Math]::Max(4, [double]$it.w); $ht = [Math]::Max(4, [double]$it.h)
        if ($it.type -eq 'image') { $sh = $s.Shapes.AddPicture([string]$it.file, 0, -1, $x, $y, $wd, $ht); continue }
        if ($it.type -eq 'line') {
          $x2 = $x + [double]$it.w; $y2 = $y + [double]$it.h
          $sh = if ($it.flip) { $s.Shapes.AddLine($x, $y2, $x2, $y) } else { $s.Shapes.AddLine($x, $y, $x2, $y2) }
          $sh.Line.ForeColor.RGB = (Bgr ([string]$it.color)); $sh.Line.Weight = [Math]::Max(0.5, [double]$it.weight); continue
        }
        if ($it.type -eq 'table') {
          $rows = @($it.rows); $nr = $rows.Count; $nc = @($rows[0]).Count
          $tsh = $s.Shapes.AddTable($nr, $nc, $x, $y, $wd, $ht); $tb = $tsh.Table
          for ($ri = 1; $ri -le $nr; $ri++) { for ($ci = 1; $ci -le $nc; $ci++) { $tr = $tb.Cell($ri, $ci).Shape.TextFrame.TextRange; $tr.Text = [string](@($rows[$ri - 1])[$ci - 1]); $tr.Font.Size = [Math]::Max(8, [double]$it.size); $tr.Font.NameComplexScript = 'Nirmala UI' } }
          continue
        }
        if ($it.type -eq 'shape') {
          $st = @{ oval = 9; round = 5; tri = 7; arrow = 33; star = 92 }[[string]$it.shape]; if (-not $st) { $st = 1 }
          $sh = $s.Shapes.AddShape($st, $x, $y, $wd, $ht)
          $sh.Fill.ForeColor.RGB = (Bgr ([string]$it.fill))
          if ($it.outline) { $sh.Line.ForeColor.RGB = (Bgr ([string]$it.outline)); $sh.Line.Weight = 2 } else { $sh.Line.Visible = 0 }
          $sh.TextFrame.VerticalAnchor = 3
        } else {
          $sh = $s.Shapes.AddTextbox(1, $x, $y, $wd, $ht)
        }
        $tf = $sh.TextFrame; $tf.WordWrap = -1; $tf.AutoSize = 0; $sh.Height = $ht
        $tr = $tf.TextRange; $tr.Text = ([string]$it.text) -replace "`n", "`r"
        $tr.Font.Size = [Math]::Max(6, [double]$it.size); $tr.Font.Name = if ($it.font) { [string]$it.font } else { 'Segoe UI' }
        $tr.Font.NameComplexScript = 'Nirmala UI'
        $tr.Font.Bold = [int][bool]$it.bold; $tr.Font.Italic = [int][bool]$it.italic; $tr.Font.Underline = [int][bool]$it.underline
        if ($it.lh) { $tr.ParagraphFormat.SpaceWithin = [double]$it.lh }
        $tr.Font.Color.RGB = (Bgr ([string]$it.color))
        $tr.ParagraphFormat.Alignment = if ($it.align -eq 'center') { 2 } elseif ($it.align -eq 'right') { 3 } else { 1 }
        if ($it.bullets) { $tr.ParagraphFormat.Bullet.Visible = -1 }
      }
      if ($sl.notes) { $s.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text = [string]$sl.notes }
      $fx = @{ fade = 1793; push = 3852; wipe = 2820; zoom = 3849 }[[string]$job.transition]
      if ($fx) { try { $s.SlideShowTransition.EntryEffect = $fx } catch {} }
    }
    $pres.SaveAs([string]$job.out, 24)
    if ($job.pdf) { $pdf = [IO.Path]::ChangeExtension($job.out, '.pdf'); $pres.SaveAs($pdf, 32); $result.pdf = $pdf }
    $pres.Close(); Release $pres
  } finally { if ($p.Presentations.Count -eq 0) { $p.Quit() }; Release $p }
  $result.file = $job.out
}

try {
  switch ($job.action) {
    'word' { Do-Word } 'excel' { Do-Excel } 'ppt' { Do-Ppt } 'pdf' { Do-Pdf } 'read' { Do-Read }
    'docopen' { Do-DocOpen } 'docsave' { Do-DocSave } 'gridopen' { Do-GridOpen } 'gridsave' { Do-GridSave }
    'slidesopen' { Do-SlidesOpen } 'slidessave' { Do-SlidesSave }
    default { throw "unknown action $($job.action)" }
  }
} catch {
  $result = @{ ok = $false; error = $_.Exception.Message }
}
if ($result.text) { $result.text = $result.text -replace [char]7, "`t" }   # Word table cell marks
[GC]::Collect(); [GC]::WaitForPendingFinalizers()
Start-Sleep -Milliseconds 300
Get-Process EXCEL, WINWORD, POWERPNT -ErrorAction SilentlyContinue |
  Where-Object { $before -notcontains $_.Id -and $_.MainWindowHandle -eq 0 } |
  ForEach-Object { try { Stop-Process -Id $_.Id -Force } catch {} }
[IO.File]::WriteAllText($ResultFile, ($result | ConvertTo-Json -Depth 12 -Compress), [Text.Encoding]::UTF8)
