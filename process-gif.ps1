# Script para procesar GIF: eliminar frames finales y recortar parte superior
param(
    [string]$InputPath = "assets\Secciones\Proyectos\Reflejos\movil\fondoreflejos1final.gif",
    [int]$FramesToRemove = 3,
    [double]$CropTopPercent = 2.0
)

Add-Type -AssemblyName System.Drawing

try {
    # Crear backup
    $backupPath = $InputPath -replace '\.gif$', '_backup.gif'
    Copy-Item $InputPath $backupPath -Force
    Write-Host "Backup creado: $backupPath" -ForegroundColor Green

    # Cargar el GIF original
    $originalGif = [System.Drawing.Image]::FromFile((Resolve-Path $InputPath).Path)
    $dimension = New-Object System.Drawing.Imaging.FrameDimension($originalGif.FrameDimensionsList[0])
    $frameCount = $originalGif.GetFrameCount($dimension)
    
    Write-Host "Frames originales: $frameCount" -ForegroundColor Cyan
    Write-Host "Frames a eliminar: $FramesToRemove" -ForegroundColor Yellow
    
    $newFrameCount = $frameCount - $FramesToRemove
    if ($newFrameCount -lt 1) {
        throw "No se pueden eliminar $FramesToRemove frames de un GIF con solo $frameCount frames"
    }

    # Calcular dimensiones de recorte
    $originalWidth = $originalGif.Width
    $originalHeight = $originalGif.Height
    $cropPixels = [Math]::Round($originalHeight * ($CropTopPercent / 100))
    $newHeight = $originalHeight - $cropPixels
    
    Write-Host "Dimensiones originales: ${originalWidth}x${originalHeight}" -ForegroundColor Cyan
    Write-Host "Recortando $cropPixels píxeles (${CropTopPercent}%) desde arriba" -ForegroundColor Yellow
    Write-Host "Nuevas dimensiones: ${originalWidth}x${newHeight}" -ForegroundColor Cyan
    
    # Crear directorio temporal
    $tempDir = Join-Path $env:TEMP "gif_process_$(Get-Random)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    # Extraer y procesar frames
    $encoder = [System.Drawing.Imaging.Encoder]::Quality
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, 100L)
    
    $pngCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/png' }
    
    Write-Host "Procesando frames..." -ForegroundColor Cyan
    for ($i = 0; $i -lt $newFrameCount; $i++) {
        $originalGif.SelectActiveFrame($dimension, $i)
        
        # Crear bitmap recortado
        $croppedBitmap = New-Object System.Drawing.Bitmap($originalWidth, $newHeight)
        $graphics = [System.Drawing.Graphics]::FromImage($croppedBitmap)
        
        $srcRect = New-Object System.Drawing.Rectangle(0, $cropPixels, $originalWidth, $newHeight)
        $destRect = New-Object System.Drawing.Rectangle(0, 0, $originalWidth, $newHeight)
        
        $graphics.DrawImage($originalGif, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        
        # Guardar frame como PNG temporal
        $framePath = Join-Path $tempDir "frame_$($i.ToString('D4')).png"
        $croppedBitmap.Save($framePath, $pngCodec, $encoderParams)
        
        $graphics.Dispose()
        $croppedBitmap.Dispose()
        
        if (($i + 1) % 10 -eq 0) {
            Write-Host "  Procesados $($i + 1)/$newFrameCount frames" -ForegroundColor Gray
        }
    }
    
    $originalGif.Dispose()
    
    Write-Host "`nFrames procesados y guardados en: $tempDir" -ForegroundColor Green
    Write-Host "`nPara crear el GIF final, necesitas una herramienta externa como:" -ForegroundColor Yellow
    Write-Host "  - ImageMagick: magick -delay 5 -loop 0 $tempDir\frame_*.png output.gif" -ForegroundColor Gray
    Write-Host "  - FFmpeg: ffmpeg -i $tempDir\frame_%04d.png -vf palettegen=max_colors=256 palette.png" -ForegroundColor Gray
    Write-Host "  - O usar un conversor online subiendo los frames desde: $tempDir" -ForegroundColor Gray
    Write-Host "`nLos frames están listos en el directorio temporal." -ForegroundColor Cyan
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    throw
}
