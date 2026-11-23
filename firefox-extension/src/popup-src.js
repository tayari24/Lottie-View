import { saveLatestFile } from './common.js';

const drop = document.getElementById('drop');
const input = document.getElementById('file');
const status = document.getElementById('status');

function isValid(file) {
  const n = file.name.toLowerCase();
  return n.endsWith('.lottie') || n.endsWith('.json');
}

async function openViewer(file) {
  if (!isValid(file)) {
    status.textContent = 'Please drop a .lottie or .json file.';
    return;
  }
  status.textContent = 'Opening ' + file.name + '…';
  const buffer = await file.arrayBuffer();
  await saveLatestFile(file.name, buffer);
  chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') });
  window.close();
}

drop.addEventListener('click', () => input.click());

input.addEventListener('change', () => {
  if (input.files[0]) openViewer(input.files[0]);
});

drop.addEventListener('dragover', (e) => {
  e.preventDefault();
  drop.classList.add('hover');
});

drop.addEventListener('dragleave', () => drop.classList.remove('hover'));

drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('hover');
  if (e.dataTransfer.files[0]) openViewer(e.dataTransfer.files[0]);
});
