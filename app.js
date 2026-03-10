import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/OBJLoader.js';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileNameEl = document.getElementById('fileName');
const processBtn = document.getElementById('processBtn');
const exportMeshBtn = document.getElementById('exportMeshBtn');
const exportMapsBtn = document.getElementById('exportMapsBtn');
const statusText = document.getElementById('statusText');
const progressBar = document.getElementById('progressBar');
const highMeta = document.getElementById('highMeta');
const lowMeta = document.getElementById('lowMeta');

const targetPolyInput = document.getElementById('targetPoly');
const quadRetopoInput = document.getElementById('quadRetopo');
const genUvInput = document.getElementById('genUv');
const bakeTexturesInput = document.getElementById('bakeTextures');

const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();

let selectedFile = null;
let sourceModel = null;
let lowModel = null;
let sourceTriangles = 0;
let optimizedTriangles = 0;
let processingDone = false;

function createViewer(canvas, wireframe = false) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, canvas.width / canvas.height, 0.01, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const hemi = new THREE.HemisphereLight(0xd8eeff, 0x24304b, 1.1);
  const dir = new THREE.DirectionalLight(0xffffff, 1.25);
  dir.position.set(4, 5, 4);
  scene.add(hemi, dir);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1.8;

  canvas.addEventListener('pointerenter', () => { controls.autoRotate = true; });
  canvas.addEventListener('pointerleave', () => { controls.autoRotate = false; });

  const grid = new THREE.GridHelper(10, 20, 0x9bbbf4, 0x2e466d);
  grid.material.opacity = 0.25;
  grid.material.transparent = true;
  scene.add(grid);

  let model = null;

  function setModel(obj) {
    if (model) {
      scene.remove(model);
      model.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material?.dispose();
        }
      });
    }

    if (!obj) {
      model = null;
      return;
    }

    model = obj;

    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = false;
      child.material = wireframe
        ? new THREE.MeshBasicMaterial({ color: 0xa0ffe1, wireframe: true })
        : new THREE.MeshStandardMaterial({
            color: 0xc8dcff,
            metalness: 0.08,
            roughness: 0.62,
            transparent: true,
            opacity: 0.95
          });
    });

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length() || 1;
    model.position.sub(center);

    camera.near = Math.max(0.01, size / 120);
    camera.far = Math.max(100, size * 100);
    camera.position.set(size * 0.9, size * 0.6, size * 0.9);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controls.update();

    scene.add(model);
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    }
  }

  function render() {
    resize();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  render();

  return { setModel };
}

const highViewer = createViewer(document.getElementById('highCanvas'));
const lowViewer = createViewer(document.getElementById('lowCanvas'));
const topologyViewer = createViewer(document.getElementById('topologyCanvas'), true);
const uvCanvas = document.getElementById('uvCanvas');

function countTriangles(object3d) {
  let triangles = 0;
  object3d.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const geom = child.geometry;
    if (geom.index) triangles += Math.floor(geom.index.count / 3);
    else triangles += Math.floor(geom.attributes.position.count / 3);
  });
  return triangles;
}

