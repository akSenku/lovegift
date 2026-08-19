// LoveGift is intentionally front-end only. Gift details are stored in the URL
// so the same link can be opened in another browser window during this prototype.
const screens = { landing: document.querySelector('#landing'), creator: document.querySelector('#creator'), created: document.querySelector('#created'), gift: document.querySelector('#gift') };
const form = document.querySelector('#gift-form');
const $ = (id) => document.querySelector(id);
let currentGift = null;

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove('active'));
  screens[name].classList.add('active');
  window.scrollTo(0, 0);
}

function safeText(value, fallback) { return value?.trim() || fallback; }

function readGiftFromUrl() {
  const params = new URLSearchParams(window.location.search);
  // A gift link is valid if it contains at least one gift detail. Missing details get friendly defaults.
  if (!['to', 'from', 'message', 'photo'].some((key) => params.has(key))) return null;
  return { to: safeText(params.get('to'), 'you'), from: safeText(params.get('from'), 'Someone special'), message: safeText(params.get('message'), 'You mean the world to me.'), photo: params.get('photo') || '' };
}

function updatePreview() {
  $('#preview-recipient').textContent = safeText($('#recipient').value, 'someone special');
}

function makeGiftUrl(gift) {
  const params = new URLSearchParams({ to: gift.to, from: gift.from, message: gift.message });
  if (gift.photo) params.set('photo', gift.photo);
  // Using URLSearchParams encodes spaces, emoji and punctuation safely.
  const shareUrl = new URL(window.location.href);
  shareUrl.search = params.toString();
  shareUrl.hash = '';
  return shareUrl.href;
}

