# UVRETOPO Web App

A browser-first pipeline for turning high-poly glTF assets into low-poly, game-ready models.

## What it does

- Uploads a high-poly `.glb` or `.gltf` model from the browser.
- Runs server-side geometry simplification (auto-retopology/decimation) to produce a low-poly output.
- Preserves and repacks source textures/materials into the optimized asset.
- Displays split-screen real-time previews (original vs optimized) with orbit controls.
- Generates a direct browser download link for the optimized model.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Notes

- Current upload support is `glTF/GLB` only.
- Retopology here is automatic simplification/decimation tuned for game optimization.
- Texture transfer uses source material/texture retention through the glTF pipeline (best for assets with already-valid UVs).
