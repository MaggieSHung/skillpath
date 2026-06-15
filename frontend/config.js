/**
 * config.js
 * ─────────────────────────────────────────────────────
 * Single source of truth for the backend API URL.
 *
 * DEVELOPMENT  → points to your local Node.js server
 * PRODUCTION   → points to your Railway deployment
 *
 * HOW TO USE:
 *   1. Replace RAILWAY_URL below with your real Railway URL
 *      once you've deployed (Step 3 of the deployment guide).
 *   2. Every HTML page imports this file — no other changes needed.
 * ─────────────────────────────────────────────────────
 */

const RAILWAY_URL = 'https://skillpath-production-4f85.up.railway.app'; // ← replace after Step 3

const API_BASE = (() => {
  const host = window.location.hostname;
  // Running locally → use local backend
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  // Live on Vercel → use Railway backend
  return RAILWAY_URL;
})();

/* ── Auth helpers ───────────────────────────────── */

/** Save JWT after login/register */
function saveToken(token) {
  localStorage.setItem('sp_token', token);
}

/** Get stored JWT (null if not logged in) */
function getToken() {
  return localStorage.getItem('sp_token');
}

/** Remove JWT (logout) */
function clearToken() {
  localStorage.removeItem('sp_token');
  localStorage.removeItem('sp_user');
}

/** Save basic user info for display */
function saveUser(user) {
  localStorage.setItem('sp_user', JSON.stringify(user));
}

/** Get stored user object */
function getUser() {
  try { return JSON.parse(localStorage.getItem('sp_user')); }
  catch { return null; }
}

/** Returns true if a token exists (naive check — backend validates on every request) */
function isLoggedIn() {
  return !!getToken();
}

/** Redirect to index if not logged in (call at top of protected pages) */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/index.html';
  }
}

/* ── API fetch wrapper ──────────────────────────── */

/**
 * apiFetch(path, options)
 * Wraps fetch() with:
 *  - Automatic base URL
 *  - Authorization header from stored token
 *  - JSON parsing
 *  - 401 handling (auto-logout + redirect)
 *
 * Usage:
 *   const { courses } = await apiFetch('/api/courses');
 *   const { token, user } = await apiFetch('/api/auth/login', {
 *     method: 'POST',
 *     body: { email, password }
 *   });
 */
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Auto-logout on expired/invalid token
  if (response.status === 401) {
    clearToken();
    window.location.href = '/index.html';
    return;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data;
}

/* ── Update nav based on auth state ─────────────── */

/**
 * Call on every page load to show the right nav state.
 * Swaps "Log in / Get started" for user name + "Dashboard".
 */
let _defaultNavHTML = null;

function updateNav() {
  const user = getUser();
  const navActions = document.querySelector('.nav-actions, .nav-right');
  if (!navActions) return;

  // Remember the page's original guest markup the first time this runs,
  // so we can restore it for logged-out users without hardcoding per-page HTML.
  if (_defaultNavHTML === null) {
    _defaultNavHTML = navActions.innerHTML;
  }

  if (user) {
    navActions.innerHTML = `
      <span style="font-size:13px;color:var(--ink2)">Hi, ${user.name.split(' ')[0]}</span>
      <button class="btn-ghost nav-btn-ghost" onclick="window.location.href='dashboard.html'">Dashboard</button>
      <button class="btn-primary nav-btn" onclick="logout()">Log out</button>
    `;
  } else {
    navActions.innerHTML = _defaultNavHTML;
  }
}

function logout() {
  clearToken();
  window.location.href = 'index.html';
}


/* Payment additions */
var API = 'https://skillpath-production-4f85.up.railway.app';

