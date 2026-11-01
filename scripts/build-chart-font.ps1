Add-Type -AssemblyName System.Drawing
$glyphSets = @{}
$characters = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-.,:/|%ÇĞİÖŞÜ'
foreach ($entry in @(@(1, 12), @(2, 18), @(3, 28))) {
  $scale = $entry[0]
  $size = $entry[1]
  $style = if ($scale -eq 3) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  $font = New-Object System.Drawing.Font('Segoe UI', $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
  $glyphs = @{}
  foreach ($character in $characters.ToCharArray()) {
    $bitmap = New-Object System.Drawing.Bitmap(52, 44)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::Black)
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $format = [System.Drawing.StringFormat]::GenericTypographic.Clone()
    $format.FormatFlags = $format.FormatFlags -bor [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces
    $advance = [Math]::Ceiling($graphics.MeasureString([string]$character, $font, 52, $format).Width)
    $graphics.DrawString([string]$character, $font, [System.Drawing.Brushes]::White, 1, 0, $format)
    $height = [Math]::Ceiling($font.GetHeight($graphics)) + 1
    $width = [Math]::Min(52, $advance + 3)
    $values = New-Object 'System.Collections.Generic.List[byte]'
    for ($y = 0; $y -lt $height; $y++) { for ($x = 0; $x -lt $width; $x++) {
      $values.Add([byte][Math]::Round($bitmap.GetPixel($x,$y).R * 15 / 255))
    }}
    $runs = New-Object 'System.Collections.Generic.List[byte]'
    $offset = 0
    while ($offset -lt $values.Count) {
      $alpha = $values[$offset]
      $length = 1
      while ($offset + $length -lt $values.Count -and $length -lt 16 -and $values[$offset + $length] -eq $alpha) { $length++ }
      $runs.Add([byte](($alpha -shl 4) -bor ($length - 1)))
      $offset += $length
    }
    $glyphs[[string]$character] = @{ w=$width; h=$height; a=$advance; p=[Convert]::ToBase64String($runs.ToArray()) }
    $format.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
  }
  $font.Dispose()
  $glyphSets[[string]$scale] = $glyphs
}
$json = $glyphSets | ConvertTo-Json -Depth 5 -Compress
$source = 'const CHART_FONT = ' + $json + ';' + [Environment]::NewLine
$source += "if (typeof module !== 'undefined') module.exports = CHART_FONT;" + [Environment]::NewLine
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'lib/chart-font.js'), $source, [System.Text.UTF8Encoding]::new($false))
Write-Output ('Generated Segoe UI glyph masks: ' + $source.Length + ' characters')
