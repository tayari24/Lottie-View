import { loadAnimationFromFile, loadLatestFile, saveLatestFile, renderLottie } from './common.js';

const animEl = document.getElementById('anim');
const nameEl = document.getElementById('filename');
const errorEl = document.getElementById('error');
const emptyEl = document.getElementById('empty');
const toolbar = document.getElementById('toolbar');
const playPauseBtn = document.getElementById('playpause');
const restartBtn = document.getElementById('restart');
const openBtn = document.getElementById('open');
const fileInput = document.getElementById('file');

let anim = null;

function showError(err) {
  emptyEl.style.display = 'none';
  animEl.style.display = 'none';
  toolbar.style.display = 'none';
  errorEl.style.display = 'block';
  errorEl.textContent = 'Failed to render: ' + (err && err.message ? err.message : String(err));
}

async function show(name, buffer) {
  try {
    const animationData = await loadAnimationFromFile({ name, arrayBuffer: async () => buffer });
    if (anim) anim.destroy();
    errorEl.style.display = 'none';
    emptyEl.style.display = 'none';
    animEl.style.display = 'flex';
    toolbar.style.display = 'flex';
    nameEl.textContent = name;
    document.title = name + ' — Lottie View';
    anim = renderLottie(animEl, animationData);
    playPauseBtn.textContent = 'Pause';
  } catch (err) {
    showError(err);
  }
}

async function pickFile(file) {
  const buffer = await file.arrayBuffer();
  await saveLatestFile(file.name, buffer);
  show(file.name, buffer);
}

// Initial load — read whatever the popup dropped
loadLatestFile().then((rec) => {
  if (rec) show(rec.name, rec.buffer);
  else emptyEl.style.display = 'block';
});

// Controls
playPauseBtn.addEventListener('click', () => {
  if (!anim) return;
  if (anim.isPaused) { anim.play(); playPauseBtn.textContent = 'Pause'; }
  else { anim.pause(); playPauseBtn.textContent = 'Play'; }
});

restartBtn.addEventListener('click', () => {
  if (!anim) return;
  anim.goToAndPlay(0, true);
  playPauseBtn.textContent = 'Pause';
});

openBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) pickFile(fileInput.files[0]);
});

// Drag & drop anywhere on the page
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]);
});
