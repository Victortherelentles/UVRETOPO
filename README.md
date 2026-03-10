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

## Deploy (GitHub Pages)

This repo includes an automatic deployment workflow at `.github/workflows/deploy-pages.yml`.

1. Push your branch (`work` or `main`) to GitHub.
2. In GitHub repo settings, open **Settings → Pages**.
3. Set **Build and deployment → Source** to **GitHub Actions**.
4. Go to the **Actions** tab and wait for **Deploy static site to GitHub Pages** to finish.
5. Open your site URL:
   `https://<your-github-username>.github.io/<repo-name>/`

## Troubleshooting (if link is missing or site won't open)

- Confirm the workflow run is green in **Actions**.
- In **Settings → Pages**, make sure Source is **GitHub Actions** (not branch deploy).
- Ensure the repo is public (or Pages is enabled for your private repo plan).
- Hard-refresh browser or use an incognito tab after deployment.
- Wait 1–3 minutes (sometimes up to 10 minutes) after a successful deploy.

## Notes

- This is still a **prototype**: retopology, quad reconstruction, UV packing, and baking are mock approximations for UX preview.
- OBJ/GLB loading and 3D interaction are real browser-side rendering via CDN modules.
