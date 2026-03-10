const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileNameEl = document.getElementById('fileName');
const processBtn = document.getElementById('processBtn');
const exportMeshBtn = document.getElementById('exportMeshBtn');
const exportMapsBtn = document.getElementById('exportMapsBtn');
const statusText = document.getElementById('statusText');
const progressBar = document.getElementById('progressBar');

const highCanvas = document.getElementById('highCanvas');
const lowCanvas = document.getElementById('lowCanvas');
const highMeta = document.getElementById('highMeta');
const lowMeta = document.getElementById('lowMeta');

const targetPolyInput = document.getElementById('targetPoly');
const quadRetopoInput = document.getElementById('quadRetopo');
const genUvInput = document.getElementById('genUv');
const bakeTexturesInput = document.getElementById('bakeTextures');

let selectedFile = null;
let sourceTriangles = 0;
let optimizedTriangles = 0;
let processingDone = false;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function drawMockMesh(canvas, density, tint) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#081126';
  ctx.fillRect(0, 0, w, h);

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#162850');
  grad.addColorStop(1, '#0a1938');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = tint;
  ctx.lineWidth = 1;

  for (let i = 0; i < density; i += 1) {
    const x1 = randomInt(20, w - 20);
    const y1 = randomInt(20, h - 20);
    const x2 = x1 + randomInt(-40, 40);
    const y2 = y1 + randomInt(-40, 40);
    const x3 = x1 + randomInt(-40, 40);
    const y3 = y1 + randomInt(-40, 40);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#dce8ff';
  ctx.font = '16px sans-serif';
  ctx.fillText('Mock viewport (prototype)', 18, h - 16);
}

function updateFile(file) {
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
  statusText.textContent = 'Model loaded. You can run mock retopology.';

  sourceTriangles = randomInt(120000, 1200000);
  optimizedTriangles = 0;

  drawMockMesh(highCanvas, 900, '#7db4ff');
  drawMockMesh(lowCanvas, 90, '#76f2ad');

  highMeta.textContent = `Triangles: ${sourceTriangles.toLocaleString()} (estimated)`;
  lowMeta.textContent = 'Triangles: —';
}

function handleFiles(files) {
  if (!files?.length) return;
  updateFile(files[0]);
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
  if (!selectedFile) {
    statusText.textContent = 'Upload a model first.';
    return;
  }

  const target = Math.max(100, Number(targetPolyInput.value) || 12000);
  statusText.textContent = 'Mock processing started...';
  processBtn.disabled = true;

  for (let i = 0; i <= 100; i += 5) {
    await new Promise((resolve) => setTimeout(resolve, 55));
    progressBar.style.width = `${i}%`;
  }

  optimizedTriangles = Math.min(sourceTriangles - 100, target);
  const lowDensity = Math.max(45, Math.floor((optimizedTriangles / Math.max(sourceTriangles, 1)) * 900));
  drawMockMesh(lowCanvas, lowDensity, '#76f2ad');

  lowMeta.textContent = `Triangles: ${optimizedTriangles.toLocaleString()} (target)`;
  statusText.textContent = [
    'Mock retopology complete.',
    quadRetopoInput.checked ? 'Quads: ON' : 'Quads: OFF',
    genUvInput.checked ? 'UV generation: ON' : 'UV generation: OFF',
    bakeTexturesInput.checked ? 'Texture bake: ON' : 'Texture bake: OFF'
  ].join(' ');

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
    'UVRETOPO Mock Export',
    `Source file: ${selectedFile?.name || 'N/A'}`,
    `Source triangles: ${sourceTriangles}`,
    `Target triangles: ${optimizedTriangles}`,
    `Quad retopo: ${quadRetopoInput.checked}`,
    `Generate UV: ${genUvInput.checked}`,
    `Bake textures: ${bakeTexturesInput.checked}`
  ].join('\n');

  triggerDownload('low-poly-mesh-mock.txt', summary);
});

exportMapsBtn.addEventListener('click', () => {
  if (!processingDone || !bakeTexturesInput.checked) return;
  const summary = [
    'UVRETOPO Mock Baked Maps',
    `Asset: ${selectedFile?.name || 'N/A'}`,
    'Maps: albedo.png, normal.png, orm.png (placeholder)'
  ].join('\n');
  triggerDownload('baked-maps-mock.txt', summary);
});

// Initial placeholders.
drawMockMesh(highCanvas, 180, '#5c84d5');
drawMockMesh(lowCanvas, 65, '#3fb989');
