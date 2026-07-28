import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { APP_VERSION } from './version.js';
import { startErpReminderChecks } from './services/notificationService.js';

let recarregandoPwa = false;
const baseUrl = import.meta.env.BASE_URL || '/';

function recarregarUmaVez(chave) {
  if (recarregandoPwa || sessionStorage.getItem(chave)) return;
  recarregandoPwa = true;
  sessionStorage.setItem(chave, '1');

  const url = new URL(window.location.href);
  url.searchParams.set('v', APP_VERSION);
  window.location.replace(url.toString());
}

async function atualizarVersaoSeNecessario() {
  try {
    const resposta = await fetch(`${baseUrl}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!resposta.ok) return;

    const publicada = await resposta.json();
    if (!publicada?.version || publicada.version === APP_VERSION) return;

    recarregarUmaVez(`mm-erp-reload-${publicada.version}`);
  } catch {
    // Mantém o ERP disponível mesmo quando a verificação de versão falhar.
  }
}

atualizarVersaoSeNecessario();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    recarregarUmaVez(`mm-erp-sw-${APP_VERSION}`);
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${baseUrl}service-worker.js?v=${APP_VERSION}`, {
        updateViaCache: 'none',
        scope: baseUrl,
      })
      .then(async (registration) => {
        if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        await registration.update();
        startErpReminderChecks();
      })
      .catch(() => {
        // O ERP continua funcionando normalmente mesmo sem instalação PWA.
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
