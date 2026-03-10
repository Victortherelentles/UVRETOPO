# UVRETOPO Static Prototype

A dependency-free prototype (no npm) for visualizing a high-poly to low-poly workflow directly in the browser.

## URL

- Local file URL: `file:///.../UVRETOPO/index.html`
- Local server URL (recommended): `http://localhost:4173`
- GitHub Pages URL pattern: `https://<your-github-username>.github.io/<repo-name>/`

## Features

- Drag-and-drop upload for `.obj` and `.glb`.
- Interactive 3D previews for high-poly and low-poly models.
- Hover either viewport to auto-spin and inspect the model.
- Mock retopo settings panel:
  - target polycount
  - quad retopo toggle
  - UV generation toggle
  - texture bake toggle
- Extra low-poly analysis views:
  - topology wireframe view
  - UV layout canvas (packed mock islands)
- Mock export buttons for low-poly mesh and baked maps metadata.

## Run

1. Open `index.html` directly in browser, or
2. Run:
   ```bash
   python3 -m http.server 4173
   ```
   then open `http://localhost:4173`.

## Notes

- This is still a **prototype**: retopology, quad reconstruction, UV packing, and baking are mock approximations for UX preview.
- OBJ/GLB loading and 3D interaction are real browser-side rendering via CDN modules.
