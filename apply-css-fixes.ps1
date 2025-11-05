# Script para aplicar correcciones CSS
$cssFile = "c:\Users\Jaime\Documents\GitHub\JaimeCereijoDesign\assets\css\styles.css"
$content = Get-Content $cssFile -Raw -Encoding UTF8

# Reemplazo 1: Cambiar padding de 8px a 16px en móvil
$content = $content -replace '#sobremi \{ padding: 10px 8px 70px 8px; \}', '#sobremi { padding: 10px 16px 70px 16px; }'

# Reemplazo 2: Cambiar justify-items de stretch a center
$content = $content -replace '\.about-columns \{ grid-template-columns: 1fr; gap: 20px; justify-items: stretch; \}', '.about-columns { grid-template-columns: 1fr; gap: 20px; justify-items: center; align-items: center; }'

# Reemplazo 3: Añadir reglas de centrado después de .about-columns
$insertPoint = '.about-columns { grid-template-columns: 1fr; gap: 20px; justify-items: center; align-items: center; }'
$newRules = @"
$insertPoint
  /* Educación e Idiomas: centrar horizontalmente pero texto alineado a la izquierda */
  .about-edu {
    justify-self: center;
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
  }
  .about-edu h3, .about-edu .about-langs {
    text-align: center;
  }
  .about-edu .about-list {
    text-align: left;
    width: 100%;
  }
  /* Programas: centrar horizontalmente */
  .about-programs {
    justify-self: center;
    width: 100%;
  }
"@

$content = $content -replace [regex]::Escape($insertPoint), $newRules

# Guardar el archivo
$content | Set-Content $cssFile -Encoding UTF8 -NoNewline

Write-Host "Correcciones aplicadas exitosamente!" -ForegroundColor Green
