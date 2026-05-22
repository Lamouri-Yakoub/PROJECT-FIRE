import { api } from '../api.js';
import { saveAuth } from '../auth.js';
import { navigate } from '../router.js';
import { showToast } from '../main.js';

export function loginPage(container) {
  let mode = 'login';

  container.innerHTML = `
    <div class="login-page">
      <div class="login-bg"></div>
      <div class="login-card">
        <div class="login-logo">
          <span class="icon" style="color: var(--fire-orange);"><i class="fa-solid fa-fire"></i></span>
          <h1>FireGuard</h1>
          <p>Système de Prédiction des Incendies</p>
        </div>
        <div class="login-tabs">
          <button class="login-tab active" data-tab="login">Connexion</button>
          <button class="login-tab" data-tab="register">Créer un compte</button>
        </div>
        <div class="login-error" id="login-error"></div>
        <form id="auth-form">
          <div class="form-group">
            <label for="username">Nom d'utilisateur</label>
            <input type="text" id="username" placeholder="admin" required />
          </div>
          <div class="form-group" id="email-group" style="display:none;">
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="email@example.com" />
          </div>
          <div class="form-group">
            <label for="password">Mot de passe</label>
            <input type="password" id="password" placeholder="••••••••" required />
          </div>
          <button type="submit" class="btn-primary" id="auth-submit">Se connecter</button>
        </form>
      </div>
    </div>
  `;

  const tabs = container.querySelectorAll('.login-tab');
  const emailGroup = container.querySelector('#email-group');
  const submitBtn = container.querySelector('#auth-submit');
  const errorEl = container.querySelector('#login-error');
  const form = container.querySelector('#auth-form');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      mode = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      emailGroup.style.display = mode === 'register' ? 'block' : 'none';
      submitBtn.textContent = mode === 'login' ? 'Se connecter' : 'Créer le compte';
      errorEl.classList.remove('visible');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('visible');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Chargement...';

    const username = container.querySelector('#username').value.trim();
    const password = container.querySelector('#password').value;
    const email = container.querySelector('#email').value.trim();

    try {
      let res;
      if (mode === 'login') {
        res = await api.login(username, password);
      } else {
        if (!email) throw { message: 'Email requis' };
        res = await api.register(username, email, password);
      }
      saveAuth(res.token, res.user);
      navigate('/dashboard');
    } catch (err) {
      errorEl.textContent = err.message || 'Erreur de connexion';
      errorEl.classList.add('visible');
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'login' ? 'Se connecter' : 'Créer le compte';
    }
  });
}
