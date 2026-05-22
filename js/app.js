// Cloudflare worker API endpoint (leave empty to use local data.js)

const CLOUDFLARE_API_URL = "https://temple-data.tkm22092.workers.dev";
// Only load strictly from data.js initially. 
let data = window.templeData;
let lightboxImages = [];
let activeLightboxIndex = 0;

async function init() {
  if (CLOUDFLARE_API_URL) {
    try {
      const res = await fetch(CLOUDFLARE_API_URL);
      if (res.ok) {
        const cloudData = await res.json();
        if (cloudData) {
          data = cloudData;
        }
      }
    } catch (e) {
      console.log("Failed to load from Cloudflare, using fallback data.js", e);
    }
  }

  applyGlobalSettings();
  renderDeities();
  renderStory();
  renderPoojas();
  renderUlsavam();
  if (typeof renderVidhana === 'function') renderVidhana();
  renderGalleryTabs();
  renderTrustees();
  renderAcharyas();
  renderAdministration();
  if (typeof renderPunarnirmanam === 'function') renderPunarnirmanam();

  // Animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      const navLinks = document.getElementById('navLinks');
      if(navLinks) navLinks.classList.remove('open');
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function applyGlobalSettings() {
  if (data.global && data.global.heroImage) {
    const heroBg = document.getElementById('heroBgImg');
    if(heroBg) heroBg.style.backgroundImage = `url(${data.global.heroImage})`;
  }

  if (data.global && data.global.notification && data.global.notification.enabled) {
    const modal = document.getElementById('notificationModal');
    const mTitle = document.getElementById('notifTitle');
    const mBody = document.getElementById('notifBody');
    if(modal && mTitle && mBody) {
      mTitle.innerText = data.global.notification.title;
      mBody.innerText = data.global.notification.text;
      setTimeout(() => modal.classList.add('active'), 800);
    }
  }
}

function renderDeities() {
  const grid = document.getElementById('deitiesGrid');
  if (!grid) return;
  grid.innerHTML = data.deities.map(d => `
    <div class="deity-card">
      <div class="deity-icon">${d.icon}</div>
      <div class="deity-name">${d.name}</div>
      ${d.main ? `<div class="deity-main">${d.main}</div>` : ''}
      <div class="deity-desc">${d.desc}</div>
    </div>
  `).join('');
}

function renderStory() {
  const container = document.getElementById('storyContent');
  if (!container) return;
  container.innerHTML = data.story.map(p => `<p>${p}</p>`).join('');
}

function renderPoojas() {
  const grid = document.getElementById('poojasGrid');
  if (!grid) return;
  grid.innerHTML = data.poojas.map(p => `
    <div class="pooja-card">
      <div class="pooja-name">${p.name}</div>
      <div class="pooja-desc">${p.desc}</div>
      <span class="pooja-benefit">✦ ${p.benefit}</span>
    </div>
  `).join('');
}

function renderUlsavam() {
  const title = document.getElementById('ulsavamTitle');
  const dateRange = document.getElementById('ulsavamDateRange');
  const grid = document.getElementById('ulsavamGrid');
  const ulsavamBanner = document.getElementById('ulsavamBanner');
  
  if (!title || !grid) return;

  title.innerText = `Ulsavam ${data.ulsavam.year}`;
  
  const startObj = new Date(data.ulsavam.startDate);
  const endObj = new Date(data.ulsavam.endDate);
  const options = { month: 'long', day: 'numeric' };
  dateRange.innerText = `${startObj.toLocaleDateString('en-US', options)} – ${endObj.toLocaleDateString('en-US', options)}, ${data.ulsavam.year}`;

  const now = new Date();
  const isActive = now >= startObj && now <= endObj;

  if (!isActive && ulsavamBanner) {
    ulsavamBanner.style.background = 'linear-gradient(135deg, #5C3D10, #2C1A00)';
    ulsavamBanner.innerHTML = `<span style="opacity:0.6">◈</span> Last Ulsavam: ${startObj.toLocaleDateString('en-US', options)}–${endObj.toLocaleDateString('en-US', { day: 'numeric' })}, ${data.ulsavam.year} &nbsp;·&nbsp; View Archive <span style="opacity:0.6">◈</span>`;
  }

  grid.innerHTML = data.ulsavam.days.map(d => {
    // Basic detection for "Today"
    const isToday = isActive && (now.toLocaleDateString() === new Date(`${d.date.split(',')[0]} ${data.ulsavam.year}`).toLocaleDateString());
    return `
      <div class="day-item">
        <div class="day-num"><div class="num">${d.day}</div><div class="label">Day</div></div>
        <div class="day-content">
          <div class="day-date">${d.date}</div>
          <div class="day-title">${d.title} ${isToday ? '<span class="active-badge">Today</span>' : ''}</div>
          <div class="day-details">${d.details}</div>
          ${d.programmes && d.programmes.length > 0 ? `
            <div class="programmes-list">
              ${d.programmes.map(p => `<div class="prog-item"><div class="prog-time">${p.time}</div><div class="prog-name">${p.name}</div></div>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderVidhana() {
  const grid = document.getElementById('vidhanaGrid');
  if (!grid) return;
  grid.innerHTML = data.vidhana.map(v => `
    <div class="ritual-step">
      <div>
        <div class="ritual-step-title">${v.title}</div>
        <div class="ritual-step-desc">${v.desc}</div>
      </div>
    </div>
  `).join('');
}


function renderPunarnirmanam() {
  const grid = document.getElementById('punarGrid');
  if (!grid) return;
  grid.innerHTML = data.punarnirmanam.map((p, index) => `
    <div class="punar-card" onclick="this.classList.toggle('expanded')">
      <div class="punar-header">
        <div class="punar-title">${index + 1}. ${p.title}</div>
        <div class="punar-toggle">▼</div>
      </div>
      <div class="punar-body">
        ${p.img ? `<div class="punar-img"><img src="${p.img}" alt="${p.title}" loading="lazy"></div>` : ''}
        <div class="punar-desc">${p.desc}</div>
      </div>
    </div>
  `).join('');
}


function renderGalleryTabs() {
  const container = document.getElementById('galleryTabs');
  if (!container || !data.gallery) return;

  // Use galleryAlbums order if defined, else fall back to object keys
  const albums = (data.galleryAlbums && data.galleryAlbums.length)
    ? data.galleryAlbums
    : Object.keys(data.gallery);

  container.innerHTML = albums.map((a, i) => `
    <button class="album-tab ${i === 0 ? 'active' : ''}" 
            data-album="${a}" 
            onclick="window.setAlbum(this)">${a}</button>
  `).join('');

  buildGallery();
}

window.setAlbum = function(el) {
  document.querySelectorAll('.album-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  buildGallery();
}

function buildGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  const activeBtn = document.querySelector('.album-tab.active');
  if (!activeBtn) return;

  // Use data-album attribute to avoid innerText whitespace/case issues
  const albumName = activeBtn.dataset.album;
  const images = (data.gallery && data.gallery[albumName]) || [];

  grid.innerHTML = '';

  if (images.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:4rem; color:var(--muted); font-style:italic;">No photos uploaded for this album yet.</div>`;
    return;
  }

  lightboxImages = images.filter(img => img && img.url);

  lightboxImages.forEach((img, index) => {
    const div = document.createElement('div');
    div.className = 'gallery-item';

    const image = document.createElement('img');
    image.src = img.url;
    image.alt = img.label || albumName;
    image.title = img.label || albumName;
    image.loading = 'lazy';
    image.decoding = 'async';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-open';
    button.setAttribute('aria-label', `Open ${image.alt}`);
    button.addEventListener('click', () => openLightbox(index));
    button.appendChild(image);

    div.appendChild(button);
    grid.appendChild(div);
  });
}

function ensureLightbox() {
  let lightbox = document.getElementById('galleryLightbox');
  if (lightbox) return lightbox;

  lightbox = document.createElement('div');
  lightbox.id = 'galleryLightbox';
  lightbox.className = 'gallery-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Gallery image viewer');
  lightbox.innerHTML = `
    <button type="button" class="lightbox-close" aria-label="Close image viewer">&times;</button>
    <button type="button" class="lightbox-nav lightbox-prev" aria-label="Previous image">&#8249;</button>
    <figure class="lightbox-frame">
      <img class="lightbox-image" alt="">
      <figcaption class="lightbox-caption"></figcaption>
    </figure>
    <button type="button" class="lightbox-nav lightbox-next" aria-label="Next image">&#8250;</button>
  `;

  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) closeLightbox();
  });
  lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  lightbox.querySelector('.lightbox-prev').addEventListener('click', () => showLightboxImage(activeLightboxIndex - 1));
  lightbox.querySelector('.lightbox-next').addEventListener('click', () => showLightboxImage(activeLightboxIndex + 1));

  document.body.appendChild(lightbox);
  return lightbox;
}

