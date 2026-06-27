/**
 * sidebar.js — SkillPath shared sidebar component
 * Usage: add <div id="sidebar-root"></div> and <script src="sidebar.js"></script>
 * to any page that needs the sidebar. The active item is set automatically.
 */
(function () {
  var page = window.location.pathname.split('/').pop() || 'index.html';

  function isActive(href) {
    return page === href ? ' active' : '';
  }

  function icon(path) {
    return '<svg viewBox="0 0 16 16" fill="none">' + path + '</svg>';
  }

  var icons = {
    dashboard:   icon('<rect x="1" y="1" width="6" height="6" rx="1.5" stroke="white" stroke-width="1.4"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="white" stroke-width="1.4"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="white" stroke-width="1.4"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="white" stroke-width="1.4"/>'),
    catalog:     icon('<path d="M2 4h12M2 8h8M2 12h10" stroke="white" stroke-width="1.4" stroke-linecap="round"/>'),
    assessments: icon('<rect x="2" y="1" width="12" height="14" rx="2" stroke="white" stroke-width="1.4"/><path d="M5 5h6M5 8h6M5 11h4" stroke="white" stroke-width="1.2" stroke-linecap="round"/>'),
    profile:     icon('<circle cx="8" cy="5" r="3" stroke="white" stroke-width="1.4"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="white" stroke-width="1.4" stroke-linecap="round"/>'),
    settings:    icon('<circle cx="8" cy="8" r="2.5" stroke="white" stroke-width="1.3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4" stroke="white" stroke-width="1.3" stroke-linecap="round"/>'),
  };

  function navItem(href, iconKey, label, badge) {
    var badgeHtml = badge ? '<span class="sb-badge">' + badge + '</span>' : '';
    return '<a href="' + href + '" class="sb-item' + isActive(href) + '">' +
      '<div class="sb-icon">' + icons[iconKey] + '</div>' +
      '<span class="sb-label">' + label + '</span>' +
      badgeHtml +
      '</a>';
  }

  var html =
    '<aside class="sidebar" id="sidebar" role="navigation" aria-label="Site navigation">' +

    // Logo
    '<a href="index.html" class="sb-logo">' +
      '<div class="sb-logo-mark">' +
        '<svg viewBox="0 0 16 16" fill="none">' +
          '<path d="M2 12L5.5 7L8 9.5L10.5 5.5L14 8" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<circle cx="14" cy="8" r="1.4" fill="#C5E8D5"/>' +
        '</svg>' +
      '</div>' +
      '<span class="sb-logo-name">Skill<span>Path</span></span>' +
    '</a>' +

    // Main nav
    '<div class="sb-group">' +
      '<div class="sb-group-label">Main</div>' +
      navItem('dashboard.html', 'dashboard', 'Dashboard') +
      navItem('catalog.html',   'catalog',   'Course Catalog') +
      navItem('assessments.html', 'assessments', 'Assessments') +
    '</div>' +

    // Account nav
    '<div class="sb-group">' +
      '<div class="sb-group-label">Account</div>' +
      navItem('profile.html',  'profile',  'Profile') +
      navItem('settings.html', 'settings', 'Settings') +
    '</div>' +

    // User footer
    '<div class="sb-footer">' +
      '<div class="sb-user" id="sb-user-btn">' +
        '<div class="sb-avatar" id="sb-avatar">?</div>' +
        '<div>' +
          '<div class="sb-user-name" id="sb-name">Loading...</div>' +
          '<div class="sb-user-role">Student · Data track</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '</aside>';

  // Inject into #sidebar-root if present, otherwise prepend to body
  var root = document.getElementById('sidebar-root');
  if (root) {
    root.innerHTML = html;
  } else {
    document.body.insertAdjacentHTML('afterbegin', html);
  }

  // Populate user info from localStorage
  try {
    var user = JSON.parse(localStorage.getItem('sp_user') || 'null');
    if (user && user.name) {
      var initials = user.name.split(' ').map(function (w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
      var avatarEl = document.getElementById('sb-avatar');
      var nameEl   = document.getElementById('sb-name');
      var savedAvatar = localStorage.getItem('sp_avatar');
      if (avatarEl) {
        if (savedAvatar) {
          avatarEl.textContent = '';
          avatarEl.style.backgroundImage = 'url(' + savedAvatar + ')';
          avatarEl.style.backgroundSize = 'cover';
          avatarEl.style.backgroundPosition = 'center';
        } else {
          avatarEl.textContent = initials;
        }
      }
      if (nameEl) nameEl.textContent = user.name.split(' ')[0];
    }
  } catch (e) {}

  // Logout on user footer click
  var userBtn = document.getElementById('sb-user-btn');
  if (userBtn) {
    userBtn.style.cursor = 'pointer';
    userBtn.addEventListener('click', function () {
      if (confirm('Log out?')) {
        localStorage.removeItem('sp_token');
        localStorage.removeItem('sp_user');
        window.location.href = 'index.html';
      }
    });
  }

  // Mobile menu toggle support (hamburger button with id="menu-btn")
  document.addEventListener('DOMContentLoaded', function () {
    var menuBtn = document.getElementById('menu-btn');
    var sidebar = document.getElementById('sidebar');
    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', function () {
        sidebar.classList.toggle('open');
      });
    }
  });
})();
