import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// diff has no webhook-receiver surface — the only state-changing
		// inputs are user-typed text in the two panes, mediated through our
		// own UI. SvelteKit's default origin-based CSRF check (checkOrigin:
		// true) is what we want; we don't disable it (tinywebhook had to
		// disable CSRF specifically to accept cross-origin webhook POSTs,
		// which is a divergent receiver-pattern from this app).
		//
		// Strict CSP — auto mode emits per-page nonces/hashes for SvelteKit's
		// hydration inline scripts, so `script-src 'self'` holds without
		// 'unsafe-inline' for scripts. Inline style attributes from Svelte
		// components still need 'unsafe-inline' for style only — non-
		// exploitable when no untrusted content is rendered as HTML.
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:'],
				'font-src': ['self', 'data:'],
				'connect-src': ['self'],
				'object-src': ['none'],
				'frame-ancestors': ['none'],
				'base-uri': ['none'],
				'form-action': ['self']
			}
		}
	}
};

export default config;