function openLightbox(index) {
  if (!lightboxImages.length) return;

  const lightbox = ensureLightbox();
  showLightboxImage(index);
  lightbox.classList.add('active');
  document.body.classList.add('lightbox-open');
  lightbox.querySelector('.lightbox-close').focus();
  document.addEventListener('keydown', handleLightboxKeydown);
}

function closeLightbox() {
  const lightbox = document.getElementById('galleryLightbox');
  if (!lightbox) return;

  lightbox.classList.remove('active');
  document.body.classList.remove('lightbox-open');
  document.removeEventListener('keydown', handleLightboxKeydown);
}

function showLightboxImage(index) {
  const lightbox = ensureLightbox();
  activeLightboxIndex = (index + lightboxImages.length) % lightboxImages.length;

  const item = lightboxImages[activeLightboxIndex];
  const image = lightbox.querySelector('.lightbox-image');
  const caption = lightbox.querySelector('.lightbox-caption');
  const label = item.label || '';

  image.src = item.url;
  image.alt = label || 'Temple gallery photo';
  caption.textContent = label;
  caption.hidden = !label;

  const hideNav = lightboxImages.length < 2;
  lightbox.querySelector('.lightbox-prev').hidden = hideNav;
  lightbox.querySelector('.lightbox-next').hidden = hideNav;
}

