(() => {
  const STORAGE_KEY = 'mm-erp-maira-detalhes-editaveis-v1';
  const parseCurrency = (text) => {
    const normalized = String(text || '')
      .replace(/R\$\s?/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '');
    const value = Number(normalized);
    return Number.isFinite(value) ? value : 0;
  };
  const formatCurrency = (value) => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  });
  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  };
  const save = (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

  function setReactInputValue(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function collectRows(container) {
    return [...container.querySelectorAll('.pf-maira-item')];
  }

  function persist(container) {
    const items = collectRows(container).map((row) => ({
      descricao: row.querySelector('.maira-edit-nome')?.textContent?.trim() || '',
      parcela: row.querySelector('small')?.textContent?.trim() || '',
      valor: parseCurrency(row.querySelector('.maira-edit-valor')?.textContent || '0')
    }));
    save(items);
    const total = Number(items.reduce((sum, item) => sum + Number(item.valor || 0), 0).toFixed(2));
    const totalLabel = container.querySelector('.pf-maira-titulo span');
    if (totalLabel) totalLabel.textContent = `Total detalhado: ${formatCurrency(total)}`;
    const principal = document.querySelector('.pf-linha-maira .pf-valor');
    if (principal) setReactInputValue(principal, total.toFixed(2));
  }

  function applyEditor(container) {
    if (!container || container.dataset.mairaEditable === '1') return;
    container.dataset.mairaEditable = '1';
    const saved = load();
    const rows = collectRows(container);
    rows.forEach((row, index) => {
      const name = row.querySelector('span');
      const value = row.querySelector('strong');
      if (!name || !value) return;
      name.classList.add('maira-edit-nome');
      value.classList.add('maira-edit-valor');
      name.contentEditable = 'true';
      value.contentEditable = 'true';
      name.spellcheck = false;
      value.inputMode = 'decimal';
      name.style.cursor = 'text';
      value.style.cursor = 'text';
      name.style.outline = 'none';
      value.style.outline = 'none';
      name.style.borderBottom = '1px dashed #c8a800';
      value.style.borderBottom = '1px dashed #c8a800';
      if (saved[index]) {
        if (saved[index].descricao) name.textContent = saved[index].descricao;
        if (Number.isFinite(Number(saved[index].valor))) value.textContent = formatCurrency(saved[index].valor);
      }
      const onEdit = () => persist(container);
      name.addEventListener('input', onEdit);
      value.addEventListener('input', onEdit);
      value.addEventListener('blur', () => {
        value.textContent = formatCurrency(parseCurrency(value.textContent));
        persist(container);
      });
    });
    if (saved.length) persist(container);
  }

  const scan = () => document.querySelectorAll('.pf-maira-detalhes').forEach(applyEditor);
  const observer = new MutationObserver(scan);
  const start = () => {
    scan();
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
