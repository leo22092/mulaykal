// ============================================================
//  admin.js  —  Temple Admin Panel
//  ➤ Set CLOUDFLARE_API_URL to your deployed worker URL
//  ➤ Admins are prompted for the secret password on save
// ============================================================

const CLOUDFLARE_API_URL = "https://temple-data.tkm22092.workers.dev"; 

let state = null;

// ── Bootstrap ────────────────────────────────────────────────
async function initAdmin() {
  // Load fallback from data.js
  try {
    state = JSON.parse(JSON.stringify(window.templeData));
  } catch (e) {
    state = {};
  }

  // Fetch latest from Cloudflare (read is unauthenticated)
  if (CLOUDFLARE_API_URL) {
    try {
      const res = await fetch(CLOUDFLARE_API_URL);
      if (res.ok) {
        const cloudData = await res.json();
        if (cloudData && Object.keys(cloudData).length > 0) {
          state = cloudData;
          console.log("✅ Loaded latest data from Cloudflare.");
        }
      }
    } catch (e) {
      console.log("⚠️ Could not fetch from Cloudflare. Using local data.js.", e);
    }
  }

  if (!state.global) state.global = { heroImage: null, notification: { enabled: false, title: "", text: "" } };
  render();
}

let currentTab = 'trustees';

// ── Tab Navigation ───────────────────────────────────────────
window.switchTab = function (tab, element) {
  currentTab = tab;
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  if (element && element.classList) {
    element.classList.add('active');
  }
  document.getElementById('pageTitle').innerText = tab.charAt(0).toUpperCase() + tab.slice(1);
  render();
}

window.render = function () {
  const area = document.getElementById('contentArea');
  if (currentTab === 'trustees') renderTrustees(area);
  else if (currentTab === 'acharyas') renderAcharyas(area);
  else if (currentTab === 'poojas') renderPoojas(area);
  else if (currentTab === 'contacts') renderContacts(area);
  else if (currentTab === 'story') renderStory(area);
  else if (currentTab === 'documents') renderDocuments(area);
  else if (currentTab === 'gallery') window.renderGallery(area);
  else if (currentTab === 'ulsavam') renderUlsavam(area);
}

// ── Cloud Save (Password Protected) ─────────────────────────
window.saveToCloud = async function () {
  if (!CLOUDFLARE_API_URL) {
    alert("⚠️ Please set CLOUDFLARE_API_URL in admin.js first!");
    return;
  }

  // Prompt for the admin password
  const password = prompt("🔐 Enter admin password to save to cloud:");
  if (!password) return;

  const btn = document.getElementById('saveCloudBtn');
  if (btn) btn.innerText = "⏳ Saving...";

  try {
    const res = await fetch(CLOUDFLARE_API_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${password}`
      },
      body: JSON.stringify(state)
    });

    const result = await res.json();

    if (res.ok) {
      alert("✅ Saved to Cloudflare successfully!\nThe live temple site will now reflect your changes.");
    } else if (res.status === 401) {
      alert("❌ Incorrect password. Changes not saved.");
    } else {
      alert("❌ Save failed: " + (result.error || res.status));
    }
  } catch (e) {
    alert("❌ Connection error. Could not reach Cloudflare.\n" + e.message);
  } finally {
    if (btn) btn.innerText = "☁️ Save to Cloud";
  }
}

// ── Export data.js (local backup) ───────────────────────────
window.exportDataJS = function () {
  const content = `window.templeData = ${JSON.stringify(state, null, 2)};`;
  const blob = new Blob([content], { type: "text/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data.js";
  a.click();
}

// quietSave kept for compatibility but no longer writes to localStorage
// (data lives in Cloudflare now; local edits are in-memory until "Save to Cloud")
window.quietSave = function () {
  // intentionally no-op for localStorage; state is in-memory
}

// ── Utility ──────────────────────────────────────────────────
window.parseImageUrl = function (url) {
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return 'https://drive.google.com/uc?id=' + driveMatch[1];
  const driveOpenMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (url.includes('drive.google.com') && driveOpenMatch) return 'https://drive.google.com/uc?id=' + driveOpenMatch[1];
  return url;
}

// ── GALLERY ──────────────────────────────────────────────────
window.renderGallery = function (area) {
  if (!state.gallery) state.gallery = { "Ulsavam 2026": [] };
  const albums = Object.keys(state.gallery);

  let html = `<div class="card"><h3>Manage Gallery & Archives</h3>
    <div class="form-group flex-row">
      <div style="flex:1"><label>Select Album</label><select id="g_album" onchange="window.renderGalleryGrid()">`;
  albums.forEach(a => { html += `<option value="${a}">${a}</option>`; });
  html += `</select></div>
      <button class="btn-secondary" style="margin-top:20px;" onclick="window.addGalleryArchive()">+ New Album</button>
    </div>
    <div class="form-group">
      <label>Add photo URL</label>
      <div style="display:flex; gap:10px; margin-bottom:8px;">
        <input type="text" id="g_url" placeholder="Paste Image URL (Google Drive, Imgur, etc.)" style="flex:1;">
        <button class="btn-secondary" onclick="window.addPhotoUrl()">Add</button>
      </div>
      <p style="font-size:11px; color:#3498db; margin-top:4px;">Photos stored as links — no storage limits.</p>
    </div>
  </div>
  <div id="g_grid" class="grid-list" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));"></div>`;
  area.innerHTML = html;
  setTimeout(window.renderGalleryGrid, 10);
}

