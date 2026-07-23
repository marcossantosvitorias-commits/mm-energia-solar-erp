import path from 'node:path';
import react from '@vitejs/plugin-react';
import { createLogger, defineConfig } from 'vite';
import inlineEditPlugin from './plugins/visual-editor/vite-plugin-react-inline-editor.js';
import editModeDevPlugin from './plugins/visual-editor/vite-plugin-edit-mode.js';
import selectionModePlugin from './plugins/selection-mode/vite-plugin-selection-mode.js';
import iframeRouteRestorationPlugin from './plugins/vite-plugin-iframe-route-restoration.js';
import sitePagesPlugin from './plugins/vite-plugin-site-pages.js';
import pocketbaseAuthPlugin from './plugins/vite-plugin-pocketbase-auth.js';
import sessionJournalPlugin from './plugins/session-journal/vite-plugin-session-journal.js';

import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const allDeps = Object.keys(pkg.dependencies || {});

const isDev = process.env.NODE_ENV !== 'production';

const configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;

const configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;

const configHorizonsConsoleErrorHandler = `
const originalConsoleError = console.error;
const MATCH_LINE_COL_REGEX = /:(\\d+):(\\d+)\\)?\\s*$/; // regex to match the :lineNum:colNum
const MATCH_AT_REGEX = /^\\s*at\\s+(?:async\\s+)?(?:.*?\\s+)?\\(?/; // regex to remove the 'at' keyword and any 'async' or function name
const MATCH_PATH_REGEX = /^\\//; // regex to remove the leading slash

function parseStackFrameLine(line) {
	const lineColMatch = line.match(MATCH_LINE_COL_REGEX);
	if (!lineColMatch) return null;
	const [, lineNum, colNum] = lineColMatch;
	const suffix = \`:\${lineNum}:\${colNum}\`;
	const idx = line.lastIndexOf(suffix);
	if (idx === -1) return null;
	const before = line.substring(0, idx);
	const path = before.replace(MATCH_AT_REGEX, '').trim();
	
	if (!path) return null;

	try {
		const pathname = new URL(path).pathname;
		const filePath = pathname.replace(MATCH_PATH_REGEX, '') || pathname;
		return \`\${filePath}:\${lineNum}:\${colNum}\`;
	} catch (e) {
		const filePath = path.replace(MATCH_PATH_REGEX, '') || path;
		return \`\${filePath}:\${lineNum}:\${colNum}\`;
	}
}

function getFilePathFromStack(stack, skipFrames = 0) {
	if (!stack || typeof stack !== 'string') return null;
	const lines = stack.split('\\n').slice(1);

	const frames = lines.map(line => parseStackFrameLine(line.replace(/\\r$/, ''))).filter(Boolean);

	return frames[skipFrames] ?? null;
}

function formatConsoleMessage(args, skipStackFrames = 1) {
	let messageString = '';
	let filePath = null;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			filePath = getFilePathFromStack(arg.stack, 0);
			messageString = \`\${arg.name}: \${arg.message}\`;
			if (filePath) {
				messageString = \`\${messageString} at \${filePath}\`;
			}
			break;
		}
	}

	if (!messageString) {
		messageString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
		const stack = new Error().stack;
		filePath = getFilePathFromStack(stack, skipStackFrames);
		if (filePath) {
			messageString = \`\${messageString} at \${filePath}\`;
		}
	}

	return messageString;
}

console.error = function(...args) {
	originalConsoleError.apply(console, args);

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: formatConsoleMessage(args, 1)
	}, '*');
};

const originalConsoleWarn = console.warn;

console.warn = function(...args) {
	originalConsoleWarn.apply(console, args);

	window.parent.postMessage({
		type: 'horizons-console-warn',
		warning: formatConsoleMessage(args, 1)
	}, '*');
};
`;