function ensureUVs(geometry) {
  if (geometry.getAttribute('uv')) return;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const size = new THREE.Vector3();
  box.getSize(size);
  const pos = geometry.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    uv[i * 2] = size.x ? (x - box.min.x) / size.x : 0;
    uv[i * 2 + 1] = size.z ? (z - box.min.z) / size.z : 0;
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

function buildLowPolyModel(source, targetTriangles) {
  const ratio = Math.max(0.05, Math.min(1, targetTriangles / Math.max(sourceTriangles, 1)));
  const cloned = source.clone(true);

  cloned.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    let g = child.geometry.clone().toNonIndexed();
    const pos = g.getAttribute('position');
    const normals = g.getAttribute('normal');
    const uv = g.getAttribute('uv');

    const triCount = Math.floor(pos.count / 3);
    const keepTri = Math.max(12, Math.floor(triCount * ratio));

    const newPos = new Float32Array(keepTri * 9);
    const newNormals = normals ? new Float32Array(keepTri * 9) : null;
    const newUv = uv ? new Float32Array(keepTri * 6) : null;

    for (let t = 0; t < keepTri; t += 1) {
      const srcTri = Math.floor((t / keepTri) * triCount);
      for (let v = 0; v < 3; v += 1) {
        const srcIndex = srcTri * 3 + v;
        const dstPos = t * 9 + v * 3;
        newPos[dstPos] = pos.getX(srcIndex);
        newPos[dstPos + 1] = pos.getY(srcIndex);
        newPos[dstPos + 2] = pos.getZ(srcIndex);

        if (newNormals) {
          newNormals[dstPos] = normals.getX(srcIndex);
          newNormals[dstPos + 1] = normals.getY(srcIndex);
          newNormals[dstPos + 2] = normals.getZ(srcIndex);
        }

        if (newUv) {
          const dstUv = t * 6 + v * 2;
          newUv[dstUv] = uv.getX(srcIndex);
          newUv[dstUv + 1] = uv.getY(srcIndex);
        }
      }
    }

    const low = new THREE.BufferGeometry();
    low.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
    if (newNormals) low.setAttribute('normal', new THREE.BufferAttribute(newNormals, 3));
    if (newUv) low.setAttribute('uv', new THREE.BufferAttribute(newUv, 2));
    ensureUVs(low);
    low.computeVertexNormals();

    child.geometry.dispose();
    child.geometry = low;
  });

  return cloned;
}

function drawUVLayout(object3d) {
  const ctx = uvCanvas.getContext('2d');
  const w = uvCanvas.width;
  const h = uvCanvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#071022';
  ctx.fillRect(0, 0, w, h);

  const gridSize = 12;
  ctx.strokeStyle = 'rgba(170,200,255,0.12)';
  for (let i = 0; i <= gridSize; i += 1) {
    const x = (w / gridSize) * i;
    const y = (h / gridSize) * i;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  const rects = [
    [0.02, 0.02, 0.48, 0.48],
    [0.5, 0.02, 0.48, 0.30],
    [0.5, 0.34, 0.24, 0.32],
    [0.74, 0.34, 0.24, 0.32],
    [0.5, 0.68, 0.48, 0.30]
  ];

  let island = 0;
  object3d.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const geom = child.geometry;
    ensureUVs(geom);
    const uv = geom.getAttribute('uv');
    if (!uv) return;

    const pack = rects[island % rects.length];
    island += 1;

    ctx.strokeStyle = 'rgba(147, 231, 255, 0.92)';
    ctx.lineWidth = 1;

    for (let i = 0; i < uv.count; i += 3) {
      const tri = [];
      for (let j = 0; j < 3; j += 1) {
        const u = uv.getX(i + j);
        const v = uv.getY(i + j);
        const packedU = pack[0] + Math.min(1, Math.max(0, u)) * pack[2];
        const packedV = pack[1] + Math.min(1, Math.max(0, v)) * pack[3];
        tri.push([packedU * w, (1 - packedV) * h]);
      }
      ctx.beginPath();
      ctx.moveTo(tri[0][0], tri[0][1]);
      ctx.lineTo(tri[1][0], tri[1][1]);
      ctx.lineTo(tri[2][0], tri[2][1]);
      ctx.closePath();
      ctx.stroke();
    }
  });

  ctx.fillStyle = 'rgba(217,234,255,0.88)';
  ctx.font = '13px sans-serif';
  ctx.fillText('Mock packed UV islands for bake target (non-scrambled preview)', 10, 18);
}

async function loadModel(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const objectURL = URL.createObjectURL(file);
  try {
    if (ext === 'glb') {
      const gltf = await gltfLoader.loadAsync(objectURL);
      return gltf.scene;
    }

    if (ext === 'obj') {
      return await objLoader.loadAsync(objectURL);
    }

    throw new Error('Only .OBJ and .GLB are supported right now.');
  } finally {
    URL.revokeObjectURL(objectURL);
  }
}

