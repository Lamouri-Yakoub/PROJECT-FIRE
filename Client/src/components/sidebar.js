import { getUser, logout } from '../auth.js';
import { navigate, currentPath } from '../router.js';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '🗺️', label: 'Tableau de bord' },
  { path: '/forests', icon: '🌲', label: 'Forêts' },
  { path: '/prediction', icon: '🔮', label: 'Prédiction' },
  { path: '/history', icon: '📜', label: 'Historique' },
  { path: '/add-fire', icon: '➕', label: 'Ajouter Incendie' },
  { path: '/settings', icon: '⚙️', label: 'Paramètres' },
];

export function renderSidebar(container) {
  const user = getUser() || {};
  const active = currentPath();
  const initials = (user.username || 'U').slice(0, 2).toUpperCase();

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <span class="icon">🔥</span>
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
        <span class="nav-icon">🚪</span>
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
