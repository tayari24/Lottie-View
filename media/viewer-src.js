import lottie from 'lottie-web';
import JSZip from 'jszip';

const vscode = acquireVsCodeApi();

const animEl = document.getElementById('anim');
const toolbar = document.getElementById('toolbar');
const playPauseBtn = document.getElementById('playpause');
const restartBtn = document.getElementById('restart');
const errorEl = document.getElementById('error');

let anim = null;

function showError(err) {
  errorEl.style.display = 'block';
  errorEl.textContent = 'Failed to render Lottie animation:\n' + (err && err.message ? err.message : String(err));
  animEl.style.display = 'none';
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

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

  // Embed images as data URIs so they render inside the webview
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

async function loadAnimation(msg) {
  const bytes = b64ToBytes(msg.data);
  if (msg.format === 'lottie') {
    return loadDotLottie(bytes);
  }
  const animationData = JSON.parse(new TextDecoder().decode(bytes));
  // Apply pre-resolved webview URIs for relative image assets
  if (Array.isArray(msg.assets) && Array.isArray(animationData.assets)) {
    for (const a of msg.assets) {
      if (animationData.assets[a.index]) {
        animationData.assets[a.index].p = a.uri;
        animationData.assets[a.index].u = '';
      }
    }
  }
  return animationData;
}

function render(animationData) {
  if (anim) anim.destroy();
  errorEl.style.display = 'none';
  animEl.style.display = 'block';
  animEl.innerHTML = '';

  // Scale to fit the animation's native size, capped at 480px
  const w = (animationData.w || 512);
  const h = (animationData.h || 512);
  const scale = Math.min(1, 480 / Math.max(w, h));
  animEl.style.width = Math.round(w * scale) + 'px';
  animEl.style.height = Math.round(h * scale) + 'px';

  anim = lottie.loadAnimation({
    container: animEl,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData
  });
  toolbar.style.display = 'flex';
  playPauseBtn.textContent = 'Pause';
}

playPauseBtn.addEventListener('click', () => {
  if (!anim) return;
  if (anim.isPaused) {
    anim.play();
    playPauseBtn.textContent = 'Pause';
  } else {
    anim.pause();
    playPauseBtn.textContent = 'Play';
  }
});

restartBtn.addEventListener('click', () => {
  if (!anim) return;
  anim.goToAndPlay(0, true);
  playPauseBtn.textContent = 'Pause';
});

window.addEventListener('message', async (event) => {
  const msg = event.data;
  if (!msg || msg.type !== 'open') return;
  try {
    const animationData = await loadAnimation(msg);
    render(animationData);
  } catch (err) {
    showError(err);
  }
});