window.addPhotoUrl = function () {
  const album = document.getElementById('g_album').value;
  let url = document.getElementById('g_url').value.trim();
  if (url) {
    url = window.parseImageUrl(url);
    if (!state.gallery[album]) state.gallery[album] = [];
    state.gallery[album].push({ url, label: "" });
    window.renderGalleryGrid();
    document.getElementById('g_url').value = '';
  }
}

window.renderGalleryGrid = function () {
  const album = document.getElementById('g_album').value;
  const grid = document.getElementById('g_grid');
  if (!grid) return;
  const images = state.gallery[album] || [];
  let html = '';
  images.forEach((img, index) => {
    html += `
      <div class="card" style="padding:0.5rem;text-align:center;">
        <img src="${img.url}" style="width:100%; height:120px; object-fit:cover; border-radius:4px;">
        <input type="text" value="${img.label || ''}" placeholder="Caption"
          onchange="window.updateGalleryLabel('${album}', ${index}, this.value)"
          style="box-sizing:border-box; width:100%; margin: 5px 0;">
        <button class="btn-danger" style="padding: 4px; width:100%;" onclick="window.deletePhoto('${album}', ${index})">Delete</button>
      </div>`;
  });
  grid.innerHTML = html;
}

window.updateGalleryLabel = function (album, index, val) {
  state.gallery[album][index].label = val;
}

window.deletePhoto = function (album, index) {
  if (confirm("Delete photo?")) {
    state.gallery[album].splice(index, 1);
    window.renderGalleryGrid();
  }
}

window.addGalleryArchive = function () {
  const name = prompt("New Album name (e.g. Ulsavam 2023):");
  if (name && !state.gallery[name]) {
    state.gallery[name] = [];
    render();
  } else if (name) {
    alert("Album already exists!");
  }
}

// ── TRUSTEES ─────────────────────────────────────────────────
function renderTrustees(area) {
  let html = `<button onclick="window.addTrustee()" style="margin-bottom:1rem;">+ Add Trustee</button><div class="grid-list">`;
  state.trustees.forEach((t, i) => {
    html += `
    <div class="card">
      <div class="flex-row">
        <div>
          <strong>${t.name}</strong> <span style="color:#888;">(${t.initials})</span>
          <p style="margin:4px 0;font-size:0.9rem;">${t.address}</p>
        </div>
        ${t.photo ? `<img src="${t.photo}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;">` : ''}
        <div>
          <button class="btn-secondary" onclick="window.editTrustee(${i})">Edit</button>
          <button class="btn-danger" onclick="window.deleteTrustee(${i})">Delete</button>
        </div>
      </div>
    </div>`;
  });
  area.innerHTML = html + "</div>";
}