function handleLightboxKeydown(event) {
  if (event.key === 'Escape') closeLightbox();
  if (event.key === 'ArrowLeft') showLightboxImage(activeLightboxIndex - 1);
  if (event.key === 'ArrowRight') showLightboxImage(activeLightboxIndex + 1);
}











function renderTrustees() {
  const grid = document.getElementById('trusteesGrid');
  if (!grid) return;
  grid.innerHTML = data.trustees.map(t => `
    <div class="trustee-card">
      <div class="trustee-avatar">
        ${t.photo ? `<img src="${t.photo}" alt="${t.name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` : t.initials}
      </div>
      <div class="trustee-name">${t.name}</div>
      <div class="trustee-address">${t.address}</div>
    </div>
  `).join('');
}

function renderAcharyas() {
  const grid = document.getElementById('acharyasGrid');
  if (!grid) return;
  grid.innerHTML = data.acharyas.map(t => `
    <div class="trustee-card" style="box-shadow: var(--shadow); background: #fff;">
      <div class="trustee-avatar">
        ${t.photo ? `<img src="${t.photo}" alt="${t.name}" style="width:100%; height:100%; object-fit:cover; border-radius:4%;">` : t.name.substring(0,2) || t.role.substring(0,2)}
      </div>
      <div class="trustee-name">${t.name}</div>
      <div class="trustee-address">${t.role}</div>
    </div>
  `).join('');
}

function renderAdministration() {
  const container = document.getElementById('adminGrid');
  if (!container) return;
  
  const groups = {};
  data.contacts.forEach(c => {
    const cat = c.category || 'Other';
    if(!groups[cat]) groups[cat] = [];
    groups[cat].push(c);
  });
  
  let html = '';
  for (const cat in groups) {
    html += `<h3 style="text-align:center; margin: 2rem 0 1.5rem; color:var(--dark); font-family:var(--font-head); font-size: 1.2rem;">◈ ${cat} ◈</h3>`;
    html += `<div class="contact-grid">`;
    groups[cat].forEach(c => {
      html += `
        <div class="contact-card">
          <div class="contact-role">${c.role}</div>
          <div class="contact-name">${c.name}</div>
          <div class="contact-phone">${c.phone}</div>
        </div>
      `;
    });
    html += `</div>`;
  }
  
  container.innerHTML = html;
}

window.toggleNav = function() {
  document.getElementById('navLinks').classList.toggle('open');
}
