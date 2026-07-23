import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VIRTUAL_ID = 'virtual:session-journal-client';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_PATH = path.resolve(PLUGIN_DIR, 'session-journal-client.js');
const LOG_PATH = path.resolve(
  PLUGIN_DIR,
  '..',
  '..',
  '..',
  '..',
  'vault',
  'temp',
  'SESSION_JOURNAL.md',
);
const MAX_BYTES = 512 * 1024;

function formatTime(ts) {
  const d = new Date(ts || Date.now());
  return d.toISOString().replace('T', ' ').slice(0, 23) + 'Z';
}

function formatEntry(event) {
  const { kind, t, ...rest } = event || {};
  const head = `## ${formatTime(t)} ${kind || 'unknown'}`;
  const lines = [head];
  for (const [key, value] of Object.entries(rest)) {
    if (value == null || value === '') {
      continue;
    }
    if (typeof value === 'object') {
      try {
        lines.push(`- ${key}: ${JSON.stringify(value)}`);
      } catch {
        lines.push(`- ${key}: [unserializable]`);
      }
    } else {
      const text = String(value);
      lines.push(`- ${key}: ${text.includes('\n') ? '\n    ' + text.replace(/\n/g, '\n    ') : text}`);
    }
  }
  return lines.join('\n') + '\n\n';
}

async function appendWithRotation(text) {
  try {
    await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
    await fs.appendFile(LOG_PATH, text);
    const { size } = await fs.stat(LOG_PATH);
    if (size > MAX_BYTES) {
      const content = await fs.readFile(LOG_PATH, 'utf8');
      const keep = content.slice(-Math.floor(MAX_BYTES / 2));
      await fs.writeFile(
        LOG_PATH,
        '# SESSION_JOURNAL.md (rotated - earlier entries trimmed)\n\n' + keep,
      );
    }
  } catch {
    // The journal should never break the app dev server.
  }
}

export default function sessionJournalPlugin() {
  return {
    name: 'session-journal',
    apply: 'serve',

    resolveId(id) {
      if (id === VIRTUAL_ID) {
        return RESOLVED_ID;
      }
    },

    load(id) {
      if (id === RESOLVED_ID) {
        return fs.readFile(CLIENT_PATH, 'utf-8');
      }
    },

    transformIndexHtml(html) {
      return html.replace(
        '</head>',
        `  <script type="module" src="/@id/${VIRTUAL_ID}"></script>\n</head>`,
      );
    },

    configureServer(server) {
      server.ws.on('session-journal:event', (payload) => {
        const events = Array.isArray(payload?.batch) ? payload.batch : [payload];
        let text = '';
        for (const event of events) {
          text += formatEntry(event);
        }
        if (text) {
          void appendWithRotation(text);
        }
      });
    },
  };
}
