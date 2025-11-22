# Analizar GIF y extraer frames procesados (recortados y sin últimos frames)
param(
    [string]$InputPath = "assets\Secciones\Proyectos\Reflejos\movil\fondoreflejos1final.gif",
    [int]$FramesToRemove = 3,
    [double]$CropTopPercent = 2.0
)

Add-Type -AssemblyName System.Drawing

try {
    $fullPath = (Resolve-Path $InputPath).Path
    Write-Host "`n=== Analizando GIF ===" -ForegroundColor Cyan
    Write-Host "Archivo: $fullPath`n" -ForegroundColor White

    # Cargar GIF
    $gif = [System.Drawing.Image]::FromFile($fullPath)
    $dimension = New-Object System.Drawing.Imaging.FrameDimension($gif.FrameDimensionsList[0])
    $frameCount = $gif.GetFrameCount($dimension)
    
    # Información del GIF
    Write-Host "Información actual:" -ForegroundColor Yellow
    Write-Host "  Total de frames: $frameCount" -ForegroundColor White
    Write-Host "  Dimensiones: $($gif.Width)x$($gif.Height)" -ForegroundColor White
    Write-Host "  Formato: $($gif.PixelFormat)" -ForegroundColor White
    
    # Calcular cambios
    $newFrameCount = $frameCount - $FramesToRemove
    $cropPixels = [Math]::Round($gif.Height * ($CropTopPercent / 100))
    $newHeight = $gif.Height - $cropPixels
    
    Write-Host "`nCambios propuestos:" -ForegroundColor Yellow
    Write-Host "  Frames a mantener: $newFrameCount (eliminando últimos $FramesToRemove)" -ForegroundColor Green
    Write-Host "  Recorte superior: $cropPixels píxeles (${CropTopPercent}%)" -ForegroundColor Green
    Write-Host "  Nuevas dimensiones: $($gif.Width)x$newHeight" -ForegroundColor Green
    
    Write-Host "`n¿Continuar con la extracción de frames? (S/N): " -ForegroundColor Cyan -NoNewline
    $response = Read-Host
    
    if ($response -ne 'S' -and $response -ne 's') {
        Write-Host "Operación cancelada." -ForegroundColor Yellow
        $gif.Dispose()
        return
    }
    
    # Crear directorio para frames
    $outputDir = "assets\Secciones\Proyectos\Reflejos\movil\frames_procesados"
    if (Test-Path $outputDir) {
        Remove-Item $outputDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    
    Write-Host "`nExtrayendo y procesando frames..." -ForegroundColor Cyan
    
    $pngCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/png' }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 100L)
    
    for ($i = 0; $i -lt $newFrameCount; $i++) {
        $gif.SelectActiveFrame($dimension, $i)
        
        # Crear bitmap recortado
        $croppedBitmap = New-Object System.Drawing.Bitmap($gif.Width, $newHeight)
        $graphics = [System.Drawing.Graphics]::FromImage($croppedBitmap)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        
        $srcRect = New-Object System.Drawing.Rectangle(0, $cropPixels, $gif.Width, $newHeight)
        $destRect = New-Object System.Drawing.Rectangle(0, 0, $gif.Width, $newHeight)
        
        $graphics.DrawImage($gif, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        
        # Guardar frame
        $framePath = Join-Path $outputDir "frame_$($i.ToString('D3')).png"
        $croppedBitmap.Save($framePath, $pngCodec, $encoderParams)
        
        $graphics.Dispose()
        $croppedBitmap.Dispose()
        
        Write-Progress -Activity "Procesando frames" -Status "Frame $($i+1) de $newFrameCount" -PercentComplete (($i + 1) / $newFrameCount * 100)
    }
    
    $gif.Dispose()
    
    Write-Host "`n✓ Frames procesados exitosamente!" -ForegroundColor Green
    Write-Host "  Ubicación: $outputDir" -ForegroundColor White
    Write-Host "  Total: $newFrameCount frames PNG" -ForegroundColor White
    
    Write-Host "`n=== Siguiente paso ===" -ForegroundColor Cyan
    Write-Host "Para reconstruir el GIF, puedes usar una herramienta online gratuita:" -ForegroundColor Yellow
    Write-Host "  1. Visita: https://ezgif.com/maker" -ForegroundColor White
    Write-Host "  2. Sube todos los PNG de: $outputDir" -ForegroundColor White
    Write-Host "  3. Ajusta el delay (velocidad) según el original" -ForegroundColor White
    Write-Host "  4. Descarga el GIF resultante y reemplaza el original`n" -ForegroundColor White
    
    # Intentar abrir el explorador en la carpeta
    Start-Process explorer.exe -ArgumentList (Resolve-Path $outputDir).Path
    
} catch {
    Write-Host "`nError: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
}