async function updateFile(file) {
  selectedFile = file;
  processingDone = false;
  exportMeshBtn.disabled = true;
  exportMapsBtn.disabled = true;
  progressBar.style.width = '0%';

  if (!file) {
    fileNameEl.textContent = 'No file selected.';
    statusText.textContent = 'Waiting for model upload.';
    return;
  }

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!['obj', 'glb'].includes(ext)) {
    fileNameEl.textContent = `${file.name} (unsupported type)`;
    statusText.textContent = 'Please upload .OBJ or .GLB only.';
    selectedFile = null;
    return;
  }

  fileNameEl.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
  statusText.textContent = 'Loading model...';

  sourceModel = await loadModel(file);
  sourceTriangles = countTriangles(sourceModel);
  highViewer.setModel(sourceModel.clone(true));

  lowModel = null;
  topologyViewer.setModel(null);
  drawUVLayout(new THREE.Group());

  highMeta.textContent = `Triangles: ${sourceTriangles.toLocaleString()}`;
  lowMeta.textContent = 'Triangles: —';
  statusText.textContent = 'Model loaded. Hover over preview to spin. Ready for mock retopo.';
}

function handleFiles(files) {
  if (!files?.length) return;
  updateFile(files[0]).catch((err) => {
    statusText.textContent = err.message;
  });
}

fileInput.addEventListener('change', (event) => handleFiles(event.target.files));

['dragenter', 'dragover'].forEach((type) => {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach((type) => {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
  });
});

dropzone.addEventListener('drop', (event) => handleFiles(event.dataTransfer.files));

processBtn.addEventListener('click', async () => {
  if (!sourceModel) {
    statusText.textContent = 'Upload a model first.';
    return;
  }

  const target = Math.max(100, Number(targetPolyInput.value) || 12000);
  statusText.textContent = 'Generating low-poly + quad topology + UV packing (mock)...';
  processBtn.disabled = true;

  for (let i = 0; i <= 100; i += 5) {
    await new Promise((resolve) => setTimeout(resolve, 35));
    progressBar.style.width = `${i}%`;
  }

  lowModel = buildLowPolyModel(sourceModel, target);
  optimizedTriangles = countTriangles(lowModel);

  lowViewer.setModel(lowModel.clone(true));
  topologyViewer.setModel(lowModel.clone(true));
  drawUVLayout(lowModel);

  lowMeta.textContent = `Triangles: ${optimizedTriangles.toLocaleString()} | Quads target: ${quadRetopoInput.checked ? 'ON' : 'OFF'} | UV packed: ${genUvInput.checked ? 'ON' : 'SOURCE'} | Bake: ${bakeTexturesInput.checked ? 'ON' : 'OFF'}`;
  statusText.textContent = 'Done. Hover each viewport to spin. Topology and UV layout preview generated.';

  processingDone = true;
  processBtn.disabled = false;
  exportMeshBtn.disabled = false;
  exportMapsBtn.disabled = !bakeTexturesInput.checked;
});

function triggerDownload(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

exportMeshBtn.addEventListener('click', () => {
  if (!processingDone) return;
  const summary = [
    'UVRETOPO Mock Low-Poly Export',
    `Source file: ${selectedFile?.name || 'N/A'}`,
    `Source triangles: ${sourceTriangles}`,
    `Low triangles: ${optimizedTriangles}`,
    `Quad retopo target: ${quadRetopoInput.checked}`,
    `UV generation: ${genUvInput.checked}`,
    `Texture baking: ${bakeTexturesInput.checked}`,
    'Note: Prototype export is metadata only. Mesh export is mocked.'
  ].join('\n');

  triggerDownload('low-poly-mesh-mock.txt', summary);
});

exportMapsBtn.addEventListener('click', () => {
  if (!processingDone || !bakeTexturesInput.checked) return;
  const summary = [
    'UVRETOPO Mock Baked Maps',
    `Asset: ${selectedFile?.name || 'N/A'}`,
    'Packed UV islands: generated for preview',
    'Maps (placeholder): albedo.png, normal.png, roughness.png, ao.png'
  ].join('\n');
  triggerDownload('baked-maps-mock.txt', summary);
});

drawUVLayout(new THREE.Group());
