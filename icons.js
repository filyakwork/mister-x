// Original vector icons. Shared by browser rendering and server HTML.
// Their geometry does not depend on emoji fonts or the operating system.
(() => {
  const paths = {
    'shield-lock':
      '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 7.5 7.5 9.5 4.4-2 7.5-4.9 7.5-9.5V6L12 3Z"/><rect x="9" y="10" width="6" height="5" rx="1"/><path d="M10 10V8.5a2 2 0 0 1 4 0V10"/>',
    strategy:
      '<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h7a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h7"/>',
    briefcase:
      '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3M3 12a20 20 0 0 0 18 0M12 12v3"/>',
    chart: '<path d="M4 3v17h17M8 15l4-4 4 2 5-7M17 6h4v4"/>',
    'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
    'arrow-left': '<path d="M19 12H5m6-6-6 6 6 6"/>',
    'arrow-right': '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    'arrow-up': '<path d="M12 19V5m-6 6 6-6 6 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    document:
      '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h6"/>',
    image:
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
  };
  function icon(name) {
    if (!Object.hasOwn(paths, name)) return '';
    return `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
  }
  globalThis.MR_ICONS = Object.freeze({ icon });
})();
