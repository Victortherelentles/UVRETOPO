# UVRETOPO Static Prototype

A **dependency-free** front-end prototype that runs by opening `index.html` directly in your browser.

## URL

- Local file URL: `file:///.../UVRETOPO/index.html`
- Local server URL (recommended): `http://localhost:4173`
- GitHub Pages URL pattern after pushing: `https://<your-github-username>.github.io/<repo-name>/`

## Features

- Drag-and-drop upload area for `.obj` and `.glb` files.
- Split-screen high-poly vs low-poly preview panes.
- Settings panel for:
  - target polycount
  - quad retopo
  - UV generation
  - texture baking
- Export buttons for:
  - low poly mesh (mock file)
  - baked maps (mock file)
- Mock/in-browser processing flow with progress bar and placeholder preview updates.

## Run

### Option A: Open directly

1. Open `index.html` in any modern browser.

### Option B: Local server

1. From this folder, run:
   ```bash
   python3 -m http.server 4173
   ```
2. Open `http://localhost:4173`

## Publish on GitHub Pages

1. Push this repo to GitHub.
2. In GitHub: **Settings → Pages**.
3. Under **Build and deployment**, choose:
   - **Source**: Deploy from a branch
   - **Branch**: `main` (or your default branch), `/ (root)`
4. Save, then wait for deployment.
5. Open your Pages URL: `https://<your-github-username>.github.io/<repo-name>/`

## Notes

This is intentionally a front-end-only prototype. Real retopology, UV unwrapping, and texture baking are represented with placeholder logic for now.