window.addTrustee = function () {
  const name = prompt("Trustee Name:");
  if (name) {
    state.trustees.push({ name, initials: name.substring(0, 2).toUpperCase(), photo: null, address: "" });
    render();
  }
}

window.deleteTrustee = function (i) {
  if (confirm("Delete trustee?")) { state.trustees.splice(i, 1); render(); }
}

window.editTrustee = function (i) {
  const t = state.trustees[i];
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div class="card">
      <h3>Edit Trustee</h3>
      <div class="form-group"><label>Name</label><input type="text" id="t_name" value="${t.name}"></div>
      <div class="form-group"><label>Initials</label><input type="text" id="t_initials" value="${t.initials}"></div>
      <div class="form-group"><label>Address</label><textarea id="t_address">${t.address}</textarea></div>
      <div class="form-group">
        <label>Photo URL</label>
        <input type="text" id="t_photo_url" placeholder="Paste Image URL" style="width:100%;" value="${t.photo && t.photo.startsWith('http') ? t.photo : ''}">
        ${t.photo ? `<img src="${t.photo}" style="max-height:80px; margin-top:10px;">` : ''}
      </div>
      <button onclick="window.saveTrustee(${i})">Save</button>
      <button class="btn-secondary" onclick="render()">Cancel</button>
    </div>`;
}

window.saveTrustee = function (i) {
  state.trustees[i].name = document.getElementById('t_name').value;
  state.trustees[i].initials = document.getElementById('t_initials').value;
  state.trustees[i].address = document.getElementById('t_address').value;
  const photoUrl = document.getElementById('t_photo_url').value.trim();
  if (photoUrl) state.trustees[i].photo = window.parseImageUrl(photoUrl);
  render();
}

// ── ACHARYAS ─────────────────────────────────────────────────
function renderAcharyas(area) {
  let html = `<button onclick="window.addAcharya()" style="margin-bottom:1rem;">+ Add Acharya</button><div class="grid-list">`;
  state.acharyas.forEach((a, i) => {
    html += `
    <div class="card">
      <div class="flex-row">
        <div>
          <strong>${a.name}</strong>
          <p style="margin:4px 0;font-size:0.9rem;color:#aaa;">${a.role}</p>
        </div>
        ${a.photo ? `<img src="${a.photo}" style="width:50px;height:50px;border-radius:4px;object-fit:cover;">` : ''}
        <div>
          <button class="btn-secondary" onclick="window.editAcharya(${i})">Edit</button>
          <button class="btn-danger" onclick="window.deleteAcharya(${i})">Delete</button>
        </div>
      </div>
    </div>`;
  });
  area.innerHTML = html + "</div>";
}

window.addAcharya = function () {
  const name = prompt("Acharya Name:");
  if (name) {
    state.acharyas.push({ name, role: "Role", photo: null });
    render();
  }
}

window.deleteAcharya = function (i) {
  if (confirm("Delete?")) { state.acharyas.splice(i, 1); render(); }
}

window.editAcharya = function (i) {
  const a = state.acharyas[i];
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div class="card">
      <h3>Edit Acharya</h3>
      <div class="form-group"><label>Name</label><input type="text" id="a_name" value="${a.name}"></div>
      <div class="form-group"><label>Role (e.g. Tantri, Sthapathi)</label><input type="text" id="a_role" value="${a.role}"></div>
      <div class="form-group">
        <label>Photo URL</label>
        <input type="text" id="a_photo_url" placeholder="Paste Image URL" style="width:100%;" value="${a.photo && a.photo.startsWith('http') ? a.photo : ''}">
        ${a.photo ? `<img src="${a.photo}" style="max-height:80px; margin-top:10px;">` : ''}
      </div>
      <button onclick="window.saveAcharya(${i})">Save</button>
      <button class="btn-secondary" onclick="render()">Cancel</button>
    </div>`;
}

