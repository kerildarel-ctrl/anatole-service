/* ================================================================
   Prestige Pro — frontend (vanilla JS, no build step required)
   Talks to the local Express server over the same-origin /api routes.
   Overhauled with premium white-sidebar layout and modern dashboard.
   ================================================================= */

const APP_VERSION = "1.1.1";

const STATUTS_COMMANDE = ["En attente", "Payée"];
const STATUT_COLOR = {
  "En attente": "var(--mute)", "Payée": "var(--teal)",
};

const NAV = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "clients", label: "Clients" },
  { id: "devis", label: "Devis" },
  { id: "commandes", label: "Commandes" },
  { id: "stock", label: "Stock" },
  { id: "ventes", label: "Ventes" },
  { id: "finance", label: "Finance" },
  { id: "employes", label: "Employés" },
];

const state = {
  data: null, tab: "dashboard", navOpen: false, online: true,
  currentUser: null, authScreen: null, authError: "",
  searchQuery: "", commandeFilter: "toutes", financeDate: "",
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
function parseLocalDate(dateStr) {
  if (!dateStr) return new Date(0);
  const cleanStr = String(dateStr).slice(0, 10);
  const parts = cleanStr.split("-");
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
}
const fmt = (n) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " FCFA";
const esc = (s) => (s == null ? "" : String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));

function exportToCSV(filename, headers, rows, mappingFn) {
  let csvContent = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
  rows.forEach(r => {
    const data = mappingFn(r);
    const escaped = data.map(val => {
      const s = String(val === undefined || val === null ? "" : val).replace(/"/g, '""');
      return `"${s}"`;
    });
    csvContent += escaped.join(",") + "\n";
  });
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ---------------- SVGs Sidebar Nav Icons ---------------- */
function getTabIcon(tabId) {
  const icons = {
    dashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    clients: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    devis: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    commandes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    stock: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    ventes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    finance: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
    employes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
  };
  return icons[tabId] || "";
}

/* ---------------- Helper Stock Icon based on item name ---------------- */
function getStockIcon(name) {
  name = name.toLowerCase();
  if (name.includes("clavier")) return "⌨️";
  if (name.includes("souris")) return "🖱️";
  if (name.includes("écran") || name.includes("ecran") || name.includes("moniteur")) return "🖥️";
  if (name.includes("papier") || name.includes("flyer") || name.includes("carte") || name.includes("bâche") || name.includes("bache")) return "📄";
  if (name.includes("encre") || name.includes("cartouche") || name.includes("toner")) return "🧪";
  if (name.includes("polo") || name.includes("t-shirt") || name.includes("vetement") || name.includes("casquette")) return "👕";
  return "📦";
}

/* ---------------- Helper Delivery Date Box ---------------- */
function renderDeliveryDateBadge(dateStr) {
  if (!dateStr) return `<div class="date-badge-box" style="background:#f1f5f9;color:#64748b;"><div class="day">—</div><div class="month">ND</div></div>`;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return `<div class="date-badge-box" style="background:#f1f5f9;color:#64748b;"><div class="day">?</div><div class="month">?</div></div>`;
  const day = date.getDate();
  const months = ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"];
  const month = months[date.getMonth()];
  return `<div class="date-badge-box"><div class="day">${day}</div><div class="month">${month}</div></div>`;
}

/* ---------------- API ---------------- */
async function apiGet(url) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, body };
  return body;
}
async function apiSend(method, url, payload) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload || {}) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, body };
  return body;
}
const apiAll = () => apiGet("/api/all");
const apiCreate = (col, body) => apiSend("POST", `/api/${col}`, body);
const apiUpdate = (col, id, body) => apiSend("PUT", `/api/${col}/${id}`, body);
const apiDelete = (col, id) => apiSend("DELETE", `/api/${col}/${id}`);

function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc1.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.18); // G5
    
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(261.63, audioCtx.currentTime); // C4
    osc2.frequency.exponentialRampToValueAtTime(392.00, audioCtx.currentTime + 0.18); // G4

    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc1.start();
    osc2.start();
    
    osc1.stop(audioCtx.currentTime + 0.5);
    osc2.stop(audioCtx.currentTime + 0.5);
  } catch (err) {
    console.warn("Could not play notification sound:", err);
  }
}

async function refresh() {
  try {
    const prevData = state.data;
    state.data = await apiAll();
    if (state.data && state.data.version && state.data.version !== APP_VERSION) {
      window.location.reload();
      return;
    }
    
    if (prevData && prevData.commandes && state.data && state.data.commandes) {
      const prevIds = new Set(prevData.commandes.map(c => c.id));
      const hasNew = state.data.commandes.some(c => !prevIds.has(c.id));
      if (hasNew) {
        playNotificationSound();
      }
    }

    state.currentUser = await apiGet("/api/me");
    state.online = true;
  } catch (e) {
    if (e && e.status === 401) return boot();
    state.online = false;
  }
  
  const mainEl = document.querySelector(".main");
  if (mainEl && !state.authScreen) {
    mainEl.innerHTML = renderTab();
    const dot = document.querySelector(".sidebar-status .dot");
    if (dot) {
      if (state.online) dot.classList.remove("off");
      else dot.classList.add("off");
    }
  } else {
    render();
  }
}

async function mutate(fn) {
  try {
    await fn();
    await refresh();
  } catch (e) {
    if (e && e.status === 401) return boot();
    const msg = (e && e.body && e.body.error) || "Impossible de contacter le serveur.";
    alert(msg);
  }
}

/* ---------------- Boot / auth flow ---------------- */
async function boot() {
  closeModal();
  // Apply saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }

  try {
    state.currentUser = await apiGet("/api/me");
    const isAd = !!state.currentUser.estAdmin;
    const isCaisse = state.currentUser.role === "Caisse";
    if (state.tab === "dashboard" && !isAd && !isCaisse) {
      state.tab = "commandes";
    }
    state.authScreen = null;
    await refresh();
    startPolling();
  } catch (e) {
    state.currentUser = null;
    try {
      const status = await apiGet("/api/setup-status");
      state.authScreen = status.hasAdmin ? "login" : "setup";
    } catch (e2) {
      state.authScreen = "login";
    }
    render();
  }
}

let pollingStarted = false;
function startPolling() {
  if (pollingStarted) return;
  pollingStarted = true;
  setInterval(() => {
    if (!document.getElementById("modal-overlay") && !state.authScreen) refresh();
  }, 6000);
}

window.submitSetup = async () => {
  const nom = document.getElementById("su-nom").value.trim();
  const identifiant = document.getElementById("su-id").value.trim();
  const password = document.getElementById("su-pass").value;
  const password2 = document.getElementById("su-pass2").value;
  if (!nom || !identifiant || !password) { state.authError = "Tous les champs sont requis."; return render(); }
  if (password !== password2) { state.authError = "Les mots de passe ne correspondent pas."; return render(); }
  try {
    await apiSend("POST", "/api/setup", { nom, identifiant, password });
    state.authError = "";
    await boot();
  } catch (e) {
    state.authError = (e.body && e.body.error) || "Erreur lors de la création du compte.";
    render();
  }
};

window.submitLogin = async () => {
  const identifiant = document.getElementById("lg-id").value.trim();
  const password = document.getElementById("lg-pass").value;
  try {
    await apiSend("POST", "/api/login", { identifiant, password });
    state.authError = "";
    await boot();
  } catch (e) {
    state.authError = (e.body && e.body.error) || "Connexion impossible.";
    render();
  }
};

window.logout = async () => {
  try { await apiSend("POST", "/api/logout"); } catch (e) {}
  state.data = null;
  state.currentUser = null;
  state.tab = "dashboard";
  await boot();
};

/* ---------------- Root render ---------------- */
function render() {
  const root = document.getElementById("root");

  if (state.authScreen === "setup") { root.innerHTML = renderSetup(); return; }
  if (state.authScreen === "login") { root.innerHTML = renderLogin(); return; }
  if (!state.data) { root.innerHTML = `<div class="boot">Connexion au serveur…</div>`; return; }

  const todayStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const capitalizedDate = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);

  root.innerHTML = `
    ${state.navOpen ? `<div class="backdrop" onclick="closeNav()"></div>` : ""}
    <aside class="sidebar ${state.navOpen ? "open" : ""}">
      <div class="sidebar-brand">
        <div class="brand-logo-container" style="display:flex; flex-direction:column; align-items:center; text-align:center; width:100%;">
          <img src="logo.jpeg" id="brand-logo-img" onerror="if(this.src.includes('logo.jpeg')){ this.src='logo.png'; } else if(this.src.includes('logo.png')){ this.src='logo.jpg'; } else { this.style.display='none'; document.getElementById('default-logo-svg').style.display='block'; }" style="max-width:140px; max-height:75px; object-fit:contain; margin-bottom:8px;" />
          <svg id="default-logo-svg" width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 8px; display:none;">
            <circle cx="50" cy="50" r="40" fill="#dc2626" />
            <text x="50" y="58" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">AS</text>
          </svg>
          <div style="text-align: center;">
            <div class="brand-text" style="color: #dc2626; font-weight: 900; letter-spacing: 0.5px;">ANATOLE SERVICE</div>
            <div class="brand-subtext" style="font-weight: 600;">Gestion & Services</div>
          </div>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${NAV.filter((n) => {
          const isAd = !!state.currentUser.estAdmin;
          const isCaisse = state.currentUser.role === "Caisse";
          if (isAd) return true;
          if (isCaisse) return n.id !== "employes";
          return ["clients", "devis", "commandes", "stock"].includes(n.id);
        }).map((n) => `
          <button class="nav-btn ${state.tab === n.id ? "active" : ""}" onclick="goTab('${n.id}')">
            ${getTabIcon(n.id)}
            ${n.label}
          </button>
        `).join("")}
      </nav>
      <div class="sidebar-footer">
        <div class="user-profile-card" onclick="toggleLogoutBtn()">
          <div class="user-info">
            <div class="user-avatar-circle">${state.currentUser.nom[0].toUpperCase()}</div>
            <div class="user-name-role">
              <span class="user-name">${esc(state.currentUser.nom)}</span>
              <span class="user-role">${state.currentUser.estAdmin ? "Administrateur" : esc(state.currentUser.role || "Employé")}</span>
            </div>
          </div>
          <div style="font-size:10px;color:var(--mute)">▼</div>
        </div>
        <div id="logout-container" class="logout-btn-container" style="display: none;">
          ${state.currentUser.estAdmin ? `
            <button class="btn btn-ghost" style="width: 100%; font-size: 12px; padding: 8px; justify-content: center; border-radius: 8px; margin-bottom: 4px;" onclick="openMyProfileModal(event)">
              👤 Modifier mon profil
            </button>
          ` : ""}
          <button class="logout-btn" onclick="logout()">
            🚪 Se déconnecter
          </button>
        </div>
      </div>
      <div class="sidebar-status" style="flex-direction:column; align-items:flex-start; gap:4px; padding-bottom:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="dot ${state.online ? "" : "off"}"></span>
          <span>${state.online ? "Connecté au serveur" : "Serveur injoignable"}</span>
        </div>
        <div style="font-size:9.5px; color:var(--mute); font-weight:600; margin-top:4px; align-self:center; letter-spacing:0.5px;">
          Réalisé par <span style="color:var(--indigo);">MK Prog</span>
        </div>
      </div>
    </aside>
    <div class="main-wrapper">
      <header class="top-header">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="icon-btn mobile-nav-toggle" onclick="openNav()">☰</button>
          <div class="header-search">
            <span class="search-icon">🔍</span>
            <input type="text" id="global-search" placeholder="Rechercher..." value="${esc(state.searchQuery)}" oninput="handleGlobalSearch(this.value)" />
            <span class="shortcut">Ctrl + K</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" onclick="toggleDarkMode()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          </button>
          
          ${state.currentUser.estAdmin ? `
            <div class="notifications-container" style="position: relative;">
              <button class="icon-btn" onclick="toggleNotificationsDropdown(event)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                ${(state.data.notifications && state.data.notifications.filter(n => !n.lu).length > 0) ? `
                  <span class="badge-count">${state.data.notifications.filter(n => !n.lu).length}</span>
                ` : ""}
              </button>
              ${state.notificationsOpen ? renderNotificationsDropdown() : ""}
            </div>
          ` : ""}
          
          <div class="header-avatar">${state.currentUser.nom[0].toUpperCase()}</div>
        </div>
      </header>
      <main class="main">${renderTab()}</main>
    </div>
  `;
}

window.goTab = (id) => {
  const isAd = !!state.currentUser.estAdmin;
  const isCaisse = state.currentUser.role === "Caisse";
  
  if (id === "employes" && !isAd) return;
  if (["dashboard", "ventes", "finance"].includes(id) && !isAd && !isCaisse) return;

  state.tab = id;
  state.navOpen = false;
  render();
};
window.openNav = () => { state.navOpen = true; render(); };
window.closeNav = () => { state.navOpen = false; render(); };

window.toggleLogoutBtn = () => {
  const el = document.getElementById("logout-container");
  if (el) {
    if (el.style.display === "none") {
      el.style.display = "flex";
      el.style.flexDirection = "column";
      el.style.gap = "6px";
      el.style.marginTop = "10px";
    } else {
      el.style.display = "none";
    }
  }
};

window.openMyProfileModal = (event) => {
  if (event) event.stopPropagation();
  const el = document.getElementById("logout-container");
  if (el) el.style.display = "none";
  openEmployeModal(state.currentUser.id);
};

window.toggleDarkMode = () => {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
};

function renderNotificationsDropdown() {
  const notifs = state.data.notifications || [];
  const latestNotifs = notifs.slice().reverse().slice(0, 10);
  const unreadCount = notifs.filter(n => !n.lu).length;

  return `
    <div class="notifications-dropdown">
      <div class="notifications-header">
        <h4>Notifications</h4>
        ${unreadCount > 0 ? `
          <button class="link-btn" onclick="markAllNotificationsRead(event)">Tout marquer lu</button>
        ` : ""}
      </div>
      <div class="notifications-list">
        ${latestNotifs.length === 0 ? `
          <div style="padding: 16px; text-align: center; color: var(--mute); font-size: 12px;">Aucune notification.</div>
        ` : latestNotifs.map(n => `
          <div class="notification-item ${n.lu ? "" : "unread"}">
            <span class="notification-text">${esc(n.text)}</span>
            <span class="notification-date">${new Date(n.date).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}</span>
          </div>
        `).join("")}
      </div>
      <div class="notifications-footer">
        <span style="font-size:11.5px;color:var(--mute);font-weight:600;">Total : ${notifs.length} notifications</span>
      </div>
    </div>
  `;
}

window.toggleNotificationsDropdown = (event) => {
  event.stopPropagation();
  state.notificationsOpen = !state.notificationsOpen;
  render();
};

window.markAllNotificationsRead = (event) => {
  event.stopPropagation();
  mutate(async () => {
    await apiSend("POST", "/api/notifications/read-all");
    state.notificationsOpen = false;
  });
};

document.addEventListener("click", (e) => {
  if (state.notificationsOpen && !e.target.closest(".notifications-container")) {
    state.notificationsOpen = false;
    render();
  }
});

window.handleGlobalSearch = (val) => {
  state.searchQuery = val;
  render();
};

window.togglePasswordVisibility = (id, el) => {
  const input = document.getElementById(id);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    el.innerHTML = `
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
    `;
  } else {
    input.type = "password";
    el.innerHTML = `
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
  }
};

