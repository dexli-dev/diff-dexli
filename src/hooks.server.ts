// Global server hook — adds non-CSP hardening headers to every response
// (the CSP header itself is emitted by SvelteKit per svelte.config.js
// kit.csp configuration).
//
// Three always-on hardening headers:
//   - X-Content-Type-Options: nosniff  (no MIME-sniffing surprises)
//   - Referrer-Policy:       no-referrer  (don't leak URL-encoded diff content via Referer)
//   - X-Frame-Options:       DENY  (no clickjacking embed)
//
// Cache-Control: no-store is intentionally OMITTED.
//
// The diff app surface is a pure function of the URL: pane content +
// active mode encode the entire visible state, and the rendered diff is
// derived from those inputs. There are no per-user secrets, no
// per-session state, no captured-content surface. Default cache
// semantics serve the product:
//
//   - Bookmark + share-URL flows render instantly from disk cache.
//   - Back-button keeps the previously-computed diff visible without a
//     round-trip — the user's input wasn't lost.
//   - CDN edge caching (when present) absorbs popular share URLs without
//     hitting the origin.
//
// If a future surface introduces per-user state (saved comparisons tied
// to an auth cookie, history, drafts, etc.), revisit this decision on a
// per-route basis rather than reinstating a blanket no-store.

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	const headers = response.headers;

	if (!headers.has('X-Content-Type-Options')) {
		headers.set('X-Content-Type-Options', 'nosniff');
	}
	if (!headers.has('Referrer-Policy')) {
		headers.set('Referrer-Policy', 'no-referrer');
	}
	if (!headers.has('X-Frame-Options')) {
		headers.set('X-Frame-Options', 'DENY');
	}

	return response;
};
