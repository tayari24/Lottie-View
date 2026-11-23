import lottie from 'lottie-web';
import JSZip from 'jszip';

function mimeFromName(name) {
  const ext = name.split('.').pop().toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

async function loadDotLottie(bytes) {
  const zip = await JSZip.loadAsync(bytes);

  let animationPath = null;
  const manifestFile = zip.file('manifest.json');
  if (manifestFile) {
    const manifest = JSON.parse(await manifestFile.async('string'));
    if (manifest.animations && manifest.animations.length > 0) {
      const first = manifest.animations[0];
      animationPath = first.p || `animations/${first.id}.json`;
    }
  }
  if (!animationPath) {
    const candidates = Object.keys(zip.files)
      .filter(n => n.endsWith('.json') && !n.endsWith('manifest.json') && !zip.files[n].dir);
    animationPath = candidates[0];
  }
  if (!animationPath) throw new Error('No animation JSON found inside .lottie package');

  const dir = animationPath.includes('/') ? animationPath.slice(0, animationPath.lastIndexOf('/') + 1) : '';
  const animationData = JSON.parse(await zip.file(animationPath).async('string'));

  // Embed images as data URIs so they render without packaging-relative paths
  if (Array.isArray(animationData.assets)) {
    for (const asset of animationData.assets) {
      if (asset && asset.p && !asset.p.startsWith('data:')) {
        const file = zip.file(dir + asset.p) || zip.file(asset.p);
        if (file) {
          const b64 = await file.async('base64');
          asset.p = `data:${mimeFromName(asset.p)};base64,${b64}`;
          asset.u = '';
        }
      }
    }
  }
  return animationData;
}

export async function loadAnimationFromFile(file) {
  const bytes = await file.arrayBuffer();
  if (file.name.toLowerCase().endsWith('.lottie')) {
    return loadDotLottie(new Uint8Array(bytes));
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

// --- IndexedDB: hand the picked file from the popup to the viewer tab ---

const DB_NAME = 'lottie-view';
const STORE = 'files';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLatestFile(name, buffer) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ name, buffer }, 'latest');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadLatestFile() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('latest');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export function renderLottie(animEl, animationData) {
  const w = animationData.w || 512;
  const h = animationData.h || 512;
  const scale = Math.min(1, 480 / Math.max(w, h));
  animEl.style.width = Math.round(w * scale) + 'px';
  animEl.style.height = Math.round(h * scale) + 'px';
  animEl.innerHTML = '';
  return lottie.loadAnimation({
    container: animEl,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData
  });
}