const configWindowFetchMonkeyPatch = `
// Prevents authentication failures (PB returns 400) from crashing the app — use console.info, not console.error/PM2.
// [urlPattern, bodyPattern] tuples; align with sandboxErrorUtils ERROR_BLACKLIST.
const BENIGN_FETCH_ERRORS = [
	[/hcgi\\/platform\\/api\\/collections\\/.*auth-with-password.*/i, /Failed to authenticate/i],
	[/hcgi\\/api\\//i, /Insufficient credits/i],
];

function isBenignFetchError(url, body) {
	return BENIGN_FETCH_ERRORS.some(([urlPattern, bodyPattern]) =>
		urlPattern.test(url) && (!bodyPattern || bodyPattern.test(body)));
}

const PLATFORM_URL_PATTERN = /hcgi\\/platform\\//i;
const VALIDATION_CODE_TEXT_PATTERN = /validation_/;

function hasValidationCode(value) {
	if (value == null) {
		return false;
	}
	if (typeof value === 'string') {
		return value.startsWith('validation_');
	}
	if (Array.isArray(value)) {
		return value.some(hasValidationCode);
	}
	if (typeof value === 'object') {
		return Object.values(value).some(hasValidationCode);
	}
	return false;
}

function isValidationFetchWarning(url, body) {
	if (!PLATFORM_URL_PATTERN.test(url)) {
		return false;
	}
	try {
		return hasValidationCode(JSON.parse(body));
	} catch {
		return VALIDATION_CODE_TEXT_PATTERN.test(body);
	}
}

const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			if (!response.ok && !isDocumentResponse) {
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					const requestUrl = response.url;
					const errorMessage = \`Fetch error from \${requestUrl}: \${errorFromRes}\`;

					if (isBenignFetchError(requestUrl, errorFromRes)) {
						console.info(errorMessage);
					} else if (isValidationFetchWarning(requestUrl, errorFromRes)) {
						console.warn(errorMessage);
					} else {
						console.error(errorMessage);
					}
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/\.html?$/i)) {
				// Cancelled in-flight fetch (e.g. preview reload) — not a server failure.
				if (error?.name === 'AbortError') {
					console.info(error);
				} else {
					console.error(error);
				}
			}

			throw error;
		});
};
`;

const configNavigationHandler = `
if (window.navigation && window.self !== window.top) {
	window.navigation.addEventListener('navigate', (event) => {
		const url = event.destination.url;

		try {
			const destinationUrl = new URL(url);
			const destinationOrigin = destinationUrl.origin;
			const currentOrigin = window.location.origin;

			if (destinationOrigin === currentOrigin) {
				return;
			}
		} catch (error) {
			return;
		}

		window.parent.postMessage({
			type: 'horizons-navigation-error',
			url,
		}, '*');
	});
}
`;

const addTransformIndexHtml = {
	name: 'add-transform-index-html',
	transformIndexHtml(html) {
		const tags = [
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsRuntimeErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsViteErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configHorizonsConsoleErrorHandler,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configWindowFetchMonkeyPatch,
				injectTo: 'head',
			},
			{
				tag: 'script',
				attrs: { type: 'module' },
				children: configNavigationHandler,
				injectTo: 'head',
			},
		];

		if (!isDev && process.env.TEMPLATE_BANNER_SCRIPT_URL && process.env.TEMPLATE_REDIRECT_URL) {
			tags.push(
				{
					tag: 'script',
					attrs: {
						src: process.env.TEMPLATE_BANNER_SCRIPT_URL,
						'template-redirect-url': process.env.TEMPLATE_REDIRECT_URL,
						...(process.env.TEMPLATE_BANNER_MAIN_TEXT && { 'template-main-text': process.env.TEMPLATE_BANNER_MAIN_TEXT }),
						...(process.env.TEMPLATE_BANNER_CTA_TEXT && { 'template-cta-text': process.env.TEMPLATE_BANNER_CTA_TEXT }),
						...(process.env.TEMPLATE_BANNER_THEME && { 'template-theme': process.env.TEMPLATE_BANNER_THEME }),
					},
					injectTo: 'head',
				}
			);
		}

		return {
			html,
			tags,
		};
	},
};

console.warn = () => { };

const logger = createLogger()
const loggerError = logger.error

logger.error = (msg, options) => {
	if (options?.error?.toString().includes('CssSyntaxError: [postcss]')) {
		return;
	}

	loggerError(msg, options);
}

export default defineConfig({
	optimizeDeps: {
		include: allDeps,
	},
	customLogger: logger,
	plugins: [
		...(isDev ? [inlineEditPlugin(), editModeDevPlugin(), selectionModePlugin(), iframeRouteRestorationPlugin(), sitePagesPlugin(), pocketbaseAuthPlugin(), sessionJournalPlugin()] : []),
		react(),
		addTransformIndexHtml
	],
	server: {
		port: 3000,
		cors: true,
		headers: {
			'Cross-Origin-Embedder-Policy': 'credentialless',
		},
		allowedHosts: [
			'.app-preview.com',
			'.app-preview.io',
		],
		fs: {
			strict: true,
			allow: [
				path.resolve(__dirname),
				path.join(path.resolve(__dirname, '../..'), 'node_modules'),
			],
		},
	},
	resolve: {
		extensions: ['.jsx', '.js', '.json'],
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	build: {
		rollupOptions: {
			external: [
				'@babel/parser',
				'@babel/traverse',
				'@babel/generator',
				'@babel/types'
			],
			checks: {
				pluginTimings: false,
			}
		}
	}
});