window.saveAcharya = function (i) {
  state.acharyas[i].name = document.getElementById('a_name').value;
  state.acharyas[i].role = document.getElementById('a_role').value;
  const photoUrl = document.getElementById('a_photo_url').value.trim();
  if (photoUrl) state.acharyas[i].photo = window.parseImageUrl(photoUrl);
  render();
}

// ── POOJAS ───────────────────────────────────────────────────
function renderPoojas(area) {
  let html = `<button onclick="window.addPooja()" style="margin-bottom:1rem;">+ Add Pooja</button><div class="grid-list">`;
  state.poojas.forEach((p, i) => {
    html += `
    <div class="card">
      <strong>${p.name}</strong>
      <p style="font-size:0.85rem; margin:4px 0;">${p.benefit}</p>
      <div style="margin-top:8px;">
        <button class="btn-secondary" onclick="window.editPooja(${i})">Edit</button>
        <button class="btn-danger" onclick="window.deletePooja(${i})">Delete</button>
      </div>
    </div>`;
  });
  area.innerHTML = html + "</div>";
}

window.addPooja = function () {
  state.poojas.push({ name: "New Pooja", desc: "", benefit: "" });
  render();
}

window.deletePooja = function (i) {
  if (confirm("Delete?")) { state.poojas.splice(i, 1); render(); }
}

