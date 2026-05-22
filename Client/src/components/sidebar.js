import { getUser, logout } from '../auth.js';
import { navigate, currentPath } from '../router.js';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '<i class="fa-solid fa-map"></i>', label: 'Tableau de bord' },
  { path: '/forests', icon: '<i class="fa-solid fa-tree"></i>', label: 'Forêts' },
  { path: '/prediction', icon: '<i class="fa-solid fa-wand-magic-sparkles"></i>', label: 'Prédiction' },
  { path: '/history', icon: '<i class="fa-solid fa-clock-rotate-left"></i>', label: 'Historique' },
  { path: '/add-fire', icon: '<i class="fa-solid fa-plus"></i>', label: 'Ajouter Incendie' },
  { path: '/settings', icon: '<i class="fa-solid fa-gear"></i>', label: 'Paramètres' },
];

export function renderSidebar(container) {
  const user = getUser() || {};
  const active = currentPath();
  const initials = (user.username || 'U').slice(0, 2).toUpperCase();

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <span class="icon" style="color: var(--fire-orange); margin-right: 2px;"><i class="fa-solid fa-fire"></i></span>
      <h2>FireGuard</h2>
    </div>
    <nav class="sidebar-nav">
      ${NAV_ITEMS.map(item => `
        <div class="nav-item ${active === item.path ? 'active' : ''}" data-path="${item.path}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </div>
      `).join('')}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="avatar">${initials}</div>
        <div class="user-info">
          <div class="user-name">${user.username || 'User'}</div>
          <div class="user-role">${user.role || 'user'}</div>
        </div>
      </div>
      <div class="nav-item" id="logout-btn" style="margin-top:8px;color:var(--fire-red);">
        <span class="nav-icon"><i class="fa-solid fa-right-from-bracket"></i></span>
        <span>Déconnexion</span>
      </div>
    </div>
  `;

  sidebar.querySelectorAll('.nav-item[data-path]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.path));
  });
  sidebar.querySelector('#logout-btn').addEventListener('click', logout);

  container.appendChild(sidebar);
  return sidebar;
}
