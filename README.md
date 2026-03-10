# UVRETOPO Static Prototype

A **dependency-free** front-end prototype that runs by opening `index.html` directly in your browser.

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

1. Open `index.html` in any modern browser.
2. Drop an `.obj` or `.glb` into the upload area.
3. Configure settings and click **Run Mock Retopology**.
4. Export mock outputs with the export buttons.

## Notes

This is intentionally a front-end-only prototype. Real retopology, UV unwrapping, and texture baking are represented with placeholder logic for now.
