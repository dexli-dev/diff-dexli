// Share-URL builder for diff.dexli.dev — bar item 6 (4096-byte total cap +
// explicit "too large to share via URL" refusal, no silent truncation).
//
// Composes the canonical share URL by combining the configured origin with
// the URLSearchParams produced by `writeUrlState()`. Returns a discriminated
// union so the caller (the share affordance UI) can branch on `ok` and
// surface either the URL or the over-cap state.

import { writeUrlState, type DiffState } from './url-state';
import { utf8ByteLength } from './diff/cap';

/** Total URL byte ceiling per bar item 6. */
export const MAX_SHARE_URL_BYTES = 4096;

/**
 * Canonical origin used in shareable links. Hardcoded to the production
 * domain so a copied URL pasted into a fresh tab points at the right host
 * regardless of where the share-action ran (local dev, preview, prod).
 * The bar's "load URL in fresh private/incognito tab" oracle hits
 * `https://diff.dexli.dev`.
 */
export const SHARE_ORIGIN = 'https://diff.dexli.dev';

export type ShareUrlResult =
	| { ok: true; url: string; bytes: number }
	| { ok: false; kind: 'over-cap'; bytes: number; cap: number };

/**
 * Build the share URL for a given diff state. Empty / default values are
 * omitted from the query string by `writeUrlState`, so a fresh-load state
 * produces just the bare origin.
 */
export function buildShareUrl(state: DiffState): ShareUrlResult {
	const params = writeUrlState(state);
	const query = params.toString();
	const url = query ? `${SHARE_ORIGIN}/?${query}` : `${SHARE_ORIGIN}/`;
	const bytes = utf8ByteLength(url);
	if (bytes > MAX_SHARE_URL_BYTES) {
		return { ok: false, kind: 'over-cap', bytes, cap: MAX_SHARE_URL_BYTES };
	}
	return { ok: true, url, bytes };
}