/* ── Payment & Auth additions ── */
document.addEventListener('DOMContentLoaded', function() {
  // Set nav buttons based on auth state (guest vs logged in)
  updateNav();

  // Fix enroll buttons
  var enrollBtns = document.querySelectorAll('.btn-enroll');
  var courseIds = [1, 2, 3, 4];
  var courseTitles = ['Excel & Google Sheets Mastery','SQL for Data Analysis','Python for Data (pandas)','Data Visualization & Dashboards'];
  var coursePrices = [790000, 1099000, 1399000, 1249000];
  enrollBtns.forEach(function(btn, i) {
    btn.id = 'enroll-btn-' + courseIds[i];
    btn.onclick = function() { skillpathBuy(courseIds[i], courseTitles[i], coursePrices[i]); };
  });

  // Sync any pending payments (in case the Midtrans webhook hasn't fired yet),
  // then load enrollments if logged in
  var tok = localStorage.getItem('sp_token');
  if (tok) {
    syncPayments().then(function(){ loadEnrollments(tok); });
  }
});

function syncPayments() {
  var tok = localStorage.getItem('sp_token');
  if (!tok) return Promise.resolve();
  return fetch(API + '/api/payments/sync', {method:'POST', headers:{Authorization:'Bearer '+tok}})
    .then(function(r){return r.json();})
    .catch(function(){return null;});
}

function loadEnrollments(tok) {
  fetch(API + '/api/enrollments', {headers:{Authorization:'Bearer '+tok}})
    .then(function(r){return r.json();})
    .then(function(d){(d.courses||[]).forEach(function(c){markEnrolled(c.id);});})
    .catch(function(){});
}

function markEnrolled(id) {
  var btn = document.getElementById('enroll-btn-'+id);
  if (btn) btn.outerHTML = '<span style="color:#16a34a;font-weight:600;font-size:13px">✓ Enrolled</span>';
}


function spToast(msg, type) {
  var existing = document.getElementById('sp-toast-wrap');
  if (!existing) {
    existing = document.createElement('div');
    existing.id = 'sp-toast-wrap';
    existing.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(existing);
  }
  var colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb' };
  var el = document.createElement('div');
  el.style.cssText = 'background:' + (colors[type]||'#333') + ';color:#fff;border-radius:8px;padding:12px 18px;font-size:13px;max-width:300px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,.2);transform:translateX(120%);transition:transform .3s;';
  el.innerHTML = '<span>' + msg + '</span>';
  existing.appendChild(el);
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.style.transform = 'translateX(0)'; }); });
  setTimeout(function(){ el.style.transform = 'translateX(120%)'; setTimeout(function(){ el.remove(); }, 400); }, 4000);
}

function skillpathBuy(id, title, price) {
  var tok = localStorage.getItem('sp_token');
  if (!tok) {
    // Remember what they wanted to buy, then show register modal
    window._pendingPurchase = {id: id, title: title, price: price};
    showAuthModal('register');
    return;
  }
  fetch(API + '/api/payments/create', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},
    body: JSON.stringify({course_id: id})
  })
  .then(function(r){return r.json();})
  .then(function(d){
    window.snap.pay(d.snap_token, {
      onSuccess: function(){ syncPayments().then(function(){ markEnrolled(id); spToast('You are now enrolled in ' + title + '!', 'success'); }); },
      onPending: function(){ syncPayments().then(function(){ spToast('Payment pending - we will enroll you once confirmed.', 'info'); }); },
      onError: function(){ spToast('Payment failed. Please try again.', 'error'); },
      onClose: function(){}
    });
  })
  .catch(function(e){ console.log('Payment catch:', e); });
}

