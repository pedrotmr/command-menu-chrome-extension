window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
  window.setTimeout(() => {
    if (event.defaultPrevented || document.querySelector('dialog[open]')) return;
    window.close();
  }, 0);
}, true);
