import { isLoggedIn } from './auth.js';

const routes = {};

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = '#' + path;
}

export function currentPath() {
  return window.location.hash.slice(1) || '/';
}

export function initRouter() {
  const handle = () => {
    const path = currentPath();

    // Redirect to login if not authenticated
    if (path !== '/' && !isLoggedIn()) {
      navigate('/');
      return;
    }

    // Redirect to dashboard if logged in and on login page
    if (path === '/' && isLoggedIn()) {
      navigate('/dashboard');
      return;
    }

    const handler = routes[path];
    const app = document.getElementById('app');
    if (handler) {
      app.innerHTML = '';
      handler(app);
    }
  };

  window.addEventListener('hashchange', handle);
  handle();
}
