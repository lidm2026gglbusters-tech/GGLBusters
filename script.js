/* =========================================================
   BUSTER CLUB — script.js
   1. Sistem Galeri Aktivitas: baca img/manifest.json lalu render
   2. Sistem Kritik & Saran: simpan ke localStorage + export JSON
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initGallery();
  initCritiqueForm();
  initLogoUploader();
});

/* ---------------------------------------------------------
   1) GALERI AKTIVITAS
   Membaca img/manifest.json (daftar {file, title, description}).
   Kalau kamu tambah foto baru: taruh file gambarnya di folder img/,
   lalu tambahkan entrinya di img/manifest.json. Galeri akan otomatis
   memuat ulang tanpa perlu edit index.html.

   Catatan: fetch() ke file lokal butuh dijalankan lewat server
   (misalnya "npx serve" atau Live Server), bukan dibuka langsung
   dari file:// — kalau gagal, kita pakai data cadangan di bawah.
--------------------------------------------------------- */

const FALLBACK_GALLERY = [
  { file: 'aktivitas-1.svg', title: 'Diskusi Terbuka: Gizi Anak Muda', description: 'Sesi ngobrol santai membahas pola makan sehat bareng anggota baru.' },
  { file: 'aktivitas-2.svg', title: 'Workshop Ilustrasi Publikasi', description: 'Belajar bikin visual kampanye ketahanan pangan bareng tim desain.' },
  { file: 'aktivitas-3.svg', title: 'Dapur Komunitas', description: 'Praktik masak bareng warga sekitar sambil bahas gizi seimbang.' },
  { file: 'aktivitas-4.svg', title: 'Kampanye Turun Jalan', description: 'Menyebarkan poster dan zine hasil publikasi ke titik-titik ramai.' },
];

async function initGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  let items = FALLBACK_GALLERY;

  try {
    const res = await fetch('img/manifest.json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) items = data;
    }
  } catch (err) {
    console.warn('Gagal memuat manifest.json, memakai data cadangan.', err);
  }

  renderGallery(grid, items);
}

function renderGallery(grid, items) {
  grid.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'gallery-card';
    card.innerHTML = `
      <img src="img/${item.file}" alt="${escapeHtml(item.title)}" loading="lazy">
      <div class="gallery-body">
        <h3 class="font-display font-600 text-base mb-1">${escapeHtml(item.title)}</h3>
        <p class="text-sm text-teal/70">${escapeHtml(item.description)}</p>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ---------------------------------------------------------
   2) SISTEM KRITIK & SARAN
   Disimpan di localStorage browser (bertahan walau tab ditutup,
   tapi hanya di browser/device itu saja karena belum ada backend).
   Ada tombol Export JSON untuk mengunduh semua masukan sekaligus.
--------------------------------------------------------- */

const STORAGE_KEY = 'busterclub_critiques';

function initCritiqueForm() {
  const form = document.getElementById('critique-form');
  if (!form) return;

  const stars = document.querySelectorAll('.rating-star');
  const ratingInput = document.getElementById('critique-rating-value');
  const statusEl = document.getElementById('critique-status');
  const exportBtn = document.getElementById('export-critique');

  // Interaksi rating bintang
  let currentRating = 0;
  stars.forEach(star => {
    star.addEventListener('click', () => {
      currentRating = Number(star.dataset.value);
      ratingInput.value = currentRating;
      updateStarDisplay(stars, currentRating);
    });
    star.addEventListener('mouseenter', () => updateStarDisplay(stars, Number(star.dataset.value)));
  });
  document.getElementById('critique-rating').addEventListener('mouseleave', () => {
    updateStarDisplay(stars, currentRating);
  });

  // Submit form
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const message = document.getElementById('critique-message').value.trim();
    if (!message) {
      document.getElementById('critique-message').focus();
      return;
    }

    const entry = {
      id: Date.now(),
      name: document.getElementById('critique-name').value.trim() || 'Anonim',
      email: document.getElementById('critique-email').value.trim(),
      rating: Number(ratingInput.value) || 0,
      message,
      createdAt: new Date().toISOString(),
    };

    saveCritique(entry);
    renderCritiqueList();

    form.reset();
    currentRating = 0;
    ratingInput.value = 0;
    updateStarDisplay(stars, 0);

    statusEl.classList.remove('hidden');
    setTimeout(() => statusEl.classList.add('hidden'), 3500);
  });

  exportBtn.addEventListener('click', exportCritiques);

  renderCritiqueList();
}

function updateStarDisplay(stars, value) {
  stars.forEach(star => {
    star.classList.toggle('is-active', Number(star.dataset.value) <= value);
  });
}

function getCritiques() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCritique(entry) {
  const list = getCritiques();
  list.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function renderCritiqueList() {
  const listEl = document.getElementById('critique-list');
  if (!listEl) return;

  const items = getCritiques();
  listEl.innerHTML = '';

  if (items.length === 0) {
    listEl.innerHTML = '<li class="text-teal/40 italic">Belum ada masukan.</li>';
    return;
  }

  items.slice(0, 20).forEach(item => {
    const li = document.createElement('li');
    li.className = 'border-b border-teal/5 pb-2';
    const stars = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
    li.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-semibold">${escapeHtml(item.name)}</span>
        <span class="text-golden text-xs">${stars}</span>
      </div>
      <p class="text-teal/60">${escapeHtml(item.message)}</p>
    `;
    listEl.appendChild(li);
  });
}

function exportCritiques() {
  const items = getCritiques();
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kritik-saran-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------
   3) GANTI LOGO
   Klik logo di navbar untuk upload gambar baru dari komputer.
   (Hanya berubah di browser kamu sendiri — untuk permanen,
   ganti langsung file img/logo-placeholder.svg dengan file logo asli
   memakai nama file yang sama.)
--------------------------------------------------------- */

function initLogoUploader() {
  const logo = document.getElementById('site-logo');
  if (!logo) return;

  logo.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => { logo.src = e.target.result; };
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

/* ---------------------------------------------------------
   Utility
--------------------------------------------------------- */
function escapeHtml(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
