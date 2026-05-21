import { registerRoute, initRouter } from './router.js';
import { loginPage } from './pages/login.js';
import { dashboardPage } from './pages/dashboard.js';
import { predictionPage } from './pages/prediction.js';
import { historyPage } from './pages/history.js';
import { addfirePage } from './pages/addfire.js';
import { settingsPage } from './pages/settings.js';
import { forestsPage } from './pages/forests.js';

// Toast utility
export function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
}

// Register all routes
registerRoute('/', loginPage);
registerRoute('/dashboard', dashboardPage);
registerRoute('/forests', forestsPage);
registerRoute('/prediction', predictionPage);
registerRoute('/history', historyPage);
registerRoute('/add-fire', addfirePage);
registerRoute('/settings', settingsPage);

// Start
initRouter();
