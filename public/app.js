import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.165.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';

const form = document.getElementById('uploadForm');
const modelInput = document.getElementById('modelInput');
const targetPercentInput = document.getElementById('targetPercent');
const targetValue = document.getElementById('targetValue');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const sourceTrianglesEl = document.getElementById('sourceTriangles');
const optimizedTrianglesEl = document.getElementById('optimizedTriangles');
const retainedPercentEl = document.getElementById('retainedPercent');
const downloadLink = document.getElementById('downloadLink');

const loader = new GLTFLoader();

function createViewer(canvas) {
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

  const dir = new THREE.DirectionalLight(0xffffff, 1.4);
  dir.position.set(3, 5, 3);
  scene.add(dir);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1000);
  camera.position.set(2.4, 2, 2.4);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  const grid = new THREE.GridHelper(10, 20, 0x94a3b8, 0x334155);
  scene.add(grid);

  let object = null;

  function setModel(next) {
    if (object) {
      scene.remove(object);
      object.traverse((child) => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material?.dispose();
        }
      });
    }
    object = next;
    if (!object) return;

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()).length() || 1;
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);

    camera.near = size / 100;
    camera.far = size * 100;
    camera.position.set(size * 0.8, size * 0.6, size * 0.8);
    camera.lookAt(0, 0, 0);
    controls.update();

    scene.add(object);
  }

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
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

const sourceViewer = createViewer(document.getElementById('sourceCanvas'));
const optimizedViewer = createViewer(document.getElementById('optimizedCanvas'));

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#fca5a5' : '#93c5fd';
}

async function loadModelIntoViewer(url, viewer) {
  const gltf = await loader.loadAsync(url);
  viewer.setModel(gltf.scene);
}

targetPercentInput.addEventListener('input', () => {
  targetValue.textContent = `${targetPercentInput.value}%`;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const file = modelInput.files?.[0];
  if (!file) return;

  const objectUrl = URL.createObjectURL(file);
  resultsEl.classList.add('hidden');

  try {
    setStatus('Loading original high-poly model…');
    await loadModelIntoViewer(objectUrl, sourceViewer);

    const formData = new FormData(form);

    setStatus('Retopology and texture transfer in progress…');
    const response = await fetch('/api/optimize', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.details || 'Unknown optimization error');

    const optimizedUrl = `${data.downloadUrl}?cacheBust=${Date.now()}`;

    setStatus('Loading optimized low-poly preview…');
    await loadModelIntoViewer(optimizedUrl, optimizedViewer);

    sourceTrianglesEl.textContent = Number(data.sourceTriangles).toLocaleString();
    optimizedTrianglesEl.textContent = Number(data.optimizedTriangles).toLocaleString();
    retainedPercentEl.textContent = data.retainedPercent;
    downloadLink.href = data.downloadUrl;
    resultsEl.classList.remove('hidden');

    setStatus('Optimization complete. Download your game-ready model below.');
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
});
