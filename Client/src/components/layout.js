export function createLayout(container, title) {
  const { renderSidebar } = await_import();
  const layout = document.createElement('div');
  layout.className = 'app-layout';

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `
    <header class="page-header">
      <h1>${title}</h1>
      <div class="header-actions"></div>
    </header>
    <div class="page-body"></div>
  `;

  layout.appendChild(main);
  container.appendChild(layout);

  // Render sidebar into layout (prepend)
  import('./sidebar.js').then(({ renderSidebar }) => {
    layout.insertBefore(renderSidebar(layout), main);
  });

  return main.querySelector('.page-body');
}

// Simpler synchronous version
export function buildAppShell(container, title) {
  import('../components/sidebar.js').then(({ renderSidebar }) => {
    const existing = container.querySelector('.sidebar');
    if (!existing) {
      const layout = container.querySelector('.app-layout');
      if (layout) {
        renderSidebar(layout);
        const main = layout.querySelector('.main-content');
        if (main) layout.insertBefore(layout.querySelector('.sidebar'), main);
      }
    }
  });
}