// Listen for Ctrl+K
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    const search = document.getElementById("global-search");
    if (search) search.focus();
  }
});

function renderTab() {
  switch (state.tab) {
    case "dashboard": return renderDashboard();
    case "clients": return renderClients();
    case "devis": return renderDevis();
    case "commandes": return renderCommandes();
    case "stock": return renderStock();
    case "ventes": return renderVentes();
    case "finance": return renderFinance();
    case "employes": return renderEmployes();
    default: return "";
  }
}

function sectionHeader(title, actionHtml) {
  return `<div class="section-header"><h2>${title}</h2>${actionHtml || ""}</div>`;
}

/* ---------------- AUTH SCREENS ---------------- */
function authShell(innerHtml) {
  return `
    <div class="login-wrapper">
      <!-- Left Side: Visual Showcase -->
      <div class="login-visual-panel" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #991b1b 75%, #ea580c 100%); position: relative; overflow: hidden;">
        <div style="position: absolute; width: 600px; height: 600px; border-radius: 50%; background: rgba(220, 38, 38, 0.15); top: -150px; right: -150px; filter: blur(60px); pointer-events: none;"></div>
        <div style="position: absolute; width: 500px; height: 500px; border-radius: 50%; background: rgba(234, 88, 12, 0.15); bottom: -150px; left: -150px; filter: blur(60px); pointer-events: none;"></div>
        <div class="visual-gradient-overlay"></div>
        <div class="visual-content">
          <div class="visual-logo-container" style="display:flex; flex-direction:column; align-items:center; text-align:center; justify-content:center; width:100%; margin-top:20px; margin-bottom: 20px;">
            <div style="background:#ffffff; padding:16px 28px; border-radius:24px; box-shadow:0 12px 35px rgba(0,0,0,0.35); display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px; border:1px solid rgba(255,255,255,0.8);">
              <img src="logo.png" class="visual-logo" style="max-height:120px; max-width:230px; object-fit:contain;" onerror="if(this.src.includes('logo.png')){ this.src='logo.jpeg'; } else if(this.src.includes('logo.jpeg')){ this.src='logo.jpg'; } else { this.style.display='none'; document.getElementById('visual-logo-svg').style.display='block'; }" />
            </div>
            <svg id="visual-logo-svg" width="70" height="70" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 12px; display:none;">
              <circle cx="50" cy="50" r="40" fill="#dc2626" />
              <text x="50" y="58" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">AS</text>
            </svg>
            <span style="font-family:'Outfit',sans-serif;font-size:32px;font-weight:900;letter-spacing:0.5px;color:#ffffff;">ANATOLE SERVICE</span>
          </div>
          <div style="margin-top: auto; margin-bottom: auto;">
            <div class="visual-features" style="display:flex; flex-direction:column; gap:16px;">
              <div class="v-feature-card">
                <div class="v-card-icon-box" style="background: linear-gradient(135deg, #dc2626, #ea580c);">
                  <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <line x1="18" y1="20" x2="18" y2="10"></line>
                    <line x1="12" y1="20" x2="12" y2="4"></line>
                    <line x1="6" y1="20" x2="6" y2="14"></line>
                  </svg>
                </div>
                <div class="v-card-text">
                  <div class="v-card-title">Rapports & Indicateurs de performance</div>
                  <div class="v-card-subtitle">Analysez vos performances en temps réel.</div>
                </div>
              </div>
              <div class="v-feature-card">
                <div class="v-card-icon-box" style="background: linear-gradient(135deg, #dc2626, #ea580c);">
                  <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <div class="v-card-text">
                  <div class="v-card-title">Gestion complète de la facturation</div>
                  <div class="v-card-subtitle">Suivi, devis, factures et paiements.</div>
                </div>
              </div>
              <div class="v-feature-card">
                <div class="v-card-icon-box" style="background: linear-gradient(135deg, #dc2626, #ea580c);">
                  <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </div>
                <div class="v-card-text">
                  <div class="v-card-title">Mouvements de stock & Seuils critiques</div>
                  <div class="v-card-subtitle">Gardez le contrôle de vos stocks.</div>
                </div>
              </div>
            </div>
          </div>
          <div class="visual-footer" style="color: rgba(255,255,255,0.7);">
            © 2026 ANATOLE SERVICE - Excellence & Services.
          </div>
        </div>
      </div>

      <!-- Right Side: Login Form -->
      <div class="login-form-panel">
        <div class="login-form-container">
          <div class="form-panel-box">
            ${innerHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSetup() {
  return authShell(`
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="logo.png" style="max-height: 120px; max-width: 230px; object-fit: contain; margin: 0 auto 14px; display: block;" onerror="if(this.src.includes('logo.png')){ this.src='logo.jpeg'; } else if(this.src.includes('logo.jpeg')){ this.src='logo.jpg'; } else { this.style.display='none'; document.getElementById('setup-logo-svg').style.display='block'; }" />
      <svg id="setup-logo-svg" width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto 14px; display: none;">
        <circle cx="50" cy="50" r="40" fill="#dc2626" />
        <text x="50" y="58" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">AS</text>
      </svg>
      <h2 style="font-family:'Outfit',sans-serif; font-size: 26px; font-weight: 800; color: #dc2626; margin: 0; letter-spacing: -0.5px;">Configuration initiale</h2>
      <p style="color: var(--mute); font-size: 12.5px; margin: 6px 0 0; line-height: 1.4;">Créez le premier compte administrateur ANATOLE SERVICE.</p>
    </div>
    ${state.authError ? `<p style="color:var(--red);font-size:12.5px;margin-bottom:12px;text-align:center;">${esc(state.authError)}</p>` : ""}
    <div class="field"><label>Ton nom</label><input id="su-nom" /></div>
    <div class="field"><label>Identifiant de connexion</label><input id="su-id" autocapitalize="off" /></div>
    <div class="field"><label>Mot de passe</label><input id="su-pass" type="password" /></div>
    <div class="field"><label>Confirmer le mot de passe</label><input id="su-pass2" type="password" onkeydown="if(event.key==='Enter')submitSetup()" /></div>
    <button class="btn btn-accent" style="width:100%;justify-content:center;background:linear-gradient(135deg, #dc2626, #ea580c);margin-bottom:16px;" onclick="submitSetup()">Créer le compte et démarrer</button>
  `);
}

function renderLogin() {
  return authShell(`
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="logo.png" style="max-height: 120px; max-width: 230px; object-fit: contain; margin: 0 auto 14px; display: block;" onerror="if(this.src.includes('logo.png')){ this.src='logo.jpeg'; } else if(this.src.includes('logo.jpeg')){ this.src='logo.jpg'; } else { this.style.display='none'; document.getElementById('card-logo-svg').style.display='block'; }" />
      <svg id="card-logo-svg" width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto 14px; display: none;">
        <circle cx="50" cy="50" r="40" fill="#dc2626" />
        <text x="50" y="58" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">AS</text>
      </svg>
      <h2 style="font-family:'Outfit',sans-serif; font-size: 26px; font-weight: 800; color: #dc2626; margin: 0; letter-spacing: -0.5px;">Connexion</h2>
      <p style="color: var(--mute); font-size: 12.5px; margin: 6px 0 0; line-height: 1.4;">Bienvenue chez ANATOLE SERVICE ! Connectez-vous pour accéder à votre espace.</p>
    </div>
    
    ${state.authError ? `<p style="color:var(--red);font-size:12.5px;margin-bottom:12px;text-align:center;">${esc(state.authError)}</p>` : ""}
    
    <div class="field">
      <label>Identifiant</label>
      <div class="input-with-icon">
        <span class="prefix-icon" style="color: #dc2626;">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </span>
        <input id="lg-id" placeholder="Saisissez votre identifiant" autocapitalize="off" />
      </div>
    </div>

    <div class="field">
      <label>Mot de passe</label>
      <div class="input-with-icon">
        <span class="prefix-icon" style="color: #dc2626;">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </span>
        <input id="lg-pass" type="password" placeholder="•••••••••" onkeydown="if(event.key==='Enter')submitLogin()" />
        <span class="suffix-icon" onclick="togglePasswordVisibility('lg-pass', this)">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </span>
      </div>
    </div>

    <div class="login-options-row" style="margin-bottom: 20px;">
      <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:500;">
        <input type="checkbox" style="width:15px; height:15px; border-radius:4px; accent-color:#dc2626;" checked />
        Se souvenir de moi
      </label>
    </div>

    <button class="btn btn-accent" style="width:100%; justify-content:center; gap:8px; font-size:14.5px; padding:12px; border-radius:12px; background:linear-gradient(135deg, #dc2626, #ea580c); margin-bottom: 20px;" onclick="submitLogin()">
      Se connecter <span style="font-size:16px;">→</span>
    </button>

    <div style="display:flex; align-items:center; justify-content:center; gap:8px; padding:10px; border:1px solid var(--line); border-radius:12px; color:var(--mute); font-size:12.5px; font-weight:500; background:rgba(220, 38, 38, 0.03);">
      <svg width="15" height="15" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
      Connexion sécurisée ANATOLE SERVICE
    </div>
    
    <div style="text-align:center; font-size:11px; color:var(--mute); margin-top:28px; font-weight:600; letter-spacing:0.5px;">
      Réalisé par <span style="color:var(--indigo);">MK Prog</span>
    </div>
  `);
}

/* ---------------- DASHBOARD ---------------- */
function renderDashboard() {
  const d = state.data;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const events = [
    ...(d.ventes || []).map((v) => ({ date: parseLocalDate(v.date || v.dateCreation), montant: Number(v.montant) || 0 })),
    ...(d.finance || []).filter((f) => f.type === "Recette").map((f) => ({ date: parseLocalDate(f.date), montant: Number(f.montant) || 0 })),
  ];
  const sum = (from) => events.filter((e) => e.date >= from).reduce((a, e) => a + (e.montant || 0), 0);

  const enAttente = d.commandes.filter((c) => c.statut === "En attente").length;
  const payees = d.commandes.filter((c) => c.statut === "Payée").length;
  const stockFaible = d.stock.filter((s) => Number(s.quantite) <= Number(s.seuil));
  const creances = d.commandes.reduce((a, c) => a + Math.max(0, (c.montant || 0) - (c.montantPaye || 0)), 0);



  const cards = [
    { label: "CA du jour", value: fmt(sum(startOfDay)), color: "var(--blue)", strokeColor: "#3b82f6", iconBg: "rgba(59, 130, 246, 0.1)", icon: "💼" },
    { label: "CA de la semaine", value: fmt(sum(startOfWeek)), color: "var(--teal)", strokeColor: "#10b981", iconBg: "rgba(16, 185, 129, 0.1)", icon: "📅" },
    { label: "CA du mois", value: fmt(sum(startOfMonth)), color: "#ec4899", strokeColor: "#ec4899", iconBg: "rgba(236, 72, 153, 0.1)", icon: "📈" },
    { label: "Commandes en attente", value: enAttente, color: "var(--amber)", strokeColor: "#f59e0b", iconBg: "rgba(245, 158, 11, 0.1)", tab: "commandes", icon: "🕒" },
    { label: "Commandes payées", value: payees, color: "var(--blue)", strokeColor: "#4f46e5", iconBg: "rgba(79, 70, 229, 0.1)", tab: "commandes", icon: "✅" },
    { label: "Créances clients", value: fmt(creances), color: "var(--red)", strokeColor: "#ef4444", iconBg: "rgba(239, 68, 68, 0.1)", tab: "finance", icon: "👤" },
  ];

  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  // Generate SVG Line Chart for Sales
  const salesChartHtml = drawSalesChart(events);

  return `
    <div class="receipt-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
      <div>
        <div class="big">Bonjour, ${esc(state.currentUser.nom)} 👋</div>
        <div class="date">${capitalizedDate}</div>
      </div>
      <div>
        <button class="btn btn-accent" style="padding:10px 18px; border-radius:10px; font-size:13.5px;" onclick="openReportModal()">
          📋 Générer un rapport
        </button>
      </div>
    </div>

    <div class="cards-grid">
      ${cards.map((c) => `
        <div class="stat-card ${c.tab ? "clickable" : ""}" ${c.tab ? `onclick="goTab('${c.tab}')"` : ""}>
          <div class="label">${c.label}</div>
          <div class="value" style="color:${c.color}">${c.value}</div>
          <div class="kpi-icon-container" style="background:${c.iconBg};color:${c.color};font-size:18px;">
            ${c.icon}
          </div>
          <!-- Wave graphic -->
          <div class="wave-container">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" style="width:100%;height:100%;">
              <path d="M0 20 Q 20 12, 40 24 T 80 14 T 100 18 L 100 30 L 0 30 Z" fill="${c.strokeColor}10" stroke="${c.strokeColor}" stroke-width="1.5"/>
            </svg>
          </div>
        </div>
      `).join("")}
    </div>

    <div class="dashboard-middle-grid">
      <!-- Stock faible widget -->
      <div class="panel">
        <div class="panel-header">
          <h3>⚠️ Stock faible</h3>
          <a href="#" class="panel-link" onclick="goTab('stock'); return false;">Voir tout</a>
        </div>
        ${stockFaible.length === 0 ? `<p class="empty-msg">Aucune alerte de rupture.</p>` :
          `<ul style="margin-top: 8px;">
            ${stockFaible.slice(0, 3).map((s) => {
              const faible = Number(s.quantite) <= Number(s.seuil);
              return `
              <li>
                <div class="product-row">
                  <div class="product-thumbnail">${getStockIcon(s.nom)}</div>
                  <div class="product-info">
                    <span class="product-name">${esc(s.nom)}</span>
                    <span class="product-stock-sub">Seuil d'alerte : ${s.seuil}</span>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div class="mono" style="font-weight:700;color:var(--red);">${s.quantite} ${esc(s.unite)}</div>
                  <span style="font-size:10px;font-weight:700;color:${Number(s.quantite)===0 ? 'var(--red)' : 'var(--amber)'}">
                    ${Number(s.quantite)===0 ? '🔴 Critique' : '🟡 Faible'}
                  </span>
                </div>
              </li>`;
            }).join("")}
          </ul>`}
      </div>

      <!-- Prochaines livraisons widget -->
      <div class="panel">
        <div class="panel-header">
          <h3>🚚 Prochaines livraisons</h3>
          <a href="#" class="panel-link" onclick="goTab('commandes'); return false;">Voir tout</a>
        </div>
        ${d.commandes.filter((c) => c.statut === "En attente").length === 0 ? `<p class="empty-msg">Rien en attente de livraison.</p>` :
          `<ul style="margin-top: 8px;">
            ${d.commandes.filter((c) => c.statut === "En attente")
              .sort((a, b) => new Date(a.dateLivraison) - new Date(b.dateLivraison))
              .slice(0, 3)
              .map((c) => `
              <li>
                <div class="delivery-row">
                  ${renderDeliveryDateBadge(c.dateLivraison)}
                  <div class="delivery-info">
                    <span class="delivery-id">${esc(c.designation)}</span>
                    <span class="delivery-supplier">Commande #${c.id.slice(0, 5).toUpperCase()}</span>
                  </div>
                </div>
                <span class="badge" style="background:${STATUT_COLOR[c.statut]}1a;color:${STATUT_COLOR[c.statut]}">${c.statut}</span>
              </li>`).join("")}
          </ul>`}
      </div>
    </div>

    <!-- Charts Row -->
    <div style="margin-top: 20px;">
      <div class="panel">
        <h3>📊 Aperçu des ventes (7 derniers jours)</h3>
        ${salesChartHtml}
      </div>
    </div>
  `;
}

/* ---------------- SVG Charts Generation ---------------- */
function drawSalesChart(events) {
  // Let's identify the last 7 calendar days
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().slice(0, 10));
  }

  // Calculate sales amounts for each day
  const salesData = last7Days.map(date => {
    const vSum = state.data.ventes.filter(v => v.date === date).reduce((s, v) => s + (v.montant || 0), 0);
    const cSum = state.data.commandes.filter(c => c.statut === "Livré" && ((c.dateLivraison || c.dateCreation || "").slice(0, 10)) === date).reduce((s, c) => s + (c.montant || 0), 0);
    return {
      date,
      label: new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      amount: vSum + cSum
    };
  });

  const maxAmount = Math.max(...salesData.map(s => s.amount), 50000); // base height representation to prevent div by zero
  const width = 500;
  const height = 150;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 25;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  // Generate SVG coordinates
  const points = salesData.map((d, index) => {
    const x = paddingLeft + (index / 6) * chartW;
    const y = height - paddingBottom - (d.amount / maxAmount) * chartH;
    return { x, y, amount: d.amount, label: d.label };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-placeholder-svg" style="width: 100%; height: auto;">
      <defs>
        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--indigo)" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="var(--indigo)" stop-opacity="0.00"/>
        </linearGradient>
      </defs>
      
      <!-- Grid lines -->
      <line x1="${paddingLeft}" y1="${height - paddingBottom}" x2="${width - paddingRight}" y2="${height - paddingBottom}" stroke="var(--line)" stroke-width="1" />
      <line x1="${paddingLeft}" y1="${height - paddingBottom - chartH}" x2="${width - paddingRight}" y2="${height - paddingBottom - chartH}" stroke="var(--line)" stroke-width="0.5" stroke-dasharray="3" />
      <line x1="${paddingLeft}" y1="${height - paddingBottom - chartH / 2}" x2="${width - paddingRight}" y2="${height - paddingBottom - chartH / 2}" stroke="var(--line)" stroke-width="0.5" stroke-dasharray="3" />
      
      <!-- Axis Labels (Y) -->
      <text x="${paddingLeft - 8}" y="${height - paddingBottom + 4}" fill="var(--mute)" font-size="9" text-anchor="end">0</text>
      <text x="${paddingLeft - 8}" y="${height - paddingBottom - chartH / 2 + 4}" fill="var(--mute)" font-size="9" text-anchor="end">${Math.round(maxAmount / 2000) * 2}k</text>
      <text x="${paddingLeft - 8}" y="${height - paddingBottom - chartH + 4}" fill="var(--mute)" font-size="9" text-anchor="end">${Math.round(maxAmount / 1000)}k</text>

      <!-- Fill Area -->
      <path d="${areaD}" fill="url(#chart-grad)" />
      
      <!-- Line path -->
      <path d="${pathD}" fill="none" stroke="var(--indigo)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      
      <!-- Point circles and labels -->
      ${points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--white)" stroke="var(--indigo)" stroke-width="2" />
        <text x="${p.x}" y="${height - paddingBottom + 16}" fill="var(--mute)" font-size="9" font-weight="600" text-anchor="middle">${p.label}</text>
        <!-- Tooltip amount visual -->
        ${p.amount > 0 ? `<text x="${p.x}" y="${p.y - 8}" fill="var(--ink)" font-size="8.5" font-family="monospace" font-weight="700" text-anchor="middle">${Math.round(p.amount / 1000)}k</text>` : ''}
      `).join("")}
    </svg>
  `;
}

function drawCategoryChart() {
  // Categorize sales based on text keywords
  let catCounts = { gf: 0, num: 0, pers: 0, aut: 0 };
  const allItems = [
    ...state.data.commandes,
    ...state.data.ventes.map(v => ({ designation: v.description, montant: v.montant }))
  ];

  allItems.forEach(item => {
    const des = (item.designation || "").toLowerCase();
    const amt = item.montant || 0;
    if (des.includes("bach") || des.includes("bâch") || des.includes("grand") || des.includes("panneau") || des.includes("adhésif") || des.includes("bache")) {
      catCounts.gf += amt;
    } else if (des.includes("flyer") || des.includes("carte") || des.includes("dépliant") || des.includes("numér") || des.includes("impress")) {
      catCounts.num += amt;
    } else if (des.includes("polo") || des.includes("t-shirt") || des.includes("tshirt") || des.includes("casque") || des.includes("person") || des.includes("vetement")) {
      catCounts.pers += amt;
    } else {
      catCounts.aut += amt;
    }
  });

  const catTotal = catCounts.gf + catCounts.num + catCounts.pers + catCounts.aut;

  // Default ratios if there's no data
  const val = catTotal > 0 ? {
    gf: catCounts.gf / catTotal,
    num: catCounts.num / catTotal,
    pers: catCounts.pers / catTotal,
    aut: catCounts.aut / catTotal
  } : { gf: 0.45, num: 0.30, pers: 0.15, aut: 0.10 };

  const circumference = 2 * Math.PI * 40; // 251.3

  const lenGF = circumference * val.gf;
  const lenNum = circumference * val.num;
  const lenPers = circumference * val.pers;
  const lenAut = circumference * val.aut;

  const offGF = 0;
  const offNum = -lenGF;
  const offPers = -(lenGF + lenNum);
  const offAut = -(lenGF + lenNum + lenPers);

  const pct = (v) => Math.round(v * 100) + "%";

  const legend = [
    { label: "Grand Format", pct: pct(val.gf), color: "var(--blue)" },
    { label: "Numérique & Flyers", pct: pct(val.num), color: "var(--teal)" },
    { label: "Personnalisation", pct: pct(val.pers), color: "var(--amber)" },
    { label: "Autres supports", pct: pct(val.aut), color: "var(--purple)" }
  ];

  const svgChart = `
    <svg width="120" height="120" viewBox="0 0 100 100" style="flex-shrink:0;">
      <circle cx="50" cy="50" r="40" stroke="#f1f5f9" stroke-width="12" fill="transparent" />
      
      <!-- Grand Format -->
      <circle cx="50" cy="50" r="40" stroke="var(--blue)" stroke-width="12" fill="transparent" 
        stroke-dasharray="${lenGF} ${circumference}" stroke-dashoffset="${offGF}" transform="rotate(-90 50 50)" />
      
      <!-- Numérique & Flyers -->
      <circle cx="50" cy="50" r="40" stroke="var(--teal)" stroke-width="12" fill="transparent" 
        stroke-dasharray="${lenNum} ${circumference}" stroke-dashoffset="${offNum}" transform="rotate(-90 50 50)" />
      
      <!-- Personnalisation -->
      <circle cx="50" cy="50" r="40" stroke="var(--amber)" stroke-width="12" fill="transparent" 
        stroke-dasharray="${lenPers} ${circumference}" stroke-dashoffset="${offPers}" transform="rotate(-90 50 50)" />
        
      <!-- Autres -->
      <circle cx="50" cy="50" r="40" stroke="var(--purple)" stroke-width="12" fill="transparent" 
        stroke-dasharray="${lenAut} ${circumference}" stroke-dashoffset="${offAut}" transform="rotate(-90 50 50)" />
        
      <!-- Text center -->
      <text x="50" y="52" font-family="'Outfit'" font-weight="700" font-size="12" text-anchor="middle" fill="var(--ink)">Prestige</text>
      <text x="50" y="63" font-size="7" font-weight="600" fill="var(--mute)" text-anchor="middle" letter-spacing="0.5">ATELIER</text>
    </svg>
  `;

  const legendHtml = `
    <div class="chart-legend-grid" style="flex:1;">
      ${legend.map(item => `
        <div class="legend-item">
          <div class="legend-label-color">
            <span class="legend-color-dot" style="background:${item.color};"></span>
            <span style="font-weight:500;">${item.label}</span>
          </div>
          <span class="legend-percentage">${item.pct}</span>
        </div>
      `).join("")}
    </div>
  `;

  return `${svgChart} ${legendHtml}`;
}

/* ---------------- CLIENTS ---------------- */
function renderClients() {
  const q = state.searchQuery.toLowerCase();
  const list = state.data.clients.filter((c) => (c.nom + (c.tel||"") + (c.email||"")).toLowerCase().includes(q));
  return `
    ${sectionHeader("Clients", `
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost" style="padding:10px 14px; font-size:13px; border-radius:10px;" onclick="exportClientsCSV()">📥 Excel / CSV</button>
        <button class="btn btn-accent" onclick="openClientModal()">+ Nouveau client</button>
      </div>
    `)}
    ${list.length === 0 ? `<p class="empty-msg">Aucun client trouvé.</p>` : `
    <div class="items-grid">
      ${list.map((c) => {
        const nb = state.data.commandes.filter((cm) => cm.clientId === c.id).length;
        return `
        <div class="item-card">
          <div class="row-top">
            <div>
              <div class="name">${esc(c.nom)}</div>
              <span class="badge" style="background:${c.type === "Entreprise" ? "#6B5FB01A" : "#177A671A"};color:${c.type === "Entreprise" ? "var(--purple)" : "var(--teal)"}">${c.type}</span>
            </div>
            <div>
              <button class="link-btn" onclick="openClientModal('${c.id}')">éditer</button>
              <button class="link-btn" style="color:var(--red)" onclick="deleteItem('clients','${c.id}')">suppr.</button>
            </div>
          </div>
          <div class="meta">${esc(c.tel || "")}<br>${esc(c.email || "")}${c.remise > 0 ? `<br><span style="color:var(--teal)">Remise fidélité : ${c.remise}%</span>` : ""}</div>
          <div class="foot">
            <span class="mono">${nb} commande${nb !== 1 ? "s" : ""}</span>
            <span class="badge badge-outline">Créé le ${esc(c.dateCreation || "—")}</span>
          </div>
        </div>`;
      }).join("")}
    </div>`}
  `;
}

window.openClientModal = (id) => {
  const c = id ? state.data.clients.find((x) => x.id === id) : { id: uid(), nom: "", type: "Particulier", tel: "", email: "", remise: 0 };
  openModal(id ? "Modifier le client" : "Nouveau client", `
    <div class="field"><label>Nom / Raison sociale</label><input id="f-nom" value="${esc(c.nom)}" /></div>
    <div class="form-grid-2">
      <div class="field"><label>Type</label><select id="f-type">
        <option ${c.type === "Particulier" ? "selected" : ""}>Particulier</option>
        <option ${c.type === "Entreprise" ? "selected" : ""}>Entreprise</option>
      </select></div>
      <div class="field"><label>Remise fidélité (%)</label><input id="f-remise" type="number" value="${c.remise || 0}" /></div>
    </div>
    <div class="field"><label>Téléphone</label><input id="f-tel" value="${esc(c.tel || "")}" /></div>
    <div class="field"><label>Email</label><input id="f-email" value="${esc(c.email || "")}" /></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
      <button class="btn btn-accent" onclick="saveClient('${c.id}', ${id ? "true" : "false"})">Enregistrer</button>
    </div>
  `);
};

window.saveClient = (id, exists) => {
  const body = {
    nom: document.getElementById("f-nom").value.trim(),
    type: document.getElementById("f-type").value,
    remise: Number(document.getElementById("f-remise").value) || 0,
    tel: document.getElementById("f-tel").value.trim(),
    email: document.getElementById("f-email").value.trim(),
  };
  if (!body.nom) return;
  mutate(async () => {
    if (exists === "true" || exists === true) await apiUpdate("clients", id, body);
    else await apiCreate("clients", { id, ...body, dateCreation: todayISO() });
    closeModal();
  });
};

window.exportClientsCSV = () => {
  exportToCSV(
    "clients_prestige_pro.csv",
    ["Nom", "Type", "Téléphone", "Email", "Remise fidélité (%)", "Date de création"],
    state.data.clients,
    c => [c.nom || "", c.type || "", c.tel || "", c.email || "", (c.remise || 0) + "%", c.dateCreation || ""]
  );
};

window.deleteItem = (col, id) => {
  if (!confirm("Confirmer la suppression ?")) return;
  mutate(() => apiDelete(col, id));
};

/* ---------------- DEVIS ---------------- */
function renderDevis() {
  const q = state.searchQuery.toLowerCase();
  const list = state.data.devis.slice().reverse().filter(dv => {
    const client = state.data.clients.find((c) => c.id === dv.clientId);
    const clientName = client ? client.nom : "Vente comptoir";
    return (dv.designation + clientName).toLowerCase().includes(q);
  });

  return `
    ${sectionHeader("Devis", `<button class="btn btn-accent" onclick="openDevisModal()">+ Nouveau devis</button>`)}
    ${list.length === 0 ? `<p class="empty-msg">Aucun devis trouvé.</p>` : list.map((dv) => {
      const client = state.data.clients.find((c) => c.id === dv.clientId);
      return `
      <div class="list-row">
        <div>
          <div class="title">${esc(dv.designation)}</div>
          <div class="sub mono">
            ${esc(client ? client.nom : "Vente comptoir")} · ${dv.quantite} × ${fmt(dv.prixUnitaire)}${dv.finitions ? " + " + esc(dv.finitions) : ""}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="amount">${fmt(dv.total)}</div>
          ${dv.statut === "Converti" 
            ? `<span class="badge" style="background:#177A671A;color:var(--teal)">Converti</span>` 
            : `<button class="btn btn-ghost" style="padding:6px 12px;font-size:11.5px;border-radius:8px;" onclick="convertirDevis('${dv.id}')">Convertir →</button>`}
        </div>
      </div>`;
    }).join("")}
  `;
}

window.openDevisModal = () => {
  const clients = state.data.clients;
  openModal("Nouveau devis (Saisie manuelle)", `
    <div class="form-grid-2">
      <div class="field"><label>Client (Optionnel)</label><select id="f-client">
        <option value="">Vente comptoir (aucun client)</option>
        ${clients.map((c) => `<option value="${c.id}">${esc(c.nom)}</option>`).join("")}
      </select></div>
      <div class="field"><label>Désignation</label><input id="f-desig" placeholder="Ex: Impression de 100 Flyers" /></div>
      <div class="field"><label>Quantité</label><input id="f-qte" type="number" value="1" oninput="updateDevisCalc()" /></div>
      <div class="field"><label>Prix unitaire (FCFA)</label><input id="f-prix" type="number" value="0" oninput="updateDevisCalc()" /></div>
    </div>
    <div id="devis-calc" class="calc-box"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
      <button class="btn btn-accent" onclick="saveDevis()">Créer le devis</button>
    </div>
  `, "wide");
  document.getElementById("f-client").addEventListener("change", updateDevisCalc);
  updateDevisCalc();
};

function devisFigures() {
  const clientId = document.getElementById("f-client").value;
  const client = state.data.clients.find((c) => c.id === clientId);
  const qte = Number(document.getElementById("f-qte").value) || 0;
  const prix = Number(document.getElementById("f-prix").value) || 0;
  const sousTotal = qte * prix;
  const remise = client && client.remise ? (sousTotal * client.remise) / 100 : 0;
  const total = Math.max(0, sousTotal - remise);
  return { client, qte, prix, coutFin: 0, sousTotal, remise, total };
}

window.updateDevisCalc = () => {
  const f = devisFigures();
  document.getElementById("devis-calc").innerHTML = `
    <div class="row"><span style="color:var(--mute)">Sous-total (${f.qte} × ${fmt(f.prix)})</span><span>${fmt(f.sousTotal)}</span></div>
    ${f.remise > 0 ? `<div class="row" style="color:var(--teal)"><span>Remise client (${f.client.remise}%)</span><span>-${fmt(f.remise)}</span></div>` : ""}
    <div class="row total"><span>Total</span><span>${fmt(f.total)}</span></div>
  `;
};

window.saveDevis = () => {
  const clientId = document.getElementById("f-client").value;
  const designation = document.getElementById("f-desig").value.trim();
  if (!designation) { alert("Désignation requise."); return; }
  const f = devisFigures();
  const body = {
    id: uid(), clientId, designation, largeur: 0, hauteur: 0, quantite: f.qte,
    prixUnitaire: f.prix, prixUnitaireBase: f.prix, finitions: "",
    coutFinitions: 0, surface: 0, total: f.total, statut: "Brouillon", date: todayISO(),
  };
  mutate(async () => { await apiCreate("devis", body); closeModal(); });
};

window.convertirDevis = (id) => {
  const dv = state.data.devis.find((x) => x.id === id);
  if (!dv) return;
  mutate(async () => {
    await apiCreate("commandes", {
      id: uid(), devisId: dv.id, clientId: dv.clientId, designation: dv.designation,
      montant: dv.total, montantPaye: 0, dateCreation: new Date().toISOString(), dateLivraison: "", urgence: "Normal", statut: "En attente",
    });
    await apiUpdate("devis", dv.id, { statut: "Converti" });
    state.tab = "commandes";
  });
};

function isCommandeModifiable(c) {
  if (!c || !c.dateCreation) return true;
  if (c.dateCreation.length <= 10) return true; // old formatted orders are modifiable
  const createdTime = new Date(c.dateCreation).getTime();
  const currentTime = new Date().getTime();
  const diffHours = (currentTime - createdTime) / (1000 * 60 * 60);
  return diffHours <= 2;
}

/* ---------------- COMMANDES ---------------- */
function renderCommandes() {
  const q = state.searchQuery.toLowerCase();
  
  const today = todayISO();
  let list = state.data.commandes.slice().reverse().filter(c => {
    const isCreatedToday = (c.dateCreation || "").slice(0, 10) === today;
    const isPending = c.statut === "En attente";
    return isCreatedToday || isPending;
  });
  if (state.commandeFilter === "en-attente") {
    list = list.filter(c => c.statut === "En attente");
  } else if (state.commandeFilter === "payees") {
    list = list.filter(c => c.statut === "Payée");
  } else if (state.commandeFilter === "urgentes") {
    list = list.filter(c => c.urgence === "Urgent");
  }

  list = list.filter(c => {
    const client = state.data.clients.find((cl) => cl.id === c.clientId);
    const clientName = client ? client.nom : "Vente comptoir";
    return (c.designation + clientName).toLowerCase().includes(q);
  });

  return `
    ${sectionHeader("Commandes", `<button class="btn btn-accent" onclick="openCommandeModal()">+ Nouvelle commande</button>`)}
    
    <div class="filters-row" style="display:flex; gap:8px; margin-bottom: 16px; flex-wrap: wrap;">
      ${[
        { id: "toutes", label: "Toutes" },
        { id: "en-attente", label: "⏳ En attente" },
        { id: "payees", label: "✅ Payées" },
        { id: "urgentes", label: "⚠️ Urgentes" }
      ].map(f => `
        <button class="btn ${state.commandeFilter === f.id ? 'btn-accent' : 'btn-ghost'}" style="padding: 6px 14px; font-size: 12.5px; border-radius: 20px;" onclick="setCommandeFilter('${f.id}')">
          ${f.label}
        </button>
      `).join("")}
    </div>
    ${list.length === 0 ? `<p class="empty-msg">Aucune commande trouvée.</p>` : list.map((c) => {
      const client = state.data.clients.find((cl) => cl.id === c.clientId);
      const reste = Math.max(0, (c.montant || 0) - (c.montantPaye || 0));
      const idx = STATUTS_COMMANDE.indexOf(c.statut);
      
      const isMod = c.designation.endsWith(" (Modifiée)");
      const displayDesig = isMod ? c.designation.slice(0, -12) : c.designation;
      const modifiable = isCommandeModifiable(c);

      return `
      <div class="list-row" style="flex-direction:column;align-items:stretch;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <div class="title">
              ${esc(displayDesig)} 
              ${c.urgence === "Urgent" ? `<span class="badge" style="background:#D6432B1A;color:var(--red)">⚠️ Urgent</span>` : ""}
            </div>
            <div class="sub mono">
              ${esc(client ? client.nom : "Vente comptoir")} · livraison : ${esc(c.dateLivraison || "non définie")}
              ${isMod ? `<span style="margin-left: 8px; color: var(--mute); font-style: italic; font-weight: bold;">✍️ Modifiée</span>` : ""}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="text-align:right;">
              <div class="amount">${fmt(c.montant)}</div>
              ${reste > 0 ? `<div class="mono" style="font-size:11px;color:var(--red)">reste ${fmt(reste)}</div>` : `<div class="badge" style="background:rgba(16,185,129,0.1);color:var(--teal);padding:1px 6px;font-size:10px;">Payé</div>`}
            </div>
            ${(state.currentUser.estAdmin || state.currentUser.role === "Caisse") ? `
              <div style="display:flex;align-items:center;gap:6px;">
                <select onchange="setCommandeStatut('${c.id}', this.value)" style="width:130px;padding:6px;border-radius:8px;">
                  ${STATUTS_COMMANDE.map((s) => `<option ${s === c.statut ? "selected" : ""}>${s}</option>`).join("")}
                </select>
                <button class="link-btn" onclick="printCommandeReceipt('${c.id}')" style="color:var(--teal)">🧾 ticket</button>
                ${modifiable 
                  ? `<button class="link-btn" onclick="openCommandeModal('${c.id}')">éditer</button>` 
                  : `<span class="badge" style="background:#f1f5f9;color:var(--mute);padding:4px 8px;font-size:10px;font-weight:700;cursor:not-allowed;" title="Modification désactivée après 2h">🔒 Verrouillée</span>`}
                ${c.statut === "En attente" 
                  ? `<button class="link-btn" style="color:var(--red)" onclick="deleteItem('commandes', '${c.id}')">suppr.</button>` 
                  : ""}
              </div>
            ` : `
              <span class="badge" style="background:${STATUT_COLOR[c.statut]}1a;color:${STATUT_COLOR[c.statut]};padding:6px 12px;font-size:12.5px;">${c.statut}</span>
            `}
          </div>
        </div>
        <div class="progress-track">
          ${STATUTS_COMMANDE.map((s, i) => `<div class="progress-seg" style="background:${idx >= i ? STATUT_COLOR[c.statut] : "var(--line)"}"></div>`).join("")}
        </div>
      </div>`;
    }).join("")}
  `;
}

window.setCommandeStatut = (id, statut) => mutate(() => apiUpdate("commandes", id, { statut }));
window.setCommandeFilter = (id) => { state.commandeFilter = id; render(); };

window.printCommandeReceipt = (id) => {
  const c = state.data.commandes.find(x => x.id === id);
  if (!c) return;
  
  const client = state.data.clients.find(cl => cl.id === c.clientId);
  const clientName = client ? client.nom : "Vente comptoir";
  const clientTel = client && client.tel ? client.tel : "";
  const reste = Math.max(0, (c.montant || 0) - (c.montantPaye || 0));
  
  const printWindow = window.open("", "_blank", "width=380,height=600");
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres contextuelles (popups) pour imprimer les reçus.");
    return;
  }
  
  const dateStr = new Date(c.dateCreation || new Date()).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const isMod = c.designation.endsWith(" (Modifiée)");
  const displayDesig = isMod ? c.designation.slice(0, -12) : c.designation;

  const html = `
    <html>
    <head>
      <title>Reçu ANATOLE SERVICE</title>
      <style>
        @page {
          margin: 0;
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 11.5px;
          line-height: 1.35;
          color: #000;
          padding: 15px;
          margin: 0;
          width: 78mm;
          box-sizing: border-box;
        }
        .text-center {
          text-align: center;
        }
        .header {
          margin-bottom: 12px;
          border-bottom: 1px dashed #000;
          padding-bottom: 8px;
        }
        .shop-name {
          font-size: 15px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .shop-sub {
          font-size: 8.5px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .title {
          font-weight: bold;
          margin: 12px 0 4px;
          text-transform: uppercase;
          border-bottom: 1px solid #000;
          padding-bottom: 1px;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .total-box {
          font-size: 12.5px;
          font-weight: bold;
          border: 1px solid #000;
          padding: 5px;
          margin-top: 8px;
        }
        .footer {
          margin-top: 20px;
          font-size: 8.5px;
          text-align: center;
          border-top: 1px dashed #000;
          padding-top: 8px;
        }
      </style>
    </head>
    <body>
      <div class="header text-center">
        <div class="shop-name">ANATOLE SERVICE</div>
        <div class="shop-sub">SERVICES & IMPRIMERIE</div>
        <div class="shop-sub">Sérigraphie · Impression · Prestations & Services</div>
      </div>
      
      <div class="info-row">
        <span>Date:</span>
        <span>${dateStr}</span>
      </div>
      <div class="info-row">
        <span>Reçu N°:</span>
        <span style="font-weight:bold;">#${c.id.toUpperCase()}</span>
      </div>
      <div class="info-row">
        <span>Client:</span>
        <span>${clientName}</span>
      </div>
      \${clientTel ? \`
      <div class="info-row">
        <span>Tél:</span>
        <span>\${clientTel}</span>
      </div>\` : ""}
      
      <div class="divider"></div>
      
      <div class="title text-center">Détails Commande</div>
      <div style="font-weight:bold; font-size:12px; margin: 6px 0;">${displayDesig}</div>
      
      <div class="divider"></div>
      
      <div class="info-row">
        <span>Montant Total:</span>
        <span>${fmt(c.montant)}</span>
      </div>
      <div class="info-row">
        <span>Montant Versé:</span>
        <span style="font-weight:bold;">${fmt(c.montantPaye)}</span>
      </div>
      
      <div class="total-box">
        <div class="info-row">
          <span>RESTE A PAYER:</span>
          <span>${fmt(reste)}</span>
        </div>
      </div>

      <div class="info-row" style="margin-top:8px;">
        <span>Statut:</span>
        <span style="font-weight:bold; text-transform:uppercase;">${c.statut}</span>
      </div>

      <div class="footer">
        Merci pour votre confiance !<br>
        ANATOLE SERVICE — Votre partenaire de confiance
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
};

window.openCommandeModal = (id) => {
  const isEdit = !!id;
  const c = isEdit ? state.data.commandes.find(x => x.id === id) : { id: uid(), clientId: "", designation: "", montant: 0, montantPaye: 0, dateLivraison: todayISO(), urgence: "Normal", statut: "En attente" };
  const clients = state.data.clients;
  const isCaisseOrAdmin = state.currentUser.estAdmin || state.currentUser.role === "Caisse";

  const isMod = c.designation.endsWith(" (Modifiée)");
  const displayDesig = isMod ? c.designation.slice(0, -12) : c.designation;

  openModal(isEdit ? "Modifier la commande" : "Nouvelle commande", `
    <div class="field"><label>Client (Optionnel)</label><select id="f-client">
      <option value="">Vente comptoir (aucun client)</option>
      ${clients.map((cl) => `<option value="${cl.id}" ${cl.id === c.clientId ? "selected" : ""}>${esc(cl.nom)}</option>`).join("")}
    </select></div>
    <div class="field"><label>Désignation</label><input id="f-desig" value="${esc(displayDesig)}" placeholder="Ex: Impression de Bâche" /></div>
    <div class="form-grid-2">
      <div class="field"><label>Montant (FCFA)</label><input id="f-montant" type="number" value="${c.montant || 0}" /></div>
      ${isCaisseOrAdmin ? `
        <div class="field"><label>Déjà payé (FCFA)</label><input id="f-paye" type="number" value="${c.montantPaye || 0}" /></div>
      ` : `
        <input id="f-paye" type="hidden" value="${c.montantPaye || 0}" />
      `}
      <div class="field"><label>Date de livraison</label><input id="f-livraison" type="date" value="${c.dateLivraison || todayISO()}" /></div>
      <div class="field"><label>Urgence</label><select id="f-urgence">
        <option ${c.urgence === "Normal" ? "selected" : ""}>Normal</option>
        <option ${c.urgence === "Urgent" ? "selected" : ""}>Urgent</option>
      </select></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
      <button class="btn btn-accent" onclick="saveCommande('${c.id}', ${isEdit})">Enregistrer</button>
    </div>
  `);
};

window.saveCommande = (id, isEdit) => {
  const clientId = document.getElementById("f-client").value;
  let designation = document.getElementById("f-desig").value.trim();
  if (!designation) { alert("Désignation requise."); return; }
  
  if (isEdit) {
    if (!designation.endsWith(" (Modifiée)")) {
      designation = designation + " (Modifiée)";
    }
  }

  const body = {
    clientId,
    designation,
    montant: Number(document.getElementById("f-montant").value) || 0,
    montantPaye: Number(document.getElementById("f-paye").value) || 0,
    dateLivraison: document.getElementById("f-livraison").value,
    urgence: document.getElementById("f-urgence").value,
  };

  mutate(async () => {
    if (isEdit) {
      await apiUpdate("commandes", id, body);
    } else {
      await apiCreate("commandes", {
        id,
        ...body,
        statut: "En attente",
        dateCreation: new Date().toISOString()
      });
    }
    closeModal();
  });
};

/* ---------------- STOCK ---------------- */
function renderStock() {
  const q = state.searchQuery.toLowerCase();
  const list = state.data.stock.filter(s => (s.nom + (s.fournisseur||"")).toLowerCase().includes(q));

  return `
    ${sectionHeader("Stock", `
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost" style="padding:10px 14px; font-size:13px; border-radius:10px;" onclick="exportStockCSV()">📥 Excel / CSV</button>
        <button class="btn btn-accent" onclick="openStockModal()">+ Nouvel article</button>
      </div>
    `)}
    ${list.length === 0 ? `<p class="empty-msg">Aucun article trouvé.</p>` : `
    <div class="table-wrap"><table>
      <thead><tr><th>Article</th><th>Quantité</th><th>Seuil</th><th>Fournisseur</th><th></th></tr></thead>
      <tbody>
        ${list.map((s) => {
          const faible = Number(s.quantite) <= Number(s.seuil);
          return `<tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:20px;">${getStockIcon(s.nom)}</span>
                <span style="font-weight:600;">${esc(s.nom)}</span>
              </div>
            </td>
            <td class="mono" style="font-weight:700;color:${faible ? "var(--red)" : "var(--ink)"}">${s.quantite} ${esc(s.unite)} ${faible ? "⚠️" : ""}</td>
            <td class="mono" style="color:var(--mute)">${s.seuil} ${esc(s.unite)}</td>
            <td style="color:var(--mute)">${esc(s.fournisseur || "Non spécifié")}</td>
            <td style="text-align:right;white-space:nowrap;">
              <button class="btn btn-ghost" style="padding:6px 12px;font-size:11.5px;color:var(--teal)" onclick="openMoveModal('${s.id}')">mouvement</button>
              &nbsp;
              <button class="link-btn" style="color:var(--red)" onclick="deleteItem('stock','${s.id}')">suppr.</button>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table></div>`}
  `;
}

window.openStockModal = () => {
  openModal("Nouvel article de stock", `
    <div class="field"><label>Nom de l'article</label><input id="f-nom" placeholder="Ex: Rouleau Bâche 440g" /></div>
    <div class="form-grid-3">
      <div class="field"><label>Quantité initiale</label><input id="f-qte" type="number" value="0" /></div>
      <div class="field"><label>Unité de mesure</label><input id="f-unite" value="unités" placeholder="Ex: rouleaux, t-shirts..." /></div>
      <div class="field"><label>Seuil d'alerte</label><input id="f-seuil" type="number" value="5" /></div>
    </div>
    <div class="field"><label>Fournisseur</label><input id="f-fournisseur" placeholder="Ex: Tech Supplies Inc." /></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
      <button class="btn btn-accent" onclick="saveStock()">Ajouter</button>
    </div>
  `);
};

window.saveStock = () => {
  const nom = document.getElementById("f-nom").value.trim();
  if (!nom) return;
  const body = {
    id: uid(), nom,
    quantite: Number(document.getElementById("f-qte").value) || 0,
    unite: document.getElementById("f-unite").value.trim() || "unités",
    seuil: Number(document.getElementById("f-seuil").value) || 0,
    fournisseur: document.getElementById("f-fournisseur").value.trim(),
  };
  mutate(async () => { await apiCreate("stock", body); closeModal(); });
};

window.exportStockCSV = () => {
  exportToCSV(
    "stock_prestige_pro.csv",
    ["Article", "Quantité", "Unité", "Seuil d'alerte", "Fournisseur"],
    state.data.stock,
    s => [s.nom || "", s.quantite || 0, s.unite || "", s.seuil || 0, s.fournisseur || "Non spécifié"]
  );
};

window.openMoveModal = (id) => {
  const item = state.data.stock.find((s) => s.id === id);
  openModal(`Mouvement de Stock — ${esc(item.nom)}`, `
    <div class="field"><label>Type de mouvement</label><select id="f-type"><option>Entrée</option><option>Sortie</option></select></div>
    <div class="field"><label>Quantité (${esc(item.unite)})</label><input id="f-qte" type="number" value="1" /></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
      <button class="btn btn-accent" onclick="saveMove('${id}')">Valider</button>
    </div>
  `);
};

window.saveMove = (id) => {
  const item = state.data.stock.find((s) => s.id === id);
  const type = document.getElementById("f-type").value;
  const qte = Number(document.getElementById("f-qte").value) || 0;
  const nextQte = type === "Entrée" ? Number(item.quantite) + qte : Math.max(0, Number(item.quantite) - qte);
  mutate(async () => {
    await apiUpdate("stock", id, { quantite: nextQte });
    await apiCreate("mouvements", { id: uid(), itemId: id, type, quantite: qte, date: todayISO() });
    closeModal();
  });
};

/* ---------------- VENTES ---------------- */
function renderVentes() {
  const q = state.searchQuery.toLowerCase();
  const list = state.data.ventes.slice().reverse().filter(v => {
    const client = state.data.clients.find((c) => c.id === v.clientId);
    const clientName = client ? client.nom : "Vente comptoir";
    return (v.description + clientName).toLowerCase().includes(q);
  });

  const isCaisseOrAdmin = state.currentUser.estAdmin || state.currentUser.role === "Caisse";
  return `
    ${sectionHeader("Ventes directes", isCaisseOrAdmin ? `<button class="btn btn-accent" onclick="openVenteModal()">+ Nouvelle vente</button>` : "")}
    ${list.length === 0 ? `<p class="empty-msg">Aucune vente enregistrée.</p>` : list.map((v) => {
      const client = state.data.clients.find((c) => c.id === v.clientId);
      return `<div class="list-row">
        <div>
          <div class="title">${esc(v.description)}</div>
          <div class="sub mono">${esc(client ? client.nom : "Vente comptoir")} · ${esc(v.date)}</div>
        </div>
        <div class="amount" style="color:var(--teal);">${fmt(v.montant)}</div>
      </div>`;
    }).join("")}
  `;
}

window.openVenteModal = () => {
  const clients = state.data.clients;
  openModal("Nouvelle vente directe", `
    <div class="field"><label>Client (Optionnel)</label><select id="f-client">
      <option value="">Vente comptoir</option>
      ${clients.map((c) => `<option value="${c.id}">${esc(c.nom)}</option>`).join("")}
    </select></div>
    <div class="field"><label>Description / Détails</label><input id="f-desc" placeholder="Ex: 5 T-shirts imprimés" /></div>
    <div class="field"><label>Montant total perçu (FCFA)</label><input id="f-montant" type="number" value="0" /></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
      <button class="btn btn-accent" onclick="saveVente()">Enregistrer la vente</button>
    </div>
  `);
};

window.saveVente = () => {
  const description = document.getElementById("f-desc").value.trim();
  if (!description) return;
  const montant = Number(document.getElementById("f-montant").value) || 0;
  const body = { id: uid(), clientId: document.getElementById("f-client").value, description, montant, date: todayISO() };
  mutate(async () => {
    await apiCreate("ventes", body);
    // Automatically record as an income in Finance!
    await apiCreate("finance", { id: uid(), type: "Recette", description: "Vente directe : " + description, montant, date: todayISO() });
    closeModal();
  });
};

/* ---------------- FINANCE ---------------- */
/* ---------------- FINANCE ---------------- */
function renderFinance() {
  const q = state.searchQuery.toLowerCase();
  
  const targetDate = state.financeDate || todayISO();
  const dayList = state.data.finance.filter(f => f.date === targetDate);
  const list = dayList.filter(f => f.description.toLowerCase().includes(q));
  
  const recettes = list.filter((f) => f.type === "Recette").reduce((a, f) => a + f.montant, 0);
  const depenses = list.filter((f) => f.type === "Dépense").reduce((a, f) => a + f.montant, 0);
  const isCaisseOrAdmin = state.currentUser.estAdmin || state.currentUser.role === "Caisse";
  
  return `
    ${sectionHeader("Finance & comptabilité", `
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost" style="padding:10px 14px; font-size:13px; border-radius:10px;" onclick="exportFinanceCSV()">📥 Excel / CSV</button>
        ${isCaisseOrAdmin ? `<button class="btn btn-accent" onclick="openFinanceModal()">+ Nouvelle écriture</button>` : ""}
      </div>
    `)}
    
    <div style="background:var(--white); border:1px solid var(--line); padding:16px 20px; border-radius:16px; display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:18px;">📅</span>
        <div>
          <div style="font-size:11.5px; color:var(--mute); font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Date de contrôle</div>
          <input type="date" id="f-control-date" value="${targetDate}" onchange="setFinanceDate(this.value)" style="border:none; outline:none; font-family:'Outfit',sans-serif; font-size:15px; font-weight:700; color:var(--ink); padding:2px 0 0 0;" />
        </div>
      </div>
      <button class="btn btn-ghost" style="padding:6px 12px; font-size:12.5px; border-radius:8px;" onclick="setFinanceDate('${todayISO()}')">Aujourd'hui</button>
    </div>

    <div class="cards-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:24px;">
      <div class="stat-card">
        <div class="label" style="color:var(--teal)">Recettes</div>
        <div class="value mono" style="color:var(--teal)">${fmt(recettes)}</div>
        <div class="wave-container">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" style="width:100%;height:100%;">
            <path d="M0 20 Q 20 12, 40 24 T 80 14 T 100 18 L 100 30 L 0 30 Z" fill="#10b98110" stroke="#10b981" stroke-width="1.5"/>
          </svg>
        </div>
      </div>
      <div class="stat-card">
        <div class="label" style="color:var(--red)">Dépenses</div>
        <div class="value mono" style="color:var(--red)">${fmt(depenses)}</div>
        <div class="wave-container">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" style="width:100%;height:100%;">
            <path d="M0 20 Q 20 12, 40 24 T 80 14 T 100 18 L 100 30 L 0 30 Z" fill="#ef444410" stroke="#ef4444" stroke-width="1.5"/>
          </svg>
        </div>
      </div>
      <div class="stat-card">
        <div class="label">Bénéfice net</div>
        <div class="value mono" style="color:${recettes - depenses >= 0 ? 'var(--teal)' : 'var(--red)'}">${fmt(recettes - depenses)}</div>
        <div class="wave-container">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" style="width:100%;height:100%;">
            <path d="M0 20 Q 20 12, 40 24 T 80 14 T 100 18 L 100 30 L 0 30 Z" fill="#4f46e510" stroke="#4f46e5" stroke-width="1.5"/>
          </svg>
        </div>
      </div>
    </div>
    ${list.length === 0 ? `<p class="empty-msg">Aucune écriture financière enregistrée pour cette date.</p>` : `
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Description</th><th>Type</th><th style="text-align:right;">Montant</th></tr></thead>
      <tbody>
        ${list.slice().reverse().map((f) => `<tr>
          <td class="mono" style="color:var(--mute)">${esc(f.date)}</td>
          <td style="font-weight:600;">${esc(f.description)}</td>
          <td><span class="badge" style="background:${f.type === "Recette" ? "#177A671A" : "#D6432B1A"};color:${f.type === "Recette" ? "var(--teal)" : "var(--red)"}">${f.type}</span></td>
          <td class="mono" style="text-align:right;font-weight:700;color:${f.type === "Recette" ? "var(--teal)" : "var(--red)"}">${f.type === "Recette" ? "+" : "-"}${fmt(f.montant)}</td>
        </tr>`).join("")}
      </tbody>
    </table></div>`}
  `;
}

window.openFinanceModal = () => {
  openModal("Nouvelle écriture financière", `
    <div class="field"><label>Type d'opération</label><select id="f-type"><option>Recette</option><option>Dépense</option></select></div>
    <div class="field"><label>Description</label><input id="f-desc" placeholder="Ex: Achat d'encre de sérigraphie" /></div>
    <div class="field"><label>Montant (FCFA)</label><input id="f-montant" type="number" value="0" /></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
      <button class="btn btn-accent" onclick="saveFinance()">Enregistrer</button>
    </div>
  `);
};

window.saveFinance = () => {
  const description = document.getElementById("f-desc").value.trim();
  if (!description) return;
  const targetDate = state.financeDate || todayISO();
  const body = { id: uid(), type: document.getElementById("f-type").value, description, montant: Number(document.getElementById("f-montant").value) || 0, date: targetDate };
  mutate(async () => { await apiCreate("finance", body); closeModal(); });
};

window.exportFinanceCSV = () => {
  const q = state.searchQuery.toLowerCase();
  const targetDate = state.financeDate || todayISO();
  const dayList = state.data.finance.filter(f => f.date === targetDate);
  const list = dayList.filter(f => f.description.toLowerCase().includes(q));

  exportToCSV(
    `finance_${targetDate}.csv`,
    ["Date", "Description", "Type d'opération", "Montant (FCFA)"],
    list,
    f => [f.date || "", f.description || "", f.type || "", f.montant || 0]
  );
};

window.setFinanceDate = (date) => {
  state.financeDate = date;
  render();
};

/* ---------------- EMPLOYÉS ---------------- */
function renderEmployes() {
  const q = state.searchQuery.toLowerCase();
  const list = state.data.employes.filter(e => (e.nom + (e.role||"")).toLowerCase().includes(q));
  const isAdmin = !!state.currentUser.estAdmin;
  return `
    ${sectionHeader("Employés", isAdmin ? `<button class="btn btn-accent" onclick="openEmployeModal()">+ Nouvel employé</button>` : "")}
    ${!isAdmin ? `<p class="empty-msg" style="margin-bottom:12px;text-align:left;">Seul un administrateur peut ajouter ou configurer les comptes employés.</p>` : ""}
    ${list.length === 0 ? `<p class="empty-msg">Aucun employé enregistré.</p>` : `
    <div class="items-grid">
      ${list.map((e) => {
        const typeAcc = e.estAdmin ? "Administrateur" : (e.role === "Caisse" ? "Caisse" : "Standard");
        const typeBg = e.estAdmin ? "#6B5FB01A" : (e.role === "Caisse" ? "#2C6FB01A" : "#847E6C1A");
        const typeColor = e.estAdmin ? "var(--purple)" : (e.role === "Caisse" ? "var(--blue)" : "var(--mute)");
        return `
        <div class="item-card">
          <div class="row-top">
            <div>
              <div class="name">${esc(e.nom)} ${e.id === state.currentUser.id ? "<span style=\"color:var(--mute);font-weight:400;font-size:11px;\">(toi)</span>" : ""}</div>
              <div class="meta" style="font-weight:600;color:${typeColor};margin-top:2px;">Compte : ${typeAcc}</div>
            </div>
            ${isAdmin ? `
              <div>
                <button class="link-btn" onclick="openEmployeModal('${e.id}')">éditer</button>
                <button class="link-btn" style="color:var(--red)" onclick="deleteItem('employes','${e.id}')">suppr.</button>
              </div>` : ""}
          </div>
          <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;">
            <span class="badge" style="background:${typeBg};color:${typeColor}">${typeAcc}</span>
            ${e.hasLogin ? `<span class="badge" style="background:#177A671A;color:var(--teal)">Connexion active</span>` : ""}
          </div>
        </div>`;
      }).join("")}
    </div>`}
  `;
}

window.openEmployeModal = (id) => {
  const e = id ? state.data.employes.find((x) => x.id === id) : null;
  const hasLoginInitial = !!(e && e.hasLogin);
  const currentType = e ? (e.estAdmin ? "Administrateur" : (e.role === "Caisse" ? "Caisse" : "Standard")) : "Standard";
  openModal(id ? "Modifier l'employé" : "Nouvel employé", `
    <div class="field"><label>Nom complet</label><input id="f-nom" value="${esc(e ? e.nom : "")}" /></div>
    <div class="field" style="display:flex;align-items:center;gap:8px;margin-top:16px;">
      <input type="checkbox" id="f-haslogin" style="width:auto;" ${hasLoginInitial ? "checked" : ""} onchange="document.getElementById('login-fields').style.display=this.checked?'block':'none'" />
      <label style="margin:0;text-transform:none;font-size:13px;color:var(--ink);">Donner un accès à l'application à cette personne</label>
    </div>
    <div id="login-fields" style="display:${hasLoginInitial ? "block" : "none"}; border-top: 1px dashed var(--line); padding-top: 12px; margin-top: 8px;">
      <div class="field"><label>Identifiant de connexion</label><input id="f-identifiant" value="${esc(e ? e.identifiant || "" : "")}" autocapitalize="off" /></div>
      <div class="field"><label>${e ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"}</label><input id="f-password" type="password" /></div>
      <div class="field"><label>Type d'accès / Rôle</label><select id="f-type-compte">
        <option value="Standard" ${currentType === "Standard" ? "selected" : ""}>Standard (gestion des commandes uniquement)</option>
        <option value="Caisse" ${currentType === "Caisse" ? "selected" : ""}>Caisse (validation paiements & écritures financières)</option>
        <option value="Administrateur" ${currentType === "Administrateur" ? "selected" : ""}>Administrateur (accès complet et gestion des comptes)</option>
      </select></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
      <button class="btn btn-accent" onclick="saveEmploye('${id || ""}')">${id ? "Enregistrer" : "Ajouter"}</button>
    </div>
  `);
};

window.saveEmploye = (id) => {
  const nom = document.getElementById("f-nom").value.trim();
  if (!nom) return;
  const body = { nom };
  const hasLogin = document.getElementById("f-haslogin").checked;
  if (hasLogin) {
    body.identifiant = document.getElementById("f-identifiant").value.trim();
    const pwd = document.getElementById("f-password").value;
    if (pwd) body.password = pwd;
    
    const typeCompte = document.getElementById("f-type-compte").value;
    if (typeCompte === "Administrateur") {
      body.estAdmin = true;
      body.role = "Administrateur";
    } else if (typeCompte === "Caisse") {
      body.estAdmin = false;
      body.role = "Caisse";
    } else {
      body.estAdmin = false;
      body.role = "Standard";
    }
    
    if (!body.identifiant) { alert("Merci de renseigner un identifiant."); return; }
    if (!id && !pwd) { alert("Merci de définir un mot de passe."); return; }
  } else {
    body.identifiant = "";
    body.password = "";
    body.estAdmin = false;
    body.role = "Standard";
  }
  mutate(async () => {
    if (id) await apiUpdate("employes", id, body);
    else await apiCreate("employes", { id: uid(), ...body });
    closeModal();
  });
};

/* ---------------- Modal helpers ---------------- */
function openModal(title, bodyHtml, extraClass) {
  const wrap = document.createElement("div");
  wrap.className = "modal-overlay";
  wrap.id = "modal-overlay";
  wrap.onclick = (e) => { if (e.target === wrap) closeModal(); };
  wrap.innerHTML = `
    <div class="modal ${extraClass || ""}">
      <div class="modal-head"><h3>${title}</h3><button onclick="closeModal()">✕</button></div>
      <div class="modal-body">${bodyHtml}</div>
    </div>
  `;
  document.body.appendChild(wrap);
}

window.closeModal = () => {
  const el = document.getElementById("modal-overlay");
  if (el) el.remove();
};

/* ---------------- Activity Report System ---------------- */
window.openReportModal = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  
  const endStr = end.toISOString().split("T")[0];
  const startStr = start.toISOString().split("T")[0];
  
  openModal("Générer un rapport d'activité", `
    <div style="font-size: 13px; color: var(--mute); margin-bottom: 16px;">
      Sélectionnez la plage de dates pour analyser l'activité de l'entreprise et générer un rapport PDF complet.
    </div>
    <div class="form-grid-2">
      <div class="field">
        <label>Date de début</label>
        <input type="date" id="rep-start" value="${startStr}" />
      </div>
      <div class="field">
        <label>Date de fin</label>
        <input type="date" id="rep-end" value="${endStr}" />
      </div>
    </div>
    <div class="modal-actions" style="margin-top:24px;">
      <button class="btn btn-ghost" onclick="closeModal()">Annuler</button>
      <button class="btn btn-accent" onclick="generateReportPDF()">Générer & Télécharger (PDF)</button>
    </div>
  `);
};

window.generateReportPDF = () => {
  const startVal = document.getElementById("rep-start").value;
  const endVal = document.getElementById("rep-end").value;
  if (!startVal || !endVal) return alert("Veuillez choisir une période.");
  
  const startDate = new Date(startVal);
  const endDate = new Date(endVal);
  endDate.setHours(23, 59, 59, 999);
  
  const d = state.data;
  
  const periodVentes = d.ventes.filter(v => {
    const vd = new Date(v.date);
    return vd >= startDate && vd <= endDate;
  });
  
  const periodFinance = d.finance.filter(f => {
    const fd = new Date(f.date);
    return fd >= startDate && fd <= endDate;
  });
  
  const periodCommandes = d.commandes.filter(c => {
    const cd = new Date(c.dateCreation);
    return cd >= startDate && cd <= endDate;
  });
  
  const totalVentesDirectes = periodVentes.reduce((a, v) => a + Number(v.montant), 0);
  const totalCommandesPayees = periodFinance.filter(f => f.type === "Recette").reduce((a, f) => a + Number(f.montant), 0);
  const totalCA = totalVentesDirectes + totalCommandesPayees;
  
  const totalRecettes = periodFinance.filter(f => f.type === "Recette").reduce((a, f) => a + Number(f.montant), 0);
  const totalDepenses = periodFinance.filter(f => f.type === "Dépense").reduce((a, f) => a + Number(f.montant), 0);
  const benefice = totalRecettes - totalDepenses;
  
  const nbCmdTotal = periodCommandes.length;
  const nbCmdPayees = periodCommandes.filter(c => c.statut === "Payée").length;
  const nbCmdAttente = periodCommandes.filter(c => c.statut === "En attente").length;
  const resteCmd = periodCommandes.reduce((a, c) => a + Math.max(0, Number(c.montant) - Number(c.montantPaye)), 0);
  
  const lowStock = d.stock.filter(s => Number(s.quantite) <= Number(s.seuil));
  
  const reportWin = window.open("", "_blank");
  
  let html = "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'>";
  html += "<title>Rapport d'activité ANATOLE SERVICE</title>";
  html += "<style>";
  html += "  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');";
  html += "  body { font-family: 'Outfit', sans-serif; color: #1e293b; margin: 0; padding: 20px; background: #f1f5f9; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }";
  html += "  .document-container { background: #fff; max-width: 800px; width: 100%; padding: 50px 60px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02); border: 1px solid rgba(226, 232, 240, 0.8); box-sizing: border-box; margin-bottom: 40px; }";
  html += "  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 30px; }";
  html += "  .period-badge { background: #fee2e2; color: #dc2626; padding: 8px 18px; border-radius: 9999px; font-weight: 600; font-size: 13px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.05); }";
  html += "  .section-title { font-size: 13px; font-weight: 800; color: #475569; margin-top: 40px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1.5px; display: flex; align-items: center; gap: 8px; }";
  html += "  .section-title::before { content: ''; display: inline-block; width: 4px; height: 16px; background: #dc2626; border-radius: 4px; }";
  html += "  .grid-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-bottom: 20px; }";
  html += "  .stat-card { border: 1px solid rgba(226,232,240,0.8); padding: 18px; border-radius: 16px; position: relative; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.01); display: flex; flex-direction: column; justify-content: space-between; }";
  html += "  .stat-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #94a3b8; }";
  html += "  .stat-card.ca { grid-column: span 2; background: linear-gradient(to bottom right, #ffffff, rgba(220, 38, 38, 0.02)); }";
  html += "  .stat-card.ca::before { background: #dc2626; }";
  html += "  .stat-card.recettes { grid-column: span 2; background: linear-gradient(to bottom right, #ffffff, rgba(16, 185, 129, 0.02)); }";
  html += "  .stat-card.recettes::before { background: #10b981; }";
  html += "  .stat-card.depenses { grid-column: span 2; background: linear-gradient(to bottom right, #ffffff, rgba(239, 68, 68, 0.02)); }";
  html += "  .stat-card.depenses::before { background: #ef4444; }";
  html += "  .stat-card.benefice { grid-column: span 3; background: linear-gradient(to bottom right, #ffffff, rgba(59, 130, 246, 0.02)); }";
  html += "  .stat-card.benefice::before { background: #3b82f6; }";
  html += "  .stat-card.creances { grid-column: span 3; background: linear-gradient(to bottom right, #ffffff, rgba(245, 158, 11, 0.02)); }";
  html += "  .stat-card.creances::before { background: #f59e0b; }";
  html += "  .stat-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }";
  html += "  .stat-card .val { font-size: 21px; font-weight: 700; margin-top: 8px; color: #0f172a; }";
  html += "  table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 10px; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }";
  html += "  th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; }";
  html += "  th { background: #f8fafc; font-weight: 600; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }";
  html += "  tr:last-child td { border-bottom: none; }";
  html += "  tr:nth-child(even) td { background: #fafbfc; }";
  html += "  td.mono-amount { font-family: 'Outfit', monospace; font-variant-numeric: tabular-nums; font-weight: 600; text-align: right; }";
  html += "  .badge { padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; }";
  html += "  .badge-green { background: rgba(16,185,129,0.1); color: #10b981; }";
  html += "  .badge-red { background: rgba(239,68,68,0.1); color: #ef4444; }";
  html += "  .badge-amber { background: rgba(245,158,11,0.1); color: #f59e0b; }";
  html += "  .no-data { color: #94a3b8; font-style: italic; padding: 20px 0; text-align: center; border: 1px dashed #e2e8f0; border-radius: 12px; background: #fafafa; }";
  html += "  .print-btn-bar { background: #f1f5f9; padding: 12px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border: 1px solid #e2e8f0; max-width: 800px; width: 100%; box-sizing: border-box; }";
  html += "  .btn-print { background: #dc2626; color: #fff; border: none; padding: 10px 20px; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: background 0.2s; }";
  html += "  .btn-print:hover { background: #b91c1c; }";
  html += "  @media print { body { background: transparent; padding: 0; } .document-container { border: none; box-shadow: none; padding: 0; margin: 0; max-width: 100%; } .print-btn-bar { display: none !important; } }";
  html += "</style></head><body>";
  
  html += "<div class='print-btn-bar'>";
  html += "  <span style='font-weight:500; color:#475569;'>Aperçu du rapport avant impression PDF</span>";
  html += "  <button class='btn-print' onclick='window.print()'>Télécharger le Rapport en PDF</button>";
  html += "</div>";
  
  html += "<div class='document-container'>";
  
  html += "<div class='header'>";
  html += "  <div style='display:flex; align-items:center; gap:16px;'>";
  html += "    <div style='background: #ffffff; padding: 4px; border-radius: 12px; display: flex; align-items: center; justify-content: center; width: 50px; height: 50px; border: 1px solid #e2e8f0;'>";
  html += "      <img src='logo.jpeg' onerror='this.src=\"logo.png\";' style='max-width:100%; max-height:100%; object-fit:contain;' />";
  html += "    </div>";
  html += "    <div>";
  html += "      <h1 style='font-size:22px; margin:0; color:#dc2626; font-weight:800; letter-spacing:-0.5px;'>ANATOLE SERVICE</h1>";
  html += "      <p style='margin:2px 0 0 0; color:#64748b; font-size:12px; font-weight:500;'>Rapport d'activité consolidé</p>";
  html += "    </div>";
  html += "  </div>";
  html += "  <div class='period-badge'>";
  html += "    Période du " + esc(startVal) + " au " + esc(endVal);
  html += "  </div>";
  html += "</div>";
  
  html += "<div class='section-title'>📊 Synthèse Financière</div>";
  html += "<div class='grid-stats'>";
  html += "  <div class='stat-card ca'><div class='label'>Chiffre d'Affaires Réalisé</div><div class='val' style='color: #dc2626;'>" + totalCA.toLocaleString("fr-FR") + " FCFA</div></div>";
  html += "  <div class='stat-card recettes'><div class='label'>Total Recettes Enregistrées</div><div class='val' style='color: #10b981;'>" + totalRecettes.toLocaleString("fr-FR") + " FCFA</div></div>";
  html += "  <div class='stat-card depenses'><div class='label'>Total Dépenses Enregistrées</div><div class='val' style='color: #ef4444;'>" + totalDepenses.toLocaleString("fr-FR") + " FCFA</div></div>";
  html += "  <div class='stat-card benefice'><div class='label'>Bénéfice Net</div><div class='val' style='color: " + (benefice >= 0 ? '#10b981' : '#ef4444') + ";'>" + benefice.toLocaleString("fr-FR") + " FCFA</div></div>";
  html += "  <div class='stat-card creances'><div class='label'>Créances nées sur la période</div><div class='val' style='color: #f59e0b;'>" + resteCmd.toLocaleString("fr-FR") + " FCFA</div></div>";
  html += "</div>";
  
  html += "<div class='section-title'>📦 Activité Commandes & Ventes</div>";
  html += "<div class='grid-stats'>";
  html += "  <div class='stat-card ca'><div class='label'>Commandes Créées</div><div class='val'>" + nbCmdTotal + "</div></div>";
  html += "  <div class='stat-card recettes'><div class='label'>Commandes Payées</div><div class='val' style='color: #10b981;'>" + nbCmdPayees + "</div></div>";
  html += "  <div class='stat-card creances'><div class='label'>En Attente</div><div class='val' style='color: #f59e0b;'>" + nbCmdAttente + "</div></div>";
  html += "</div>";
  
  html += "<div class='section-title'>📝 Détail des écritures comptables sur la période</div>";
  if (periodFinance.length === 0) {
    html += "<div class='no-data'>Aucune transaction enregistrée sur cette période.</div>";
  } else {
    html += "<table><thead><tr><th>Date</th><th>Description</th><th>Type</th><th style='text-align: right;'>Montant</th></tr></thead><tbody>";
    html += periodFinance.map(f => {
      const cls = f.type === 'Recette' ? 'badge-green' : 'badge-red';
      const col = f.type === 'Recette' ? '#10b981' : '#ef4444';
      return "<tr><td>" + esc(f.date) + "</td><td>" + esc(f.description) + "</td><td><span class='badge " + cls + "'>" + esc(f.type) + "</span></td><td class='mono-amount' style='color: " + col + ";'>" + f.montant.toLocaleString('fr-FR') + " FCFA</td></tr>";
    }).join("");
    html += "</tbody></table>";
  }
  
  html += "<div class='section-title'>⚠️ Alertes de stock actuelles</div>";
  if (lowStock.length === 0) {
    html += "<div class='no-data'>Aucune alerte de stock.</div>";
  } else {
    html += "<table><thead><tr><th>Nom de l'article</th><th>Seuil d'alerte</th><th style='text-align: right;'>Quantité Restante</th></tr></thead><tbody>";
    html += lowStock.map(s => {
      return "<tr><td>" + esc(s.nom) + "</td><td>" + s.seuil + " " + esc(s.unite || 'Pcs') + "</td><td class='mono-amount' style='color: #ef4444;'>" + s.quantite + " " + esc(s.unite || 'Pcs') + "</td></tr>";
    }).join("");
    html += "</tbody></table>";
  }
  
  html += "<div style='margin-top: 60px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 30px;'>";
  html += "  <div>";
  html += "    <div style='font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px;'>Préparé par</div>";
  html += "    <div style='font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px;'>" + esc(state.currentUser.nom) + "</div>";
  html += "    <div style='font-size: 12px; color: #94a3b8; margin-top: 2px;'>Administrateur ANATOLE SERVICE</div>";
  html += "  </div>";
  html += "  <div style='text-align: right;'>";
  html += "    <div style='font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px;'>Signature & Cachet</div>";
  html += "    <div style='border-bottom: 1px dashed #cbd5e1; width: 180px; height: 35px; margin-top: 4px; display: inline-block;'></div>";
  html += "  </div>";
  html += "</div>";
  
  html += "<div style='margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8;'>";
  html += "  Généré automatiquement par ANATOLE SERVICE · " + new Date().toLocaleString("fr-FR");
  html += "</div>";
  
  html += "</div>";
  html += "</body></html>";
  
  reportWin.document.write(html);
  reportWin.document.close();
};

/* ---------------- Boot ---------------- */
boot();

/* ---------------- Global keyboard shortcuts ---------------- */
window.addEventListener("keydown", async (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "o") {
    e.preventDefault();
    if (!state.currentUser || !state.currentUser.estAdmin) {
      alert("Accès refusé : Seul un administrateur peut réinitialiser la base de données.");
      return;
    }
    const confirm1 = confirm("⚠️ DANGER : Vous êtes sur le point de réinitialiser complètement l'application.\n\nCette action supprimera tous les clients, devis, commandes, ventes, écritures comptables et stocks.\n\nLes comptes d'employés et les accès de connexion seront CONSERVÉS.\n\nVoulez-vous continuer ?");
    if (!confirm1) return;
    const confirmText = prompt("Pour confirmer, veuillez saisir le code 'KERIL123' ci-dessous :");
    if (confirmText !== "KERIL123") {
      alert("Confirmation incorrecte. Annulation.");
      return;
    }
    try {
      await apiSend("POST", "/api/reset-db");
      alert("La base de données a été réinitialisée avec succès (les comptes d'employés ont été conservés). Rechargement...");
      window.location.reload();
    } catch (err) {
      alert("Erreur lors de la réinitialisation : " + ((err.body && err.body.error) || "erreur inconnue"));
    }
  }
});
