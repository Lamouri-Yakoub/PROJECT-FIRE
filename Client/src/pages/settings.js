import { renderSidebar } from '../components/sidebar.js';
import { api } from '../api.js';
import { getUser, saveAuth, logout } from '../auth.js';
import { showToast } from '../main.js';

export function settingsPage(container) {
  const user = getUser() || {};
  const layout = document.createElement('div');
  layout.className = 'app-layout';
  renderSidebar(layout);

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `
    <header class="page-header"><h1><i class="fa-solid fa-gears" style="color: var(--fire-orange); margin-right: 8px;"></i> Paramètres</h1></header>
    <div class="page-body">
      <div class="settings-grid">
        <div class="settings-card">
          <h3><i class="fa-solid fa-user-gear" style="color: var(--fire-orange); margin-right: 6px;"></i> Profil</h3>
          <form id="profile-form">
            <div class="form-group">
              <label>Nom d'utilisateur</label>
              <input type="text" id="set-username" value="${user.username || ''}" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="set-email" value="${user.email || ''}" />
            </div>
            <button type="submit" class="btn-primary" style="margin-top:12px;">Enregistrer</button>
          </form>
        </div>
        <div class="settings-card">
          <h3><i class="fa-solid fa-key" style="color: var(--fire-orange); margin-right: 6px;"></i> Changer le mot de passe</h3>
          <form id="password-form">
            <div class="form-group">
              <label>Mot de passe actuel</label>
              <input type="password" id="set-oldpw" required />
            </div>
            <div class="form-group">
              <label>Nouveau mot de passe</label>
              <input type="password" id="set-newpw" required />
            </div>
            <button type="submit" class="btn-primary" style="margin-top:12px;">Changer</button>
          </form>
        </div>
        <div class="settings-card">
          <h3><i class="fa-solid fa-language" style="color: var(--fire-orange); margin-right: 6px;"></i> Langue</h3>
          <p style="color:var(--text-secondary);font-size:14px;margin-bottom:16px;">Sélectionnez la langue de l'interface</p>
          <div class="lang-toggle">
            <button class="lang-btn ${(user.language || 'fr') === 'fr' ? 'active' : ''}" data-lang="fr"><span style="font-weight: 700; margin-right: 6px;">FR</span> Français</button>
            <button class="lang-btn ${user.language === 'en' ? 'active' : ''}" data-lang="en"><span style="font-weight: 700; margin-right: 6px;">EN</span> English</button>
          </div>
        </div>
        ${user.role === 'admin' ? `
        <div class="settings-card full-width">
          <h3><i class="fa-solid fa-users-gear" style="color: var(--fire-orange); margin-right: 6px;"></i> Gestion des utilisateurs</h3>
          <div id="users-table">
            <div class="page-loading"><div class="spinner"></div></div>
          </div>
        </div>` : ''}
      </div>
    </div>
  `;
  layout.appendChild(main);
  container.appendChild(layout);

  // Profile form
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.put(`/users/${user.id}`, {
        username: document.getElementById('set-username').value.trim(),
        email: document.getElementById('set-email').value.trim(),
      });
      const updated = { ...user, username: document.getElementById('set-username').value.trim(), email: document.getElementById('set-email').value.trim() };
      saveAuth(localStorage.getItem('token'), updated);
      showToast('Profil mis à jour', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });

  // Password form
  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.put(`/users/${user.id}/password`, {
        old_password: document.getElementById('set-oldpw').value,
        new_password: document.getElementById('set-newpw').value,
      });
      showToast('Mot de passe changé', 'success');
      document.getElementById('password-form').reset();
    } catch (err) { showToast(err.message, 'error'); }
  });

  // Language toggle
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      try {
        await api.put(`/users/${user.id}`, { language: btn.dataset.lang });
        const updated = { ...user, language: btn.dataset.lang };
        saveAuth(localStorage.getItem('token'), updated);
        showToast('Langue mise à jour', 'success');
      } catch (err) { showToast(err.message, 'error'); }
    });
  });

  // Admin: load users
  if (user.role === 'admin') loadUsers();
}

async function loadUsers() {
  const el = document.getElementById('users-table');
  if (!el) return;
  try {
    const data = await api.get('/users');
    if (!data.users || data.users.length === 0) {
      el.innerHTML = '<p style="color:var(--text-secondary)">Aucun utilisateur</p>';
      return;
    }
    el.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Créé le</th><th>Action</th></tr></thead>
        <tbody>
          ${data.users.map(u => `
            <tr>
              <td><strong>${u.username}</strong></td>
              <td>${u.email}</td>
              <td><span class="badge badge-${u.role === 'admin' ? 'high' : 'low'}">${u.role}</span></td>
              <td>${u.created_at || ''}</td>
              <td>${u.role !== 'admin' ? `<button class="btn-secondary delete-user-btn" data-id="${u.id}" style="padding:6px 12px;font-size:12px;color:var(--fire-red);">Supprimer</button>` : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    el.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Supprimer cet utilisateur ?')) {
          try {
            await api.del(`/users/${btn.dataset.id}`);
            showToast('Utilisateur supprimé', 'success');
            loadUsers();
          } catch (err) { showToast(err.message, 'error'); }
        }
      });
    });
  } catch (err) { el.innerHTML = `<p style="color:var(--fire-red);">${err.message}</p>`; }
}