window.editPooja = function (i) {
  const p = state.poojas[i];
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div class="card">
      <h3>Edit Pooja</h3>
      <div class="form-group"><label>Name</label><input type="text" id="p_name" value="${p.name}"></div>
      <div class="form-group"><label>Description</label><textarea id="p_desc" style="height:100px;">${p.desc}</textarea></div>
      <div class="form-group"><label>Benefit</label><input type="text" id="p_benefit" value="${p.benefit}"></div>
      <button onclick="window.savePooja(${i})">Save</button>
      <button class="btn-secondary" onclick="render()">Cancel</button>
    </div>`;
}

window.savePooja = function (i) {
  state.poojas[i].name = document.getElementById('p_name').value;
  state.poojas[i].desc = document.getElementById('p_desc').value;
  state.poojas[i].benefit = document.getElementById('p_benefit').value;
  render();
}

// ── STORY ────────────────────────────────────────────────────
function renderStory(area) {
  area.innerHTML = `
    <div class="card">
      <h3>Temple Story / History</h3>
      <p style="font-size:0.85rem; color:#aaa; margin-bottom:1rem;">Each paragraph on a new line.</p>
      <textarea id="s_text" style="height:300px; width:100%; box-sizing:border-box;">${state.story.join('\n\n')}</textarea>
      <br><br>
      <button onclick="window.saveStory()">Save Story</button>
    </div>`;
}

window.saveStory = function () {
  state.story = document.getElementById('s_text').value
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);
  alert("Story saved in memory. Click '☁️ Save to Cloud' to publish.");
}

// ── CONTACTS / ADMINISTRATION ────────────────────────────────
function renderContacts(area) {
  let html = `
  <div class="card" style="margin-bottom:1.5rem;">
    <h3>Global Settings</h3>
    <div class="form-group">
      <label>Hero Image URL</label>
      <div style="display:flex; gap:10px;">
        <input type="text" id="g_hero_url" placeholder="Paste Image URL" style="flex:1;" value="${state.global && state.global.heroImage ? state.global.heroImage : ''}">
        <button class="btn-secondary" onclick="window.saveHeroUrl()">Set Hero</button>
      </div>
    </div>
    <div class="form-group">
      <label><input type="checkbox" id="g_notif_enabled" ${state.global.notification.enabled ? 'checked' : ''}> Enable Notification Banner</label>
      <input type="text" id="g_notif_title" placeholder="Notification Title" style="margin-top:8px; width:100%;" value="${state.global.notification.title}">
      <textarea id="g_notif_text" style="height:80px; margin-top:10px; width:100%;" placeholder="Message...">${state.global.notification.text}</textarea>
    </div>
    <button onclick="window.saveGlobalSettings()">Save Global Settings</button>
  </div>`;

  html += `<h3>Temple Administration Contacts</h3>
  <button onclick="window.addContact()" style="margin-bottom:1rem;">+ Add Member</button>
  <div class="grid-list">`;
  state.contacts.forEach((c, i) => {
    html += `
    <div class="card flex-row">
      <div style="flex:2"><label style="font-size:0.8rem">Category</label><input type="text" id="c_category_${i}" value="${c.category || ''}" style="width:100%"></div>
      <div style="flex:1"><label style="font-size:0.8rem">Role</label><input type="text" id="c_role_${i}" value="${c.role}" style="width:100%"></div>
      <div style="flex:2"><label style="font-size:0.8rem">Name</label><input type="text" id="c_name_${i}" value="${c.name}" style="width:100%"></div>
      <div style="flex:1"><label style="font-size:0.8rem">Phone</label><input type="text" id="c_phone_${i}" value="${c.phone}" style="width:100%"></div>
      <div><br><button class="btn-danger" onclick="window.deleteContact(${i})">✕</button></div>
    </div>`;
  });
  area.innerHTML = html + "</div><br><button onclick='window.saveContacts()'>Save Contacts</button>";
}

window.saveHeroUrl = function () {
  const url = document.getElementById('g_hero_url').value.trim();
  state.global.heroImage = url ? window.parseImageUrl(url) : null;
  render();
}

window.saveGlobalSettings = function () {
  state.global.notification.enabled = document.getElementById('g_notif_enabled').checked;
  state.global.notification.title = document.getElementById('g_notif_title').value;
  state.global.notification.text = document.getElementById('g_notif_text').value;
  alert("Global settings saved in memory. Click '☁️ Save to Cloud' to publish.");
}

window.addContact = function () {
  state.contacts.push({ category: "Bharanasamithi Angangal", role: "Role", name: "Name", phone: "" });
  render();
}

window.deleteContact = function (i) {
  if (confirm("Delete?")) { state.contacts.splice(i, 1); render(); }
}

window.saveContacts = function () {
  state.contacts.forEach((c, i) => {
    c.category = document.getElementById('c_category_' + i).value;
    c.role = document.getElementById('c_role_' + i).value;
    c.name = document.getElementById('c_name_' + i).value;
    c.phone = document.getElementById('c_phone_' + i).value;
  });
  alert("Contacts saved in memory. Click '☁️ Save to Cloud' to publish.");
}

// ── ULSAVAM ──────────────────────────────────────────────────
function renderUlsavam(area) {
  let html = `
    <div class="card">
      <div class="flex-row">
        <div><label>Year</label><input type="text" id="u_year" value="${state.ulsavam.year}"></div>
        <div><label>Start (YYYY-MM-DD)</label><input type="date" id="u_start" value="${state.ulsavam.startDate}"></div>
        <div><label>End (YYYY-MM-DD)</label><input type="date" id="u_end" value="${state.ulsavam.endDate}"></div>
      </div>
      <br><button onclick="window.saveUlsavamInfo()">Update Info</button>
    </div>
    <h3>Ulsavam Days</h3>
    <div class="grid-list">`;
  state.ulsavam.days.forEach((d, i) => {
    html += `
    <div class="card">
      <div class="flex-row">
        <div><strong>Day ${d.day}: ${d.date}</strong> — ${d.title}</div>
        <button onclick="window.editUlsavamDay(${i})">Edit</button>
      </div>
    </div>`;
  });
  area.innerHTML = html + "</div>";
}

window.saveUlsavamInfo = function () {
  state.ulsavam.year = document.getElementById('u_year').value;
  state.ulsavam.startDate = document.getElementById('u_start').value;
  state.ulsavam.endDate = document.getElementById('u_end').value;
  alert("Ulsavam info saved in memory.");
}

window.editUlsavamDay = function (i) {
  const d = state.ulsavam.days[i];
  const area = document.getElementById('contentArea');
  const progStr = d.programmes ? d.programmes.map(p => p.time + " " + p.name).join("\n") : "";
  area.innerHTML = `
    <div class="card">
      <h3>Edit Day ${d.day}</h3>
      <div class="form-group"><label>Date String (e.g. April 10, Wednesday)</label><input type="text" id="d_date" value="${d.date}"></div>
      <div class="form-group"><label>Title</label><input type="text" id="d_title" value="${d.title}"></div>
      <div class="form-group"><label>Details</label><textarea id="d_details" style="height:80px;">${d.details}</textarea></div>
      <div class="form-group">
        <label>Programmes (One per line: "09:30 Dhwajarohanam")</label>
        <textarea id="d_progs" style="height:120px">${progStr}</textarea>
      </div>
      <button onclick="window.saveUlsavamDay(${i})">Save Day</button>
      <button class="btn-secondary" onclick="render()">Back</button>
    </div>`;
}

window.saveUlsavamDay = function (i) {
  state.ulsavam.days[i].date = document.getElementById('d_date').value;
  state.ulsavam.days[i].title = document.getElementById('d_title').value;
  state.ulsavam.days[i].details = document.getElementById('d_details').value;
  const progs = document.getElementById('d_progs').value.split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const space = line.indexOf(' ');
      return space > 0
        ? { time: line.substring(0, space), name: line.substring(space + 1) }
        : { time: "", name: line };
    });
  state.ulsavam.days[i].programmes = progs;
  render();
}

// ── DOCUMENTS ────────────────────────────────────────────────
function renderDocuments(area) {
  if (!state.documents) state.documents = [];
  let html = `<div class="card" style="margin-bottom:1rem;">
    <p>Add Google Drive links to PDFs, Byelaws, Notices, and Minutes.</p>
    <button onclick="window.addDocument()" class="btn-primary">+ Add Document</button>
  </div><div class="grid-list" id="documents_grid">`;
  state.documents.forEach((d, i) => {
    html += `
    <div class="card">
      <div class="form-group"><label>Title</label><input type="text" id="doc_title_${i}" value="${d.title || ''}"></div>
      <div class="form-group"><label>URL</label><input type="text" id="doc_url_${i}" value="${d.url || ''}"></div>
      <div class="form-group"><label>Type</label>
        <select id="doc_type_${i}" style="width:100%; padding:0.5rem; background:rgba(255,255,255,0.03); border:1px solid rgba(201,168,76,0.2); color:var(--text); border-radius:2px;">
          <option value="pdf" ${d.type === 'pdf' ? 'selected' : ''}>PDF</option>
          <option value="doc" ${d.type === 'doc' ? 'selected' : ''}>Document/Minutes</option>
          <option value="notice" ${d.type === 'notice' ? 'selected' : ''}>Notice</option>
        </select>
      </div>
      <button class="btn-danger" style="margin-top:0.5rem;" onclick="window.deleteDocument(${i})">Delete</button>
    </div>`;
  });
  area.innerHTML = html + "</div><br><button onclick='window.saveDocuments()'>Save Documents</button>";
}

window.addDocument = function () {
  if (!state.documents) state.documents = [];
  state.documents.push({ title: "New Document", url: "#", type: "pdf" });
  render();
}

window.deleteDocument = function (index) {
  if (confirm("Delete Document?")) { state.documents.splice(index, 1); render(); }
}

window.saveDocuments = function () {
  if (!state.documents) state.documents = [];
  state.documents.forEach((d, i) => {
    d.title = document.getElementById('doc_title_' + i).value;
    d.url = document.getElementById('doc_url_' + i).value;
    d.type = document.getElementById('doc_type_' + i).value;
  });
  alert("Documents saved in memory. Click '☁️ Save to Cloud' to publish.");
}

// ── Boot ─────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initAdmin(); });
} else {
  initAdmin();
}
