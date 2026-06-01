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

const RAILWAY_URL = 'https://skillpath-production-2f55.up.railway.app'; // ← replace after Step 3

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
function updateNav() {
  const user = getUser();
  const navActions = document.querySelector('.nav-actions, .nav-right');
  if (!navActions) return;

  if (user) {
    navActions.innerHTML = `
      <span style="font-size:13px;color:var(--ink2)">Hi, ${user.name.split(' ')[0]}</span>
      <button class="btn-ghost nav-btn-ghost" onclick="window.location.href='dashboard.html'">Dashboard</button>
      <button class="btn-primary nav-btn" onclick="logout()">Log out</button>
    `;
  }
}

function logout() {
  clearToken();
  window.location.href = 'index.html';
}
