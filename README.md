# JaimeCereijoDesign

This repository contains the source for the Jaime Cereijo portfolio site.

## Overview

- Single HTML entry point: `index.html`
- Assets under `assets/` (images, videos, thumbnails, circles, projects)
- Local fonts in `CCTheStorySoNear W00 Regular/` and `UnciaDis.ttf`
- Externalized styles and scripts for maintainability:
	- CSS: `assets/css/styles.css`
	- JS: `assets/js/main.js`

No visual or behavioral changes were made during the refactor; styles and logic were moved verbatim out of `index.html`.

## Local development

You can open `index.html` directly in your browser. For more accurate behavior with relative paths and caching, run a static server from the repo root and then visit http://localhost:8000 (or the displayed port).

Optional commands (choose one):

```powershell
# Python 3
python -m http.server 8000

# Node (if installed)
npx serve . -l 8000
```

## Structure

- `index.html` — Site markup, links to external CSS/JS.
- `assets/css/styles.css` — All styles previously inlined.
- `assets/js/main.js` — All scripts previously inlined.
- `assets/…` — Project media and UI imagery.
- `CCTheStorySoNear W00 Regular/` — Local font files (TTF at root, web formats under `Web Fonts/`).
- `UnciaDis.ttf` — Local font.

## Notes

- The header logo expects `Jmotion.png` at the repo root. If missing, add the file or update the CSS rule for `.logo` in `assets/css/styles.css`.
- The font-face sources include TTF (present). WOFF/WOFF2 variants can be wired to the hashed files in `CCTheStorySoNear W00 Regular/Web Fonts/` if desired for improved performance.

## Change log

- 2025-10-25: Extracted CSS/JS from `index.html` into `assets/css/styles.css` and `assets/js/main.js`. Fixed relative URLs inside CSS.