// V3: QRCode.js turns the existing share URL into a QR image locally in the browser.
// Later, a database URL with a gift ID can use this same function unchanged.
function generateQrCode(shareUrl) {
  const qrContainer = $('#qr-code');
  const status = $('#qr-status');
  qrContainer.replaceChildren();
  status.textContent = '';
  try {
    if (typeof QRCode === 'undefined') throw new Error('QR library did not load');
    new QRCode(qrContainer, {
      text: shareUrl,
      width: 198,
      height: 198,
      colorDark: '#2b1522',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch (error) {
    status.textContent = "QR code couldn't be generated. You can still copy the gift link.";
  }
}

function getQrImageDataUrl() {
  const canvas = $('#qr-code canvas');
  const image = $('#qr-code img');
  if (canvas) return canvas.toDataURL('image/png');
  if (image && image.src.startsWith('data:image')) return image.src;
  return null;
}

function showCreatedScreen(gift, shareUrl) {
  currentGift = gift;
  $('#created-recipient').textContent = gift.to;
  $('#share-link').value = shareUrl;
  $('#copy-confirmation').textContent = '';
  generateQrCode(shareUrl);
  $('#share-gift').hidden = typeof navigator.share !== 'function';
  showScreen('created');
}

function loadGift(gift) {
  currentGift = gift;
  $('#gift-recipient').textContent = gift.to;
  $('#gift-sender').textContent = gift.from;
  $('#personal-message').textContent = gift.message;
  const photo = $('#gift-photo');
  photo.classList.remove('loaded'); photo.style.display = 'none'; photo.removeAttribute('src');
  if (gift.photo) {
    photo.src = gift.photo;
    photo.onload = () => { photo.style.display = 'block'; };
    photo.onerror = () => { photo.style.display = 'none'; };
  }
  resetGiftInteraction();
  showScreen('gift');
}

const noMessages = ['Are you sure? 🥺', 'Really? 😭', 'Think again! ❤️', 'One more chance? 🥹', 'Are you REALLY sure? 😭❤️'];
let noClicks = 0;
function resetGiftInteraction() {
  noClicks = 0;
  $('#question-text').textContent = 'Do you love me?';
  $('#question-sub').textContent = 'Choose carefully… no pressure. ✨';
  $('#no-counter').textContent = '';
  $('#yes-button').style.transform = '';
  $('#yes-button').style.fontSize = '';
  $('#yes-button').style.padding = '';
  $('#gift-question').style.display = '';
  $('#celebration').classList.remove('visible');
  $('#gift-box').classList.remove('open');
  $('#reveal-card').classList.remove('visible');
  $('#tap-note').textContent = 'Tap the gift to open it';
}

$('#no-button').addEventListener('click', () => {
  const message = noMessages[Math.min(noClicks, noMessages.length - 1)];
  noClicks += 1;
  $('#question-text').textContent = message;
  $('#question-sub').textContent = 'Maybe the YES button is looking a little more tempting…';
  $('#no-counter').textContent = noClicks > 1 ? `${noClicks} chances to reconsider ✨` : '';
  const scale = Math.min(1 + noClicks * 0.13, 1.62);
  $('#yes-button').style.transform = `scale(${scale})`;
  $('#yes-button').style.fontSize = `${1.05 + Math.min(noClicks * .08, .42)}rem`;
});

function throwConfetti() {
  const colors = ['#ff4f87', '#ffd15f', '#8560bd', '#6cc9b6', '#ff8d55'];
  const layer = $('#confetti'); layer.replaceChildren();
  for (let i = 0; i < 105; i += 1) {
    const piece = document.createElement('i');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty('--drift', `${(Math.random() - .5) * 260}px`);
    piece.style.animationDelay = `${Math.random() * .5}s`;
    layer.append(piece);
  }
  setTimeout(() => layer.replaceChildren(), 3800);
}

$('#yes-button').addEventListener('click', () => {
  $('#gift-question').style.display = 'none';
  $('#celebration').classList.add('visible');
  throwConfetti();
});

$('#gift-box').addEventListener('click', () => {
  const box = $('#gift-box');
  if (box.classList.contains('open')) return;
  box.classList.add('open');
  $('#tap-note').textContent = 'Your surprise is here ♥';
  setTimeout(() => $('#reveal-card').classList.add('visible'), 420);
  throwConfetti();
});

$('#start-button').addEventListener('click', () => showScreen('creator'));
$('#back-home').addEventListener('click', () => showScreen('landing'));
$('#created-home').addEventListener('click', () => showScreen('landing'));
$('#restart-button').addEventListener('click', () => {
  window.history.replaceState({}, '', window.location.pathname);
  showScreen('creator');
});
$('#recipient').addEventListener('input', updatePreview);

// Clipboard permission can vary by browser, so the fallback selects the link for manual copying.
$('#copy-link').addEventListener('click', async () => {
  const linkField = $('#share-link');
  try {
    await navigator.clipboard.writeText(linkField.value);
    $('#copy-confirmation').textContent = 'Link copied! ❤️';
  } catch (error) {
    linkField.focus();
    linkField.select();
    $('#copy-confirmation').textContent = 'Link selected — press Ctrl + C to copy. ❤️';
  }
});

$('#download-qr').addEventListener('click', () => {
  const qrImage = getQrImageDataUrl();
  if (!qrImage) {
    $('#qr-status').textContent = "QR code isn't available to download. You can still copy the gift link.";
    return;
  }
  const downloadLink = document.createElement('a');
  downloadLink.href = qrImage;
  downloadLink.download = 'LoveGift-QR.png';
  downloadLink.click();
});

$('#share-gift').addEventListener('click', async () => {
  try {
    await navigator.share({ title: 'A LoveGift for you ❤️', text: 'I made a little surprise for you!', url: $('#share-link').value });
  } catch (error) {
    // Closing the native share sheet is normal, so no error message is needed here.
  }
});

$('#open-gift').addEventListener('click', () => {
  // Reloading the generated URL proves the recipient view uses the same share link as the QR code.
  window.location.assign($('#share-link').value);
});

$('#another-gift').addEventListener('click', () => {
  window.history.replaceState({}, '', window.location.pathname);
  form.reset();
  updatePreview();
  showScreen('creator');
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const gift = { to: safeText($('#recipient').value, 'you'), from: safeText($('#sender').value, 'Someone special'), message: safeText($('#message').value, 'You mean the world to me.'), photo: $('#photo').value.trim() };
  // Later, this is the one place where a database call can create a unique gift ID.
  const shareUrl = makeGiftUrl(gift);
  window.history.pushState({}, '', shareUrl);
  showCreatedScreen(gift, shareUrl);
});

window.addEventListener('popstate', () => {
  const gift = readGiftFromUrl();
  if (gift) loadGift(gift); else showScreen('landing');
});

const linkedGift = readGiftFromUrl();
if (linkedGift) loadGift(linkedGift); else showScreen('landing');
