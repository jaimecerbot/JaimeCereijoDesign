Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$inputPath,
        [string]$outputPath,
        [double]$scale
    )

    $image = [System.Drawing.Image]::FromFile($inputPath)
    $newWidth = [int]($image.Width * $scale)
    $newHeight = [int]($image.Height * $scale)
    $newImage = New-Object System.Drawing.Bitmap $newWidth, $newHeight
    $graphics = [System.Drawing.Graphics]::FromImage($newImage)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($image, 0, 0, $newWidth, $newHeight)
    $newImage.Save($outputPath)
    $image.Dispose()
    $newImage.Dispose()
    $graphics.Dispose()
}

# Redimensionar imágenes a 50% y 25%
Resize-Image "assets/Secciones/Proyectos/Nostre/Botellas_PopUp/Botella1.JPG" "assets/Secciones/Proyectos/Nostre/Botellas_PopUp/Botella1_50.JPG" 0.5
Resize-Image "assets/Secciones/Proyectos/Nostre/Botellas_PopUp/Botella1.JPG" "assets/Secciones/Proyectos/Nostre/Botellas_PopUp/Botella1_25.JPG" 0.25

Resize-Image "assets/Secciones/Proyectos/Nostre/Botellas_PopUp/Botella2.JPG" "assets/Secciones/Proyectos/Nostre/Botellas_PopUp/Botella2_50.JPG" 0.5
Resize-Image "assets/Secciones/Proyectos/Nostre/Botellas_PopUp/Botella2.JPG" "assets/Secciones/Proyectos/Nostre/Botellas_PopUp/Botella2_25.JPG" 0.25

# Redimensionar más imágenes
Resize-Image "assets/Secciones/Proyectos/Hira/focos.png" "assets/Secciones/Proyectos/Hira/focos_50.png" 0.5
Resize-Image "assets/Secciones/Proyectos/Hira/focos.png" "assets/Secciones/Proyectos/Hira/focos_25.png" 0.25

Resize-Image "assets/Secciones/Proyectos/Trenzas/maderas1.png" "assets/Secciones/Proyectos/Trenzas/maderas1_50.png" 0.5
Resize-Image "assets/Secciones/Proyectos/Trenzas/maderas1.png" "assets/Secciones/Proyectos/Trenzas/maderas1_25.png" 0.25

Resize-Image "assets/Secciones/Proyectos/Nostre/Nostre1.png" "assets/Secciones/Proyectos/Nostre/Nostre1_50.png" 0.5
Resize-Image "assets/Secciones/Proyectos/Nostre/Nostre1.png" "assets/Secciones/Proyectos/Nostre/Nostre1_25.png" 0.25