function showAuthModal(type) {
  var existing = document.getElementById('sp-auth-modal');
  if (existing) existing.remove();
  var html = '<div id="sp-auth-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center" onclick="if(event.target.id===\'sp-auth-modal\')this.remove()">';
  html += '<div style="background:#fff;border-radius:16px;padding:36px;width:90%;max-width:400px">';
  if (type === 'login') {
    html += '<h2 style="font-size:22px;margin-bottom:4px">Welcome back</h2>';
    html += '<p style="color:#666;font-size:13px;margin-bottom:20px">Log in to continue.</p>';
    html += '<div style="margin-bottom:12px"><label style="font-size:12px;color:#444;display:block;margin-bottom:4px">Email</label><input id="sp-email" type="email" placeholder="you@example.com" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:14px;box-sizing:border-box"></div>';
    html += '<div style="margin-bottom:16px"><label style="font-size:12px;color:#444;display:block;margin-bottom:4px">Password</label><input id="sp-pw" type="password" placeholder="••••••" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:14px;box-sizing:border-box"></div>';
    html += '<div id="sp-err" style="color:#dc2626;font-size:12px;margin-bottom:8px;display:none"></div>';
    html += '<button onclick="spLogin()" style="width:100%;padding:11px;background:#0d1b2a;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">Log in</button>';
    html += '<p style="font-size:13px;color:#666;margin-top:16px">No account? <a onclick="showAuthModal(\'register\')" style="color:#2563eb;cursor:pointer">Create one</a></p>';
  } else {
    html += '<h2 style="font-size:22px;margin-bottom:4px">Create your free account</h2>';
    html += '<p style="color:#666;font-size:13px;margin-bottom:20px">Sign up to enroll and start learning.</p>';
    html += '<div style="margin-bottom:12px"><label style="font-size:12px;color:#444;display:block;margin-bottom:4px">Full name</label><input id="sp-name" type="text" placeholder="Budi Santoso" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:14px;box-sizing:border-box"></div>';
    html += '<div style="margin-bottom:12px"><label style="font-size:12px;color:#444;display:block;margin-bottom:4px">Email</label><input id="sp-email" type="email" placeholder="you@example.com" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:14px;box-sizing:border-box"></div>';
    html += '<div style="margin-bottom:16px"><label style="font-size:12px;color:#444;display:block;margin-bottom:4px">Password</label><input id="sp-pw" type="password" placeholder="Min. 6 characters" style="width:100%;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:14px;box-sizing:border-box"></div>';
    html += '<div id="sp-err" style="color:#dc2626;font-size:12px;margin-bottom:8px;display:none"></div>';
    html += '<button onclick="spRegister()" style="width:100%;padding:11px;background:#0d1b2a;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">Create account</button>';
    html += '<p style="font-size:13px;color:#666;margin-top:16px">Have an account? <a onclick="showAuthModal(\'login\')" style="color:#2563eb;cursor:pointer">Log in</a></p>';
  }
  html += '</div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

function spLogin() {
  var email = document.getElementById('sp-email').value.trim();
  var pw = document.getElementById('sp-pw').value;
  var err = document.getElementById('sp-err');
  fetch(API + '/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,password:pw})})
  .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
  .then(function(res){
    if (!res.ok) { err.textContent=res.d.error||'Login failed'; err.style.display='block'; return; }
    localStorage.setItem('sp_token', res.d.token);
    localStorage.setItem('sp_user', JSON.stringify(res.d.user));
    document.getElementById('sp-auth-modal').remove();
    // Auto-proceed to payment if they came from Enroll button
    if (window._pendingPurchase) {
      var p = window._pendingPurchase;
      window._pendingPurchase = null;
      setTimeout(function(){ skillpathBuy(p.id, p.title, p.price); }, 500);
    } else {
      window.location.href = 'dashboard.html';
    }
  }).catch(function(){ err.textContent='Network error.'; err.style.display='block'; });
}

function spRegister() {
  var name = document.getElementById('sp-name').value.trim();
  var email = document.getElementById('sp-email').value.trim();
  var pw = document.getElementById('sp-pw').value;
  var err = document.getElementById('sp-err');
  fetch(API + '/api/auth/register', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,email:email,password:pw})})
  .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
  .then(function(res){
    if (!res.ok) { err.textContent=(res.d.errors?res.d.errors[0].msg:res.d.error)||'Failed'; err.style.display='block'; return; }
    localStorage.setItem('sp_token', res.d.token);
    localStorage.setItem('sp_user', JSON.stringify(res.d.user));
    document.getElementById('sp-auth-modal').remove();
    // Auto-proceed to payment if they came from Enroll button
    if (window._pendingPurchase) {
      var p = window._pendingPurchase;
      window._pendingPurchase = null;
      setTimeout(function(){ skillpathBuy(p.id, p.title, p.price); }, 500);
    } else {
      window.location.href = 'dashboard.html';
    }
  }).catch(function(){ err.textContent='Network error.'; err.style.display='block'; });
}
