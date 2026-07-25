import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { APP_VERSION } from './version.js';

async function atualizarVersaoSeNecessario() {
  try {
    const resposta = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!resposta.ok) return;

    const publicada = await resposta.json();
    if (!publicada?.version || publicada.version === APP_VERSION) return;

    const chave = `mm-erp-reload-${publicada.version}`;
    if (sessionStorage.getItem(chave)) return;
    sessionStorage.setItem(chave, '1');

    const url = new URL(window.location.href);
    url.searchParams.set('v', publicada.version);
    window.location.replace(url.toString());
  } catch {
    // Mantém o ERP disponível mesmo quando a verificação de versão falhar.
  }
}

atualizarVersaoSeNecessario();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
