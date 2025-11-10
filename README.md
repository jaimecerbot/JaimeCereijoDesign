# Jaime Cereijo Design

Portfolio web de Jaime Cereijo: diseño gráfico, desarrollo web, ilustración, edición de vídeo y más.

## Objetivos de optimización recientes

Se ha realizado una mejora sistemática para:

1. Reducir transferencia inicial: lazy-loading y `decoding="async"` en imágenes.
2. Mejorar accesibilidad: enlace "Saltar al contenido", roles ARIA, navegación por teclado.
3. Añadir funcionamiento offline básico: Service Worker (`sw.js`) y `offline.html`.
4. Preparar PWA ligera: `manifest.webmanifest` y `theme-color`.
5. Optimizar fuentes: uso consolidado de `<link>` en lugar de múltiples `@import`, `font-display: swap` para fuentes locales.
6. Ajustar JS para no bloquear: script principal con `defer` y mejoras progresivas tras `load`.

## Estructura

| Recurso | Descripción |
|---------|-------------|
| `index.html` | Entrada principal y registro del Service Worker |
| `assets/css/styles.css` | Hoja de estilos global (pendiente futura minificación) |
| `assets/js/main.js` | Lógica interactiva (carrusel, galería, accesibilidad, idioma) |
| `sw.js` | Cache offline: network-first para navegaciones, stale-while-revalidate para estáticos |
| `offline.html` | Página de respaldo cuando no hay conexión |
| `manifest.webmanifest` | Metadatos PWA básicos |
| `assets/Secciones/...` | Imágenes y medios de proyectos |

## Desarrollo local

Abrir directamente `index.html` funciona, pero para probar SW/PWA usa un servidor local:

```powershell
python -m http.server 8000
# o
npx serve . -l 8000
```
Visita: http://localhost:8000

## Pruebas rápidas

1. Modo offline: abre DevTools > Application > Service Workers, marca "Offline" y recarga. Debes ver `offline.html` si navegas a una página no cacheada.
2. Lighthouse (recomendado): auditar Performance / PWA / Accessibility.
3. Caché: en DevTools > Application > Cache Storage verifica `jc-design-v2`.

## Próximos pasos sugeridos

- Minificar y generar hash de CSS/JS (`styles.min.css`, `main.min.js`).
- Generar variantes modernas de imágenes (WebP/AVIF) y `picture` con fallback.
- Extraer Critical CSS (header + hero inicial) inline en `<head>` para reducir FCP.
- Auditoría de reglas CSS no usadas (usar Cover de DevTools) y limpieza.
- Split lógico del JS (código del carrusel vs. galería) para reducir parse inicial.

## Registro de cambios

- 2025-11-10: Accesibilidad (skip link), meta tags, manifest, Service Worker v2 con `offline.html`.
- 2025-10-25: Extracción de CSS/JS desde `index.html`.

## Licencia

Ver `License.txt`.

