# Simple build script to produce minified assets and a /dist folder (no external deps)
$ErrorActionPreference = 'Stop'

$dist = Join-Path $PSScriptRoot 'dist'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist | Out-Null

# Helper: naive CSS minification (remove comments and extra whitespace)
function Minify-Css([string]$css) {
  $css = [regex]::Replace($css, '/\*[^*]*\*+([^/*][^*]*\*+)*/', '') # comments
  $css = $css -replace '\s+', ' '                                 # collapse whitespace
  $css = $css -replace '\s*([{}:;,>])\s*', '$1'                  # trim around separators
  $css = $css -replace ';}', '}'                                   # last semicolons
  return $css.Trim()
}

# Helper: naive JS minification (only trims comments/whitespace safely)
function Minify-Js([string]$js) {
  # Remove /* */ comments (not inside strings) — naive
  $js = [regex]::Replace($js, '/\*[^*]*\*+([^/*][^*]*\*+)*/', '')
  # Remove // comments (line)
  $js = ($js -split "`n") | ForEach-Object {
    if ($_ -match '^[\s\t]*//') { '' } else { $_ }
  } | Where-Object { $_ -ne '' } | ForEach-Object { $_.TrimEnd() } | Out-String
  # Collapse multiple blank lines
  $js = [regex]::Replace($js, "`r?`n{2,}", "`n")
  return $js.Trim()
}

# Copy HTML and static files
Copy-Item "$PSScriptRoot/index.html" "$dist/index.html"
Copy-Item "$PSScriptRoot/offline.html" "$dist/offline.html"
Copy-Item "$PSScriptRoot/manifest.webmanifest" "$dist/manifest.webmanifest"
Copy-Item "$PSScriptRoot/LogoChiquito.png" "$dist/LogoChiquito.png" -ErrorAction SilentlyContinue

# Process CSS
$cssIn = Get-Content "$PSScriptRoot/assets/css/styles.css" -Raw
$cssMin = Minify-Css $cssIn
$newCssDir = Join-Path $dist 'assets/css'
New-Item -ItemType Directory -Path $newCssDir -Force | Out-Null
Set-Content -Path (Join-Path $newCssDir 'styles.min.css') -Value $cssMin -NoNewline
# Also copy original
Copy-Item "$PSScriptRoot/assets/css/styles.css" (Join-Path $newCssDir 'styles.css')

# Process JS
$jsIn = Get-Content "$PSScriptRoot/assets/js/main.js" -Raw
$jsMin = Minify-Js $jsIn
$newJsDir = Join-Path $dist 'assets/js'
New-Item -ItemType Directory -Path $newJsDir -Force | Out-Null
Set-Content -Path (Join-Path $newJsDir 'main.min.js') -Value $jsMin -NoNewline
Copy-Item "$PSScriptRoot/assets/js/main.js" (Join-Path $newJsDir 'main.js')

# Copy remaining assets (images, fonts). This can be large; copy selectively if needed.
Copy-Item "$PSScriptRoot/assets/Secciones" (Join-Path $dist 'assets/Secciones') -Recurse
Copy-Item "$PSScriptRoot/CCTheStorySoNear W00 Regular" (Join-Path $dist 'CCTheStorySoNear W00 Regular') -Recurse -ErrorAction SilentlyContinue

# Copy Service Worker
Copy-Item "$PSScriptRoot/sw.js" "$dist/sw.js"

Write-Host "Build complete -> $dist"
