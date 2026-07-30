(() => {
  const aplicar = () => {
    const cards = document.querySelectorAll('.proposal-payment-card');
    for (const card of cards) {
      const titulo = card.querySelector('span');
      const select = card.querySelector('select');
      if (!select || !titulo || !/belcred/i.test(titulo.textContent || '')) continue;

      select.size = Math.max(8, select.options.length);
      select.setAttribute('aria-label', 'Todas as opções de parcelamento BelCred');
      select.style.width = '100%';
      select.style.height = 'auto';
      select.style.minHeight = '360px';
      select.style.marginTop = '14px';
      select.style.padding = '8px';
      select.style.border = '0';
      select.style.borderRadius = '14px';
      select.style.background = '#f4f7fb';
      select.style.fontSize = '18px';
      select.style.fontWeight = '800';
      select.style.color = '#1f2937';
      select.style.overflow = 'hidden';

      for (const option of select.options) {
        option.style.padding = '14px 12px';
        option.style.margin = '4px 0';
        option.style.borderRadius = '10px';
      }
    }
  };

  const observer = new MutationObserver(aplicar);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', aplicar);
  window.addEventListener('load', aplicar);
  aplicar();
})();
