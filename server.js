import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { NodeIO } from '@gltf-transform/core';
import { simplify, weld, prune, dedup, textureCompress } from '@gltf-transform/functions';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: {
    fileSize: 1024 * 1024 * 1024
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/downloads', express.static(path.join(__dirname, 'output')));

function safeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
}

app.post('/api/optimize', upload.single('model'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No model file uploaded.' });
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (ext !== '.glb' && ext !== '.gltf') {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({
      error: 'Currently supported input formats: .glb and .gltf'
    });
  }

  const targetPercent = Math.min(95, Math.max(5, Number(req.body.targetPercent || 25)));
  const ratio = targetPercent / 100;

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.encoder': MeshoptEncoder,
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.simplifier': MeshoptSimplifier
    });

  try {
    await MeshoptEncoder.ready;

    const doc = await io.read(req.file.path);
    const root = doc.getRoot();

    let sourceTriangles = 0;
    root.listMeshes().forEach((mesh) => {
      mesh.listPrimitives().forEach((prim) => {
        const indices = prim.getIndices();
        if (indices) {
          sourceTriangles += Math.floor(indices.getCount() / 3);
        }
      });
    });

    await doc.transform(
      dedup(),
      weld({ tolerance: 1e-4 }),
      simplify({ ratio, error: 1e-2, lockBorder: false }),
      prune(),
      textureCompress({ targetFormat: 'webp' })
    );

    let optimizedTriangles = 0;
    root.listMeshes().forEach((mesh) => {
      mesh.listPrimitives().forEach((prim) => {
        const indices = prim.getIndices();
        if (indices) {
          optimizedTriangles += Math.floor(indices.getCount() / 3);
        }
      });
    });

    const baseName = safeName(path.parse(req.file.originalname).name);
    const outputName = `${baseName}-optimized-${Date.now()}.glb`;
    const outputPath = path.join(__dirname, 'output', outputName);

    await io.write(outputPath, doc);
    await fs.unlink(req.file.path).catch(() => {});

    return res.json({
      sourceTriangles,
      optimizedTriangles,
      retainedPercent: ((optimizedTriangles / Math.max(sourceTriangles, 1)) * 100).toFixed(2),
      downloadUrl: `/downloads/${outputName}`
    });
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(500).json({
      error: 'Optimization failed. Ensure the model is valid glTF/GLB.',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`UVRETOPO app listening on http://localhost:${PORT}`);
});
